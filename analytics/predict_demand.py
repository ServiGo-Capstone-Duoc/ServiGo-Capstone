from __future__ import annotations

import argparse
from datetime import datetime
from pathlib import Path

import joblib
import numpy as np
import pandas as pd


# ============================================================
# CONFIGURACIÓN
# ============================================================

BASE_DIR = (
    Path(__file__)
    .resolve()
    .parent
)

MODEL_FILE = (
    BASE_DIR
    / "models"
    / "demand_model.joblib"
)

HISTORY_FILE = (
    BASE_DIR
    / "output"
    / "training"
    / "demanda_sintetica.csv"
)

OUTPUT_FILE = (
    BASE_DIR
    / "output"
    / "training"
    / "demand_recommendations_latest.csv"
)


# ============================================================
# DIMENSIONES EXPERIMENTALES
# ============================================================

COMMUNES = [
    "Puente Alto",
    "La Florida",
    "Maipú",
    "Santiago",
    "Ñuñoa",
    "Las Condes",
    "Providencia",
    "San Bernardo"
]


VALID_CATEGORIES = [
    "Electricidad",
    "Gasfitería",
    "Cerrajería",
    "Climatización",
    "Electrodomésticos"
]


VALID_TIME_BANDS = [
    "Mañana",
    "Tarde",
    "Noche"
]


# ============================================================
# ARGUMENTOS
# ============================================================

def parse_arguments():

    parser = argparse.ArgumentParser(
        description=(
            "ServiGo - Predicción experimental "
            "de demanda territorial."
        )
    )

    parser.add_argument(
        "--category",
        required=True,
        help="Categoría de servicio."
    )

    parser.add_argument(
        "--date",
        required=True,
        help="Fecha objetivo YYYY-MM-DD."
    )

    parser.add_argument(
        "--time-band",
        required=True,
        dest="time_band",
        help="Mañana, Tarde o Noche."
    )

    return parser.parse_args()


# ============================================================
# VALIDACIONES
# ============================================================

def validate_inputs(
    category: str,
    target_date: pd.Timestamp,
    time_band: str
):

    if category not in VALID_CATEGORIES:

        raise ValueError(
            (
                f"Categoría inválida: {category}. "
                f"Opciones: {', '.join(VALID_CATEGORIES)}"
            )
        )

    if time_band not in VALID_TIME_BANDS:

        raise ValueError(
            (
                f"Franja inválida: {time_band}. "
                f"Opciones: {', '.join(VALID_TIME_BANDS)}"
            )
        )

    if pd.isna(
        target_date
    ):

        raise ValueError(
            "Fecha objetivo inválida."
        )


# ============================================================
# MODELO
# ============================================================

def load_model_artifact():

    if not MODEL_FILE.exists():

        raise FileNotFoundError(
            (
                "No existe demand_model.joblib. "
                "Ejecuta primero train_demand_model.py."
            )
        )

    artifact = joblib.load(
        MODEL_FILE
    )

    if (
        artifact.get(
            "synthetic_data"
        )
        is not True
    ):

        raise ValueError(
            (
                "El artefacto no está identificado "
                "como modelo experimental sintético."
            )
        )

    model = artifact.get(
        "model"
    )

    features = artifact.get(
        "features"
    )

    if model is None:

        raise ValueError(
            "El artefacto no contiene model."
        )

    if not features:

        raise ValueError(
            "El artefacto no contiene features."
        )

    return (
        model,
        features,
        artifact
    )


# ============================================================
# HISTÓRICO
# ============================================================

def load_history():

    if not HISTORY_FILE.exists():

        raise FileNotFoundError(
            (
                "No existe demanda_sintetica.csv. "
                "Ejecuta primero generate_training_data.py."
            )
        )

    df = pd.read_csv(
        HISTORY_FILE
    )

    if df.empty:

        raise ValueError(
            "El histórico sintético está vacío."
        )

    if (
        "is_synthetic"
        not in df.columns
        or
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
                "El histórico contiene registros "
                "no identificados como sintéticos."
            )
        )

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
                "demand"
            ]
        )
        .copy()
    )

    df[
        "demand"
    ] = pd.to_numeric(
        df[
            "demand"
        ],
        errors="coerce"
    )

    return df


