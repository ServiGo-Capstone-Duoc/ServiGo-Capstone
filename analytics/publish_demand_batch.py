from __future__ import annotations

import os
import re
import unicodedata
from datetime import datetime, timezone
from pathlib import Path

import firebase_admin
import pandas as pd
from firebase_admin import firestore


# ============================================================
# CONFIGURACIÓN
# ============================================================

PROJECT_ID = "servigo-dev"

COLLECTION_NAME = "analyticsDemand"

MODEL_VERSION = "demand-hgbr-v1"

MODEL_TYPE = "HistGradientBoostingRegressor"


BASE_DIR = (
    Path(__file__)
    .resolve()
    .parent
)


SOURCE_FILE = (
    BASE_DIR
    / "output"
    / "training"
    / "batch"
    / "demand_recommendations_batch.csv"
)


# ============================================================
# FIRESTORE
# ============================================================

def initialize_firestore():

    emulator_host = os.getenv(
        "FIRESTORE_EMULATOR_HOST"
    )


    if not emulator_host:

        raise RuntimeError(
            (
                "FIRESTORE_EMULATOR_HOST no está definido. "
                "Publicación cancelada para evitar escribir "
                "accidentalmente en Firestore remoto."
            )
        )


    print(
        f"Firestore Emulator: {emulator_host}"
    )


    if not firebase_admin._apps:

        firebase_admin.initialize_app(
            options={
                "projectId":
                    PROJECT_ID
            }
        )


    return firestore.client()


# ============================================================
# HELPERS
# ============================================================

def clean_text(
    value
) -> str:

    if value is None:

        return ""


    if pd.isna(
        value
    ):

        return ""


    return str(
        value
    ).strip()


def slugify(
    value: str
) -> str:

    value = (
        clean_text(
            value
        )
        .lower()
    )


    value = unicodedata.normalize(
        "NFD",
        value
    )


    value = "".join(
        character
        for character in value
        if unicodedata.category(
            character
        ) != "Mn"
    )


    value = re.sub(
        r"[^a-z0-9]+",
        "_",
        value
    )


    return value.strip(
        "_"
    )


def safe_float(
    value
):

    if (
        value is None
        or
        pd.isna(
            value
        )
    ):

        return None


    return float(
        value
    )


def safe_int(
    value
):

    if (
        value is None
        or
        pd.isna(
            value
        )
    ):

        return None


    return int(
        value
    )


# ============================================================
# CARGAR BATCH
# ============================================================

def load_batch() -> pd.DataFrame:

    if not SOURCE_FILE.exists():

        raise FileNotFoundError(
            (
                "No existe demand_recommendations_batch.csv. "
                "Ejecuta primero generate_demand_batch.py."
            )
        )


    df = pd.read_csv(
        SOURCE_FILE
    )


    if df.empty:

        raise ValueError(
            "El batch de recomendaciones está vacío."
        )


    required_columns = {

        "prediction_date",

        "commune",

        "category",

        "time_band",

        "predicted_demand",

        "predicted_demand_rounded",

        "demand_level",

        "ranking",

        "data_source",

        "is_synthetic"
    }


    missing_columns = (
        required_columns
        -
        set(
            df.columns
        )
    )


    if missing_columns:

        raise ValueError(
            (
                "Faltan columnas obligatorias: "
                f"{sorted(missing_columns)}"
            )
        )


    # ========================================================
    # SEGURIDAD METODOLÓGICA
    # ========================================================

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
                "Se detectaron predicciones "
                "no marcadas como sintéticas."
            )
        )


    if (
        df[
            "data_source"
        ]
        .ne(
            "synthetic_model"
        )
        .any()
    ):

        raise ValueError(
            (
                "Se detectó data_source distinto "
                "de synthetic_model."
            )
        )


    if (
        df[
            "prediction_date"
        ].nunique()
        !=
        1
    ):

        raise ValueError(
            (
                "El batch debe corresponder "
                "a una única fecha."
            )
        )


    combinations = (
        df[
            [
                "category",
                "time_band"
            ]
        ]
        .drop_duplicates()
    )


    if (
        len(
            combinations
        )
        !=
        15
    ):

        raise ValueError(
            (
                "Se esperaban 15 combinaciones "
                f"y existen {len(combinations)}."
            )
        )


    if (
        len(
            df
        )
        !=
        120
    ):

        raise ValueError(
            (
                "Se esperaban 120 predicciones "
                f"y existen {len(df)}."
            )
        )


    return df


# ============================================================
# RECOMENDACIONES
# ============================================================

