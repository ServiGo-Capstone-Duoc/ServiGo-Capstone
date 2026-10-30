from __future__ import annotations

from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from sklearn.compose import ColumnTransformer
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.metrics import (
    mean_absolute_error,
    mean_squared_error,
    r2_score
)
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OrdinalEncoder


# ============================================================
# CONFIGURACIÓN
# ============================================================

BASE_DIR = (
    Path(__file__)
    .resolve()
    .parent
)

TRAINING_DIR = (
    BASE_DIR
    / "output"
    / "training"
)

MODELS_DIR = (
    BASE_DIR
    / "models"
)

MODELS_DIR.mkdir(
    parents=True,
    exist_ok=True
)


SOURCE_FILE = (
    TRAINING_DIR
    / "demanda_sintetica.csv"
)

MODEL_FILE = (
    MODELS_DIR
    / "demand_model.joblib"
)

METRICS_FILE = (
    TRAINING_DIR
    / "model_metrics.csv"
)

PREDICTIONS_FILE = (
    TRAINING_DIR
    / "predictions_test.csv"
)

FEATURE_IMPORTANCE_FILE = (
    TRAINING_DIR
    / "feature_summary.csv"
)


# ============================================================
# CORTE TEMPORAL
# ============================================================
#
# Entrenamiento:
# 2025-01-01 → 2026-06-30
#
# Test:
# 2026-07-01 → 2026-09-30
#
# El modelo nunca ve durante entrenamiento los meses
# utilizados para evaluación final.
# ============================================================

TEST_START_DATE = pd.Timestamp(
    "2026-07-01"
)


# ============================================================
# FEATURES
# ============================================================

CATEGORICAL_FEATURES = [

    "commune",

    "category",

    "creation_time_band"
]


NUMERIC_FEATURES = [

    "creation_month",

    "creation_weekday_number",

    "is_weekend",

    "demand_lag_1",

    "demand_lag_7",

    "rolling_mean_7",

    "rolling_mean_28"
]


FEATURES = (
    CATEGORICAL_FEATURES
    +
    NUMERIC_FEATURES
)


TARGET = (
    "demand"
)


# ============================================================
# CARGAR DATOS
# ============================================================

def load_dataset() -> pd.DataFrame:

    if not SOURCE_FILE.exists():

        raise FileNotFoundError(
            (
                "No existe demanda_sintetica.csv. "
                "Ejecuta primero generate_training_data.py."
            )
        )


    df = pd.read_csv(
        SOURCE_FILE
    )


    if df.empty:

        raise ValueError(
            "El dataset de entrenamiento está vacío."
        )


    # ========================================================
    # SEGURIDAD METODOLÓGICA
    # ========================================================

    if (
        "is_synthetic"
        not in df.columns
    ):

        raise ValueError(
            "El dataset no contiene is_synthetic."
        )


    if (
        df[
            "is_synthetic"
        ]
        .ne(
            1
        )
        .any()
    ):

        raise ValueError(
            (
                "Se detectaron registros no sintéticos. "
                "Este experimento solo debe usar datos "
                "de entrenamiento sintéticos."
            )
        )


    if (
        "data_source"
        not in df.columns
    ):

        raise ValueError(
            "El dataset no contiene data_source."
        )


    if (
        df[
            "data_source"
        ]
        .ne(
            "synthetic"
        )
        .any()
    ):

        raise ValueError(
            (
                "Se detectó data_source distinto "
                "de synthetic."
            )
        )


    # ========================================================
    # FECHA
    # ========================================================

    df[
        "creation_date"
    ] = pd.to_datetime(
        df[
            "creation_date"
        ],
        errors="coerce"
    )


    df = (
        df
        .dropna(
            subset=[
                "creation_date",
                TARGET
            ]
        )
        .copy()
    )


    # ========================================================
    # NUMÉRICOS
    # ========================================================

    for column in (
        NUMERIC_FEATURES
        +
        [
            TARGET
        ]
    ):

        df[
            column
        ] = pd.to_numeric(
            df[
                column
            ],
            errors="coerce"
        )


    # ========================================================
    # ELIMINAR WARM-UP
    # ========================================================
    #
    # Los primeros días de cada serie no tienen lag 7.
    #
    # Los quitamos para entrenar con el mismo conjunto
    # de variables disponible en todas las observaciones.
    # ========================================================

    df = (
        df
        .dropna(
            subset=FEATURES
        )
        .copy()
    )


    # ========================================================
    # PROTECCIÓN CONTRA DATA LEAKAGE
    # ========================================================

    forbidden_features = {

        "synthetic_expected_demand",

        "demand",

        "data_source",

        "is_synthetic"
    }


    leaked_features = (
        set(
            FEATURES
        )
        &
        forbidden_features
    )


    if leaked_features:

        raise ValueError(
            (
                "Se detectaron variables prohibidas "
                f"en FEATURES: {leaked_features}"
            )
        )


    return (
        df
        .sort_values(
            "creation_date"
        )
        .reset_index(
            drop=True
        )
    )