# ============================================================
# FEATURES HISTÓRICAS
# ============================================================

def get_history_features(
    history: pd.DataFrame,
    commune: str,
    category: str,
    time_band: str,
    target_date: pd.Timestamp
):

    series = (
        history[
            (
                history[
                    "commune"
                ]
                ==
                commune
            )
            &
            (
                history[
                    "category"
                ]
                ==
                category
            )
            &
            (
                history[
                    "creation_time_band"
                ]
                ==
                time_band
            )
            &
            (
                history[
                    "creation_date"
                ]
                <
                target_date
            )
        ]
        .sort_values(
            "creation_date"
        )
        .copy()
    )

    if series.empty:

        return {
            "demand_lag_1":
                0.0,

            "demand_lag_7":
                0.0,

            "rolling_mean_7":
                0.0,

            "rolling_mean_28":
                0.0,

            "history_records":
                0
        }

    demand_values = (
        series[
            "demand"
        ]
        .astype(
            float
        )
    )

    lag_1 = float(
        demand_values.iloc[
            -1
        ]
    )

    if len(
        demand_values
    ) >= 7:

        lag_7 = float(
            demand_values.iloc[
                -7
            ]
        )

    else:

        lag_7 = float(
            demand_values.iloc[
                0
            ]
        )

    rolling_7 = float(
        demand_values
        .tail(
            7
        )
        .mean()
    )

    rolling_28 = float(
        demand_values
        .tail(
            28
        )
        .mean()
    )

    return {
        "demand_lag_1":
            lag_1,

        "demand_lag_7":
            lag_7,

        "rolling_mean_7":
            rolling_7,

        "rolling_mean_28":
            rolling_28,

        "history_records":
            len(
                series
            )
    }


# ============================================================
# NIVEL DE DEMANDA
# ============================================================

def assign_levels(
    df: pd.DataFrame
) -> pd.DataFrame:

    if df.empty:

        return df

    predictions = (
        df[
            "predicted_demand"
        ]
        .astype(
            float
        )
    )

    low_threshold = float(
        predictions.quantile(
            0.33
        )
    )

    high_threshold = float(
        predictions.quantile(
            0.66
        )
    )

    def classify(
        value: float
    ) -> str:

        if value <= low_threshold:

            return "Baja"

        if value >= high_threshold:

            return "Alta"

        return "Media"

    df[
        "demand_level"
    ] = (
        predictions
        .apply(
            classify
        )
    )

    return df


# ============================================================
# PREDICCIÓN
# ============================================================