def build_recommendations(
    group: pd.DataFrame
):

    recommendations = []


    ordered = (
        group
        .sort_values(
            "ranking"
        )
    )


    for _, row in (
        ordered.iterrows()
    ):

        recommendations.append({

            "commune":
                clean_text(
                    row[
                        "commune"
                    ]
                ),

            "predictedDemand":
                safe_float(
                    row[
                        "predicted_demand"
                    ]
                ),

            "predictedDemandRounded":
                safe_int(
                    row[
                        "predicted_demand_rounded"
                    ]
                ),

            "level":
                clean_text(
                    row[
                        "demand_level"
                    ]
                ),

            "ranking":
                safe_int(
                    row[
                        "ranking"
                    ]
                ),

            "historyRecords":
                safe_int(
                    row.get(
                        "history_records"
                    )
                ),

            "lag1":
                safe_float(
                    row.get(
                        "demand_lag_1"
                    )
                ),

            "lag7":
                safe_float(
                    row.get(
                        "demand_lag_7"
                    )
                ),

            "rollingMean7":
                safe_float(
                    row.get(
                        "rolling_mean_7"
                    )
                ),

            "rollingMean28":
                safe_float(
                    row.get(
                        "rolling_mean_28"
                    )
                )
        })


    return recommendations


# ============================================================
# DOCUMENTO
# ============================================================

def build_document(
    group: pd.DataFrame
):

    prediction_date = clean_text(
        group[
            "prediction_date"
        ].iloc[
            0
        ]
    )


    category = clean_text(
        group[
            "category"
        ].iloc[
            0
        ]
    )


    time_band = clean_text(
        group[
            "time_band"
        ].iloc[
            0
        ]
    )


    recommendations = (
        build_recommendations(
            group
        )
    )


    if (
        len(
            recommendations
        )
        !=
        8
    ):

        raise ValueError(
            (
                "Cada combinación debe contener "
                "8 recomendaciones territoriales. "
                f"{category} / {time_band} contiene "
                f"{len(recommendations)}."
            )
        )


    document_id = (
        f"{prediction_date}_"
        f"{slugify(category)}_"
        f"{slugify(time_band)}"
    )


    now = datetime.now(
        timezone.utc
    )


    document = {

        "id":
            document_id,

        "predictionDate":
            prediction_date,

        "category":
            category,

        "timeBand":
            time_band,

        "modelVersion":
            MODEL_VERSION,

        "modelType":
            MODEL_TYPE,

        "dataSource":
            "synthetic_model",

        "experimental":
            True,

        "isSynthetic":
            True,

        "recommendationCount":
            len(
                recommendations
            ),

        "recommendations":
            recommendations,

        "generatedAt":
            now,

        "updatedAt":
            now
    }


    return (
        document_id,
        document
    )


# ============================================================
# MAIN
# ============================================================

def main():

    print()

    print(
        "=" * 68
    )

    print(
        " SERVIGO - PUBLICAR BATCH DE DEMANDA"
    )

    print(
        "=" * 68
    )


    db = (
        initialize_firestore()
    )


    df = (
        load_batch()
    )


    prediction_date = clean_text(
        df[
            "prediction_date"
        ].iloc[
            0
        ]
    )


    groups = list(
        df.groupby(
            [
                "category",
                "time_band"
            ],
            sort=False
        )
    )


    print()

    print(
        "Fecha:",
        prediction_date
    )


    print(
        "Documentos a publicar:",
        len(
            groups
        )
    )


    print()


    published = (
        0
    )


    published_ids = []


    # ========================================================
    # BATCH FIRESTORE
    # ========================================================

    batch = (
        db.batch()
    )


    for (
        category,
        time_band
    ), group in groups:

        document_id, document = (
            build_document(
                group
            )
        )


        reference = (
            db
            .collection(
                COLLECTION_NAME
            )
            .document(
                document_id
            )
        )


        batch.set(
            reference,
            document
        )


        published += (
            1
        )


        published_ids.append(
            document_id
        )


        print(
            (
                f"[{published:02d}/15] "
                f"{category} / "
                f"{time_band}"
            )
        )


    if (
        published
        !=
        15
    ):

        raise ValueError(
            (
                "La publicación esperaba "
                f"15 documentos y preparó {published}."
            )
        )


    print()

    print(
        "Confirmando batch Firestore..."
    )


    batch.commit()


    # ========================================================
    # RESULTADO
    # ========================================================

    print()

    print(
        "=" * 68
    )

    print(
        " RESULTADO"
    )

    print(
        "=" * 68
    )


    print(
        "Documentos publicados:",
        published
    )


    print(
        "Colección:",
        COLLECTION_NAME
    )


    print(
        "Fecha:",
        prediction_date
    )


    print()

    print(
        "Documentos:"
    )


    for document_id in (
        published_ids
    ):

        print(
            f"  OK - {document_id}"
        )


    print()

    print(
        "experimental = true"
    )

    print(
        "dataSource = synthetic_model"
    )

    print(
        "isSynthetic = true"
    )


    print()

    print(
        "IMPORTANTE:"
    )

    print(
        "Estas recomendaciones corresponden"
    )

    print(
        "al modo demostración analítica."
    )


    print(
        "=" * 68
    )


if __name__ == "__main__":

    main()