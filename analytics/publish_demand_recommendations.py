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

BASE_DIR = (
    Path(__file__)
    .resolve()
    .parent
)

SOURCE_FILE = (
    BASE_DIR
    / "output"
    / "training"
    / "demand_recommendations_latest.csv"
)

COLLECTION_NAME = (
    "analyticsDemand"
)


# ============================================================
# FIRESTORE
# ============================================================

def initialize_firestore():

    emulator_host = os.getenv(
        "FIRESTORE_EMULATOR_HOST"
    )

    # Por seguridad, esta primera versión solamente
    # publica en Firestore Emulator.

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

    value = clean_text(
        value
    ).lower()

    value = unicodedata.normalize(
        "NFD",
        value
    )

    value = "".join(
        char
        for char in value
        if unicodedata.category(
            char
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

    if value is None:

        return None

    if pd.isna(
        value
    ):

        return None

    return float(
        value
    )


def safe_int(
    value
):

    if value is None:

        return None

    if pd.isna(
        value
    ):

        return None

    return int(
        value
    )


# ============================================================
# CARGAR RECOMENDACIONES
# ============================================================

def load_recommendations():

    if not SOURCE_FILE.exists():

        raise FileNotFoundError(
            (
                "No existe demand_recommendations_latest.csv. "
                "Ejecuta primero predict_demand.py."
            )
        )

    df = pd.read_csv(
        SOURCE_FILE
    )

    if df.empty:

        raise ValueError(
            "El archivo de recomendaciones está vacío."
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
                "Se detectaron recomendaciones que no están "
                "marcadas como sintéticas."
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
                "Se detectó data_source distinto de "
                "synthetic_model."
            )
        )

    # Una ejecución debe corresponder a una única
    # fecha/categoría/franja.

    if (
        df[
            "prediction_date"
        ].nunique()
        != 1
    ):

        raise ValueError(
            "Existen múltiples prediction_date."
        )

    if (
        df[
            "category"
        ].nunique()
        != 1
    ):

        raise ValueError(
            "Existen múltiples categorías."
        )

    if (
        df[
            "time_band"
        ].nunique()
        != 1
    ):

        raise ValueError(
            "Existen múltiples franjas."
        )

    return df


# ============================================================
# DOCUMENTO FIRESTORE
# ============================================================

def build_document(
    df: pd.DataFrame
):

    prediction_date = clean_text(
        df[
            "prediction_date"
        ].iloc[
            0
        ]
    )

    category = clean_text(
        df[
            "category"
        ].iloc[
            0
        ]
    )

    time_band = clean_text(
        df[
            "time_band"
        ].iloc[
            0
        ]
    )

    recommendations = []

    ordered_df = (
        df
        .sort_values(
            "ranking"
        )
        .copy()
    )

    for _, row in (
        ordered_df.iterrows()
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

    document_id = (
        f"{prediction_date}_"
        f"{slugify(category)}_"
        f"{slugify(time_band)}"
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
            "demand-hgbr-v1",

        "modelType":
            "HistGradientBoostingRegressor",

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
            datetime.now(
                timezone.utc
            ),

        "updatedAt":
            datetime.now(
                timezone.utc
            )
    }

    return (
        document_id,
        document
    )


# ============================================================
# PUBLICAR
# ============================================================

def publish(
    db,
    document_id: str,
    document: dict
):

    reference = (
        db
        .collection(
            COLLECTION_NAME
        )
        .document(
            document_id
        )
    )

    reference.set(
        document
    )

    return reference


# ============================================================
# MAIN
# ============================================================

def main():

    print()

    print(
        "=" * 68
    )

    print(
        " SERVIGO - PUBLICAR RECOMENDACIONES DE DEMANDA"
    )

    print(
        "=" * 68
    )

    db = (
        initialize_firestore()
    )

    df = (
        load_recommendations()
    )

    document_id, document = (
        build_document(
            df
        )
    )

    print()

    print(
        "Documento:"
    )

    print(
        document_id
    )

    print()

    print(
        "Fecha predicción:",
        document[
            "predictionDate"
        ]
    )

    print(
        "Categoría:",
        document[
            "category"
        ]
    )

    print(
        "Franja:",
        document[
            "timeBand"
        ]
    )

    print(
        "Recomendaciones:",
        document[
            "recommendationCount"
        ]
    )

    print()

    print(
        "Publicando..."
    )

    reference = publish(
        db,
        document_id,
        document
    )

    print(
        "OK - Recomendaciones publicadas."
    )

    print()

    print(
        "Colección:"
    )

    print(
        COLLECTION_NAME
    )

    print()

    print(
        "Documento:"
    )

    print(
        reference.id
    )

    print()

    print(
        "IMPORTANTE:"
    )

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