# ============================================================
# TRAIN / TEST TEMPORAL
# ============================================================

def temporal_split(
    df: pd.DataFrame
):

    train_df = (
        df[
            df[
                "creation_date"
            ]
            <
            TEST_START_DATE
        ]
        .copy()
    )


    test_df = (
        df[
            df[
                "creation_date"
            ]
            >=
            TEST_START_DATE
        ]
        .copy()
    )


    if train_df.empty:

        raise ValueError(
            "El conjunto de entrenamiento quedó vacío."
        )


    if test_df.empty:

        raise ValueError(
            "El conjunto de test quedó vacío."
        )


    return (
        train_df,
        test_df
    )


# ============================================================
# PIPELINE
# ============================================================

def build_model() -> Pipeline:

    categorical_transformer = (
        OrdinalEncoder(
            handle_unknown=
                "use_encoded_value",

            unknown_value=
                -1
        )
    )


    preprocessor = (
        ColumnTransformer(
            transformers=[

                (
                    "categorical",
                    categorical_transformer,
                    CATEGORICAL_FEATURES
                ),

                (
                    "numeric",
                    "passthrough",
                    NUMERIC_FEATURES
                )
            ],

            remainder=
                "drop"
        )
    )


    regressor = (
        HistGradientBoostingRegressor(

            loss=
                "squared_error",

            learning_rate=
                0.08,

            max_iter=
                250,

            max_leaf_nodes=
                31,

            min_samples_leaf=
                20,

            l2_regularization=
                0.10,

            random_state=
                20261027
        )
    )


    return Pipeline(
        steps=[

            (
                "preprocessor",
                preprocessor
            ),

            (
                "regressor",
                regressor
            )
        ]
    )


# ============================================================
# BASELINE
# ============================================================
#
# Baseline:
#
# promedio móvil de 7 días anteriores.
#
# Es una referencia razonable:
# "mañana se parecerá al comportamiento reciente".
# ============================================================

def baseline_predictions(
    test_df: pd.DataFrame
) -> np.ndarray:

    predictions = (
        pd.to_numeric(
            test_df[
                "rolling_mean_7"
            ],
            errors="coerce"
        )
        .to_numpy(
            dtype=float
        )
    )


    return np.clip(
        predictions,
        0,
        None
    )


# ============================================================
# MÉTRICAS
# ============================================================

def calculate_metrics(
    y_true,
    y_pred
):

    mae = mean_absolute_error(
        y_true,
        y_pred
    )


    rmse = np.sqrt(
        mean_squared_error(
            y_true,
            y_pred
        )
    )


    r2 = r2_score(
        y_true,
        y_pred
    )


    return {

        "mae":
            round(
                float(
                    mae
                ),
                4
            ),

        "rmse":
            round(
                float(
                    rmse
                ),
                4
            ),

        "r2":
            round(
                float(
                    r2
                ),
                4
            )
    }


# ============================================================
# RESUMEN FEATURES
# ============================================================

