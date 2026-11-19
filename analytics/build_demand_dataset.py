from __future__ import annotations

from pathlib import Path

import pandas as pd


# ============================================================
# CONFIGURACIÓN
# ============================================================

BASE_DIR = Path(__file__).resolve().parent

OUTPUT_DIR = (
    BASE_DIR
    / "output"
)

SOURCE_FILE = (
    OUTPUT_DIR
    / "servigo_analytics.csv"
)

DEMAND_FILE = (
    OUTPUT_DIR
    / "dataset_demanda.csv"
)

RECOMMENDATIONS_FILE = (
    OUTPUT_DIR
    / "recomendaciones_demanda.csv"
)


# ============================================================
# HELPERS
# ============================================================

def normalize_text(
    value
) -> str:

    if pd.isna(
        value
    ):

        return ""

    return str(
        value
    ).strip()


def classify_hour(
    hour
) -> str:

    if pd.isna(
        hour
    ):

        return "Sin información"

    hour = int(
        hour
    )

    if (
        hour >= 6
        and
        hour < 12
    ):

        return "Mañana"

    if (
        hour >= 12
        and
        hour < 18
    ):

        return "Tarde"

    if (
        hour >= 18
        and
        hour <= 23
    ):

        return "Noche"

    return "Madrugada"


def demand_level(
    value: float,
    low_threshold: float,
    high_threshold: float
) -> str:

    if value <= low_threshold:

        return "Baja"

    if value >= high_threshold:

        return "Alta"

    return "Media"


# ============================================================
# CARGAR DATASET
# ============================================================

def load_dataset() -> pd.DataFrame:

    if not SOURCE_FILE.exists():

        raise FileNotFoundError(
            (
                "No existe servigo_analytics.csv. "
                "Ejecuta primero build_dataset.py."
            )
        )


    df = pd.read_csv(
        SOURCE_FILE
    )


    if df.empty:

        return df


    # ========================================================
    # FECHA
    # ========================================================

    df[
        "created_at"
    ] = pd.to_datetime(
        df[
            "created_at"
        ],
        errors="coerce",
        utc=True
    )


    df[
        "creation_date"
    ] = (
        df[
            "created_at"
        ]
        .dt
        .date
    )


    df[
        "creation_year"
    ] = (
        df[
            "created_at"
        ]
        .dt
        .year
    )


    df[
        "creation_month"
    ] = (
        df[
            "created_at"
        ]
        .dt
        .month
    )


    df[
        "creation_day"
    ] = (
        df[
            "created_at"
        ]
        .dt
        .day
    )


    df[
        "creation_hour"
    ] = (
        df[
            "created_at"
        ]
        .dt
        .hour
    )


    df[
        "creation_weekday_number"
    ] = (
        df[
            "created_at"
        ]
        .dt
        .dayofweek
    )


    weekday_map = {

        0:
            "Lunes",

        1:
            "Martes",

        2:
            "Miércoles",

        3:
            "Jueves",

        4:
            "Viernes",

        5:
            "Sábado",

        6:
            "Domingo"
    }


    df[
        "creation_weekday"
    ] = (
        df[
            "creation_weekday_number"
        ]
        .map(
            weekday_map
        )
    )


    df[
        "year_month"
    ] = (
        df[
            "created_at"
        ]
        .dt
        .strftime(
            "%Y-%m"
        )
    )


    # ========================================================
    # FRANJA REAL DE CREACIÓN
    # ========================================================

    df[
        "creation_time_band"
    ] = (
        df[
            "creation_hour"
        ]
        .apply(
            classify_hour
        )
    )


    # ========================================================
    # LIMPIEZA DIMENSIONES
    # ========================================================

    for column in [
        "commune",
        "category",
        "urgency",
        "time_slot"
    ]:

        if column in df.columns:

            df[
                column
            ] = (
                df[
                    column
                ]
                .apply(
                    normalize_text
                )
            )


    return df


# ============================================================
# DATASET DE DEMANDA
# ============================================================

def build_demand_dataset(
    df: pd.DataFrame
) -> pd.DataFrame:

    if df.empty:

        return pd.DataFrame()


    demand = (
        df
        .groupby(
            [
                "creation_date",
                "creation_year",
                "creation_month",
                "creation_day",
                "creation_weekday_number",
                "creation_weekday",
                "creation_time_band",
                "commune",
                "category"
            ],
            dropna=False
        )
        .agg(

            demand=(
                "request_id",
                "count"
            ),

            urgent_requests=(
                "urgency",
                lambda values:
                    sum(
                        str(
                            value
                        ).lower()
                        ==
                        "urgent"

                        for value
                        in values
                    )
            ),

            unique_clients=(
                "client_id",
                "nunique"
            )

        )
        .reset_index()
    )


    # ========================================================
    # VARIABLES DERIVADAS
    # ========================================================

    demand[
        "is_weekend"
    ] = (
        demand[
            "creation_weekday_number"
        ]
        .isin(
            [
                5,
                6
            ]
        )
        .astype(
            int
        )
    )


    demand[
        "demand_lag_1"
    ] = (
        demand
        .sort_values(
            "creation_date"
        )
        .groupby(
            [
                "commune",
                "category",
                "creation_time_band"
            ]
        )[
            "demand"
        ]
        .shift(
            1
        )
    )


    demand[
        "historical_average"
    ] = (
        demand
        .groupby(
            [
                "commune",
                "category",
                "creation_time_band"
            ]
        )[
            "demand"
        ]
        .transform(
            "mean"
        )
        .round(
            2
        )
    )


    return demand