def predict(
    model,
    features,
    history: pd.DataFrame,
    category: str,
    target_date: pd.Timestamp,
    time_band: str
) -> pd.DataFrame:

    rows = []

    weekday_number = int(
        target_date.dayofweek
    )

    is_weekend = int(
        weekday_number
        in (
            5,
            6
        )
    )

    for commune in COMMUNES:

        historical = (
            get_history_features(
                history,
                commune,
                category,
                time_band,
                target_date
            )
        )

        row = {

            "commune":
                commune,

            "category":
                category,

            "creation_time_band":
                time_band,

            "creation_month":
                int(
                    target_date.month
                ),

            "creation_weekday_number":
                weekday_number,

            "is_weekend":
                is_weekend,

            "demand_lag_1":
                historical[
                    "demand_lag_1"
                ],

            "demand_lag_7":
                historical[
                    "demand_lag_7"
                ],

            "rolling_mean_7":
                historical[
                    "rolling_mean_7"
                ],

            "rolling_mean_28":
                historical[
                    "rolling_mean_28"
                ]
        }

        input_df = pd.DataFrame(
            [
                row
            ]
        )

        input_df = (
            input_df[
                features
            ]
        )

        prediction = float(
            model.predict(
                input_df
            )[0]
        )

        prediction = max(
            0.0,
            prediction
        )

        rows.append({

            "prediction_date":
                target_date.date(),

            "commune":
                commune,

            "category":
                category,

            "time_band":
                time_band,

            "predicted_demand":
                round(
                    prediction,
                    2
                ),

            "predicted_demand_rounded":
                max(
                    0,
                    int(
                        np.rint(
                            prediction
                        )
                    )
                ),

            "history_records":
                historical[
                    "history_records"
                ],

            "demand_lag_1":
                historical[
                    "demand_lag_1"
                ],

            "demand_lag_7":
                historical[
                    "demand_lag_7"
                ],

            "rolling_mean_7":
                round(
                    historical[
                        "rolling_mean_7"
                    ],
                    2
                ),

            "rolling_mean_28":
                round(
                    historical[
                        "rolling_mean_28"
                    ],
                    2
                ),

            "data_source":
                "synthetic_model",

            "is_synthetic":
                1
        })

    result = pd.DataFrame(
        rows
    )

    result = assign_levels(
        result
    )

    result = (
        result
        .sort_values(
            [
                "predicted_demand",
                "commune"
            ],
            ascending=[
                False,
                True
            ]
        )
        .reset_index(
            drop=True
        )
    )

    result[
        "ranking"
    ] = (
        result.index
        +
        1
    )

    return result


# ============================================================
# RESULTADO CONSOLA
# ============================================================

def print_results(
    result: pd.DataFrame,
    category: str,
    target_date: pd.Timestamp,
    time_band: str
):

    print()

    print(
        "=" * 68
    )

    print(
        " SERVIGO - RECOMENDACIÓN EXPERIMENTAL DE DEMANDA"
    )

    print(
        "=" * 68
    )

    print(
        "Fecha:",
        target_date.date()
    )

    print(
        "Categoría:",
        category
    )

    print(
        "Franja:",
        time_band
    )

    print()

    print(
        "RANKING TERRITORIAL"
    )

    print(
        "-" * 68
    )

    for _, row in (
        result.iterrows()
    ):

        print(
            (
                f"{int(row['ranking']):>2}. "
                f"{row['commune']:<16} "
                f"Demanda: "
                f"{row['predicted_demand']:.2f} "
                f"| {row['demand_level']}"
            )
        )

    print(
        "-" * 68
    )

    print()

    print(
        "IMPORTANTE:"
    )

    print(
        "Modo demostración analítica."
    )

    print(
        "Las recomendaciones provienen de un modelo"
    )

    print(
        "experimental entrenado con datos sintéticos."
    )

    print(
        "No representan demanda real observada."
    )

    print(
        "=" * 68
    )


# ============================================================
# MAIN
# ============================================================

def main():

    args = (
        parse_arguments()
    )

    category = (
        args.category
        .strip()
    )

    time_band = (
        args.time_band
        .strip()
    )

    try:

        target_date = pd.Timestamp(
            datetime.strptime(
                args.date,
                "%Y-%m-%d"
            )
        )

    except ValueError as error:

        raise ValueError(
            (
                "La fecha debe usar formato "
                "YYYY-MM-DD."
            )
        ) from error

    validate_inputs(
        category,
        target_date,
        time_band
    )

    model, features, artifact = (
        load_model_artifact()
    )

    history = (
        load_history()
    )

    result = predict(
        model,
        features,
        history,
        category,
        target_date,
        time_band
    )

    result.to_csv(
        OUTPUT_FILE,
        index=False,
        encoding="utf-8-sig"
    )

    print_results(
        result,
        category,
        target_date,
        time_band
    )

    print()

    print(
        "Archivo generado:"
    )

    print(
        OUTPUT_FILE
    )


if __name__ == "__main__":

    main()