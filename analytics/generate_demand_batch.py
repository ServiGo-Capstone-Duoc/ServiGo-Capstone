from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

import pandas as pd


# ============================================================
# CONFIGURACIÓN
# ============================================================

BASE_DIR = (
    Path(__file__)
    .resolve()
    .parent
)

PREDICT_SCRIPT = (
    BASE_DIR
    / "predict_demand.py"
)

LATEST_FILE = (
    BASE_DIR
    / "output"
    / "training"
    / "demand_recommendations_latest.csv"
)

BATCH_DIR = (
    BASE_DIR
    / "output"
    / "training"
    / "batch"
)

BATCH_DIR.mkdir(
    parents=True,
    exist_ok=True
)

BATCH_FILE = (
    BATCH_DIR
    / "demand_recommendations_batch.csv"
)


CATEGORIES = [

    "Electricidad",

    "Gasfitería",

    "Cerrajería",

    "Climatización",

    "Electrodomésticos"
]


TIME_BANDS = [

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
            "ServiGo - Generación batch "
            "de recomendaciones de demanda."
        )
    )

    parser.add_argument(
        "--date",
        required=True,
        help="Fecha objetivo YYYY-MM-DD."
    )

    return parser.parse_args()


# ============================================================
# VALIDAR FECHA
# ============================================================

def validate_date(
    value: str
) -> str:

    try:

        date_value = (
            pd.Timestamp(
                value
            )
        )

    except Exception as error:

        raise ValueError(
            "Fecha inválida. Usa YYYY-MM-DD."
        ) from error


    if pd.isna(
        date_value
    ):

        raise ValueError(
            "Fecha inválida."
        )


    return (
        date_value
        .strftime(
            "%Y-%m-%d"
        )
    )


# ============================================================
# EJECUTAR PREDICCIÓN
# ============================================================

def run_prediction(
    category: str,
    time_band: str,
    prediction_date: str
) -> pd.DataFrame:

    command = [

        sys.executable,

        str(
            PREDICT_SCRIPT
        ),

        "--category",
        category,

        "--date",
        prediction_date,

        "--time-band",
        time_band
    ]


    result = subprocess.run(

        command,

        cwd=str(
            BASE_DIR.parent
        ),

        capture_output=True,

        text=True,

        encoding="utf-8",

        errors="replace"
    )


    if (
        result.returncode
        !=
        0
    ):

        print(
            result.stdout
        )

        print(
            result.stderr
        )

        raise RuntimeError(
            (
                "Falló predicción: "
                f"{category} / {time_band}"
            )
        )


    if not LATEST_FILE.exists():

        raise FileNotFoundError(
            (
                "predict_demand.py no generó "
                "demand_recommendations_latest.csv."
            )
        )


    df = pd.read_csv(
        LATEST_FILE
    )


    if df.empty:

        raise ValueError(
            (
                "La predicción quedó vacía: "
                f"{category} / {time_band}"
            )
        )


    return df


# ============================================================
# MAIN
# ============================================================

def main():

    args = (
        parse_arguments()
    )


    prediction_date = (
        validate_date(
            args.date
        )
    )


    print()

    print(
        "=" * 68
    )

    print(
        " SERVIGO - GENERACIÓN BATCH DE DEMANDA"
    )

    print(
        "=" * 68
    )


    print(
        "Fecha:",
        prediction_date
    )


    print(
        "Categorías:",
        len(
            CATEGORIES
        )
    )


    print(
        "Franjas:",
        len(
            TIME_BANDS
        )
    )


    print(
        "Combinaciones:",
        (
            len(
                CATEGORIES
            )
            *
            len(
                TIME_BANDS
            )
        )
    )


    print()


    frames = []


    combination_number = (
        0
    )


    total_combinations = (
        len(
            CATEGORIES
        )
        *
        len(
            TIME_BANDS
        )
    )


    for category in CATEGORIES:

        for time_band in TIME_BANDS:

            combination_number += (
                1
            )


            print(
                (
                    f"[{combination_number}/"
                    f"{total_combinations}] "
                    f"{category} / "
                    f"{time_band}"
                )
            )


            prediction_df = (
                run_prediction(
                    category,
                    time_band,
                    prediction_date
                )
            )


            frames.append(
                prediction_df
            )


    batch_df = pd.concat(
        frames,
        ignore_index=True
    )


    # ========================================================
    # VALIDACIONES
    # ========================================================

    expected_rows = (

        len(
            CATEGORIES
        )

        *

        len(
            TIME_BANDS
        )

        *

        8
    )


    if (
        len(
            batch_df
        )
        !=
        expected_rows
    ):

        raise ValueError(
            (
                "Cantidad inesperada de filas. "
                f"Esperadas: {expected_rows}. "
                f"Generadas: {len(batch_df)}."
            )
        )


    combinations = (
        batch_df[
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
        total_combinations
    ):

        raise ValueError(
            (
                "No se generaron las "
                "15 combinaciones esperadas."
            )
        )


    if (
        batch_df[
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
        batch_df[
            "data_source"
        ]
        .ne(
            "synthetic_model"
        )
        .any()
    ):

        raise ValueError(
            (
                "Se detectó data_source "
                "distinto de synthetic_model."
            )
        )


    # ========================================================
    # ORDEN
    # ========================================================

    category_order = {

        category:
            index

        for (
            index,
            category
        )

        in enumerate(
            CATEGORIES
        )
    }


    time_band_order = {

        time_band:
            index

        for (
            index,
            time_band
        )

        in enumerate(
            TIME_BANDS
        )
    }


    batch_df[
        "_category_order"
    ] = (
        batch_df[
            "category"
        ]
        .map(
            category_order
        )
    )


    batch_df[
        "_time_band_order"
    ] = (
        batch_df[
            "time_band"
        ]
        .map(
            time_band_order
        )
    )


    batch_df = (
        batch_df
        .sort_values(
            [
                "_category_order",
                "_time_band_order",
                "ranking"
            ]
        )
        .drop(
            columns=[
                "_category_order",
                "_time_band_order"
            ]
        )
        .reset_index(
            drop=True
        )
    )


    # ========================================================
    # GUARDAR
    # ========================================================

    batch_df.to_csv(
        BATCH_FILE,
        index=False,
        encoding="utf-8-sig"
    )


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
        "Combinaciones generadas:",
        len(
            combinations
        )
    )


    print(
        "Predicciones territoriales:",
        len(
            batch_df
        )
    )


    print(
        "Esperadas:",
        expected_rows
    )


    print()

    print(
        "Archivo:"
    )

    print(
        BATCH_FILE
    )


    print()

    print(
        "IMPORTANTE:"
    )

    print(
        "Las 120 predicciones corresponden"
    )

    print(
        "al modelo experimental sintético."
    )


    print(
        "=" * 68
    )


if __name__ == "__main__":

    main()