# ============================================================
# CLASIFICACIÓN DESCRIPTIVA
# ============================================================

def add_demand_levels(
    demand: pd.DataFrame
) -> pd.DataFrame:

    if demand.empty:

        return demand


    values = pd.to_numeric(
        demand[
            "demand"
        ],
        errors="coerce"
    )


    valid_values = (
        values
        .dropna()
    )


    if valid_values.empty:

        demand[
            "demand_level"
        ] = (
            "Sin información"
        )

        return demand


    # ========================================================
    # CUANTILES
    # ========================================================
    #
    # Esto NO es una predicción.
    #
    # Solo clasifica la demanda histórica observada para
    # facilitar la visualización descriptiva.
    # ========================================================

    low_threshold = float(
        valid_values.quantile(
            0.33
        )
    )


    high_threshold = float(
        valid_values.quantile(
            0.66
        )
    )


    demand[
        "demand_level"
    ] = (
        values
        .apply(
            lambda value:
                demand_level(
                    value,
                    low_threshold,
                    high_threshold
                )
        )
    )


    return demand


# ============================================================
# RECOMENDACIONES HISTÓRICAS
# ============================================================

def build_recommendations(
    demand: pd.DataFrame
) -> pd.DataFrame:

    if demand.empty:

        return pd.DataFrame()


    recommendations = (
        demand
        .groupby(
            [
                "commune",
                "category",
                "creation_time_band"
            ],
            dropna=False
        )
        .agg(

            observations=(
                "demand",
                "count"
            ),

            historical_demand=(
                "demand",
                "sum"
            ),

            average_demand=(
                "demand",
                "mean"
            ),

            maximum_demand=(
                "demand",
                "max"
            )

        )
        .reset_index()
    )


    recommendations[
        "average_demand"
    ] = (
        recommendations[
            "average_demand"
        ]
        .round(
            2
        )
    )


    # ========================================================
    # SCORE HISTÓRICO
    # ========================================================
    #
    # Por ahora el score se basa exclusivamente en demanda
    # histórica observada.
    #
    # No se presenta como probabilidad ni predicción.
    # ========================================================

    recommendations[
        "historical_score"
    ] = (
        recommendations[
            "average_demand"
        ]
    )


    # ========================================================
    # NIVEL
    # ========================================================

    score_values = (
        recommendations[
            "historical_score"
        ]
        .dropna()
    )


    if not score_values.empty:

        low_threshold = float(
            score_values.quantile(
                0.33
            )
        )


        high_threshold = float(
            score_values.quantile(
                0.66
            )
        )


        recommendations[
            "historical_level"
        ] = (
            recommendations[
                "historical_score"
            ]
            .apply(
                lambda value:
                    demand_level(
                        value,
                        low_threshold,
                        high_threshold
                    )
            )
        )


    else:

        recommendations[
            "historical_level"
        ] = (
            "Sin información"
        )


    # ========================================================
    # RANKING
    # ========================================================

    recommendations = (
        recommendations
        .sort_values(
            [
                "historical_score",
                "historical_demand"
            ],
            ascending=[
                False,
                False
            ]
        )
        .reset_index(
            drop=True
        )
    )


    recommendations[
        "ranking"
    ] = (
        recommendations.index
        +
        1
    )


    return recommendations


# ============================================================
# RESUMEN
# ============================================================

def print_summary(
    source_df: pd.DataFrame,
    demand: pd.DataFrame,
    recommendations: pd.DataFrame
):

    print()

    print(
        "=" * 60
    )

    print(
        " SERVIGO - DATASET DEMANDA"
    )

    print(
        "=" * 60
    )


    print(
        "Solicitudes fuente:",
        len(
            source_df
        )
    )


    print(
        "Observaciones demanda:",
        len(
            demand
        )
    )


    if not source_df.empty:

        print(
            "Comunas:",
            source_df[
                "commune"
            ].nunique()
        )


        print(
            "Categorías:",
            source_df[
                "category"
            ].nunique()
        )


    if not demand.empty:

        print(
            "Demanda total:",
            int(
                demand[
                    "demand"
                ].sum()
            )
        )


    print(
        "Combinaciones territoriales:",
        len(
            recommendations
        )
    )


    print()

    print(
        "IMPORTANTE:"
    )

    print(
        "La clasificación actual es descriptiva."
    )

    print(
        "Todavía no corresponde a una predicción."
    )


    print(
        "=" * 60
    )


# ============================================================
# MAIN
# ============================================================

def main():

    df = load_dataset()


    demand = (
        build_demand_dataset(
            df
        )
    )


    demand = (
        add_demand_levels(
            demand
        )
    )


    recommendations = (
        build_recommendations(
            demand
        )
    )


    demand.to_csv(
        DEMAND_FILE,
        index=False,
        encoding="utf-8-sig"
    )


    recommendations.to_csv(
        RECOMMENDATIONS_FILE,
        index=False,
        encoding="utf-8-sig"
    )


    print_summary(
        df,
        demand,
        recommendations
    )


    print()

    print(
        "Dataset demanda:"
    )

    print(
        DEMAND_FILE
    )


    print()

    print(
        "Recomendaciones históricas:"
    )

    print(
        RECOMMENDATIONS_FILE
    )


if __name__ == "__main__":

    main()