def save_feature_summary():

    rows = []


    for feature in (
        CATEGORICAL_FEATURES
    ):

        rows.append({

            "feature":
                feature,

            "type":
                "categorical",

            "used_by_model":
                1
        })


    for feature in (
        NUMERIC_FEATURES
    ):

        rows.append({

            "feature":
                feature,

            "type":
                "numeric",

            "used_by_model":
                1
        })


    rows.append({

        "feature":
            "synthetic_expected_demand",

        "type":
            "forbidden",

        "used_by_model":
            0
    })


    pd.DataFrame(
        rows
    ).to_csv(
        FEATURE_IMPORTANCE_FILE,
        index=False,
        encoding="utf-8-sig"
    )


# ============================================================
# MAIN
# ============================================================

def main():

    print()

    print(
        "=" * 60
    )

    print(
        " SERVIGO - ENTRENAMIENTO MODELO DE DEMANDA"
    )

    print(
        "=" * 60
    )


    # ========================================================
    # DATASET
    # ========================================================

    df = load_dataset()


    train_df, test_df = (
        temporal_split(
            df
        )
    )


    print(
        "Observaciones utilizables:",
        len(
            df
        )
    )


    print(
        "Entrenamiento:",
        len(
            train_df
        )
    )


    print(
        "Test:",
        len(
            test_df
        )
    )


    print()

    print(
        "Periodo entrenamiento:"
    )

    print(
        train_df[
            "creation_date"
        ].min()
    )

    print(
        "→"
    )

    print(
        train_df[
            "creation_date"
        ].max()
    )


    print()

    print(
        "Periodo test:"
    )

    print(
        test_df[
            "creation_date"
        ].min()
    )

    print(
        "→"
    )

    print(
        test_df[
            "creation_date"
        ].max()
    )


    # ========================================================
    # X / Y
    # ========================================================

    x_train = (
        train_df[
            FEATURES
        ]
    )


    y_train = (
        train_df[
            TARGET
        ]
    )


    x_test = (
        test_df[
            FEATURES
        ]
    )


    y_test = (
        test_df[
            TARGET
        ]
    )


    # ========================================================
    # BASELINE
    # ========================================================

    baseline_pred = (
        baseline_predictions(
            test_df
        )
    )


    baseline_metrics = (
        calculate_metrics(
            y_test,
            baseline_pred
        )
    )


    # ========================================================
    # MODELO
    # ========================================================

    model = (
        build_model()
    )


    print()

    print(
        "Entrenando modelo..."
    )


    model.fit(
        x_train,
        y_train
    )


    model_pred = (
        model.predict(
            x_test
        )
    )


    # La demanda no puede ser negativa.

    model_pred = np.clip(
        model_pred,
        0,
        None
    )


    model_metrics = (
        calculate_metrics(
            y_test,
            model_pred
        )
    )


    # ========================================================
    # COMPARACIÓN
    # ========================================================

    mae_improvement = (

        (
            baseline_metrics[
                "mae"
            ]
            -
            model_metrics[
                "mae"
            ]
        )

        /
        baseline_metrics[
            "mae"
        ]

        *
        100

        if baseline_metrics[
            "mae"
        ] > 0

        else 0
    )


    rmse_improvement = (

        (
            baseline_metrics[
                "rmse"
            ]
            -
            model_metrics[
                "rmse"
            ]
        )

        /
        baseline_metrics[
            "rmse"
        ]

        *
        100

        if baseline_metrics[
            "rmse"
        ] > 0

        else 0
    )


    model_beats_baseline = int(

        model_metrics[
            "mae"
        ]

        <

        baseline_metrics[
            "mae"
        ]
    )


    # ========================================================
    # MÉTRICAS
    # ========================================================

    metrics_df = pd.DataFrame([

        {
            "model":
                "baseline_rolling_mean_7",

            "mae":
                baseline_metrics[
                    "mae"
                ],

            "rmse":
                baseline_metrics[
                    "rmse"
                ],

            "r2":
                baseline_metrics[
                    "r2"
                ],

            "test_records":
                len(
                    test_df
                ),

            "synthetic_data":
                1
        },

        {
            "model":
                "hist_gradient_boosting",

            "mae":
                model_metrics[
                    "mae"
                ],

            "rmse":
                model_metrics[
                    "rmse"
                ],

            "r2":
                model_metrics[
                    "r2"
                ],

            "test_records":
                len(
                    test_df
                ),

            "synthetic_data":
                1
        }
    ])


    metrics_df[
        "mae_improvement_vs_baseline_pct"
    ] = [
        0,
        round(
            mae_improvement,
            2
        )
    ]


    metrics_df[
        "rmse_improvement_vs_baseline_pct"
    ] = [
        0,
        round(
            rmse_improvement,
            2
        )
    ]


    metrics_df[
        "beats_baseline"
    ] = [
        0,
        model_beats_baseline
    ]


    metrics_df.to_csv(
        METRICS_FILE,
        index=False,
        encoding="utf-8-sig"
    )


    # ========================================================
    # PREDICCIONES
    # ========================================================

    predictions_df = (
        test_df[
            [
                "creation_date",
                "commune",
                "category",
                "creation_time_band",
                "demand"
            ]
        ]
        .copy()
    )


    predictions_df[
        "baseline_prediction"
    ] = (
        baseline_pred
    )


    predictions_df[
        "model_prediction"
    ] = (
        model_pred
    )


    predictions_df[
        "model_prediction_rounded"
    ] = (
        np.rint(
            model_pred
        )
        .clip(
            0
        )
        .astype(
            int
        )
    )


    predictions_df[
        "absolute_error_model"
    ] = (
        np.abs(
            predictions_df[
                "demand"
            ]
            -
            predictions_df[
                "model_prediction"
            ]
        )
    )


    predictions_df[
        "data_source"
    ] = (
        "synthetic"
    )


    predictions_df[
        "is_synthetic"
    ] = (
        1
    )


    predictions_df.to_csv(
        PREDICTIONS_FILE,
        index=False,
        encoding="utf-8-sig"
    )


    # ========================================================
    # GUARDAR MODELO
    # ========================================================

    artifact = {

        "model":
            model,

        "features":
            FEATURES,

        "categorical_features":
            CATEGORICAL_FEATURES,

        "numeric_features":
            NUMERIC_FEATURES,

        "target":
            TARGET,

        "test_start_date":
            str(
                TEST_START_DATE.date()
            ),

        "training_data_source":
            "synthetic",

        "synthetic_data":
            True
    }


    joblib.dump(
        artifact,
        MODEL_FILE
    )


    save_feature_summary()


    # ========================================================
    # RESULTADO
    # ========================================================

    print()

    print(
        "BASELINE"
    )

    print(
        "MAE:",
        baseline_metrics[
            "mae"
        ]
    )

    print(
        "RMSE:",
        baseline_metrics[
            "rmse"
        ]
    )

    print(
        "R2:",
        baseline_metrics[
            "r2"
        ]
    )


    print()

    print(
        "MODELO"
    )

    print(
        "MAE:",
        model_metrics[
            "mae"
        ]
    )

    print(
        "RMSE:",
        model_metrics[
            "rmse"
        ]
    )

    print(
        "R2:",
        model_metrics[
            "r2"
        ]
    )


    print()

    print(
        "Mejora MAE vs baseline:",
        f"{mae_improvement:.2f}%"
    )

    print(
        "Mejora RMSE vs baseline:",
        f"{rmse_improvement:.2f}%"
    )


    print()

    if model_beats_baseline:

        print(
            "RESULTADO: MODELO SUPERA BASELINE"
        )

    else:

        print(
            "RESULTADO: MODELO NO SUPERA BASELINE"
        )


    print()

    print(
        "IMPORTANTE:"
    )

    print(
        "El modelo fue entrenado y evaluado"
    )

    print(
        "exclusivamente con datos sintéticos."
    )

    print(
        "Estas métricas NO representan precisión"
    )

    print(
        "sobre demanda real de ServiGo."
    )


    print()

    print(
        "Modelo:"
    )

    print(
        MODEL_FILE
    )


    print()

    print(
        "Métricas:"
    )

    print(
        METRICS_FILE
    )


    print()

    print(
        "Predicciones test:"
    )

    print(
        PREDICTIONS_FILE
    )


    print()

    print(
        "=" * 60
    )


if __name__ == "__main__":

    main()