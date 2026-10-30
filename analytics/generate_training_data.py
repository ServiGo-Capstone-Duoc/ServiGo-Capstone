from __future__ import annotations

import random
from datetime import date, timedelta
from pathlib import Path

import pandas as pd


# ============================================================
# CONFIGURACIÓN
# ============================================================

SEED = 20261027

START_DATE = date(
    2025,
    1,
    1
)

END_DATE = date(
    2026,
    9,
    30
)

BASE_DIR = (
    Path(__file__)
    .resolve()
    .parent
)

OUTPUT_DIR = (
    BASE_DIR
    / "output"
    / "training"
)

OUTPUT_DIR.mkdir(
    parents=True,
    exist_ok=True
)

OUTPUT_FILE = (
    OUTPUT_DIR
    / "demanda_sintetica.csv"
)


# ============================================================
# DIMENSIONES
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


WEEKDAY_NAMES = {
    0: "Lunes",
    1: "Martes",
    2: "Miércoles",
    3: "Jueves",
    4: "Viernes",
    5: "Sábado",
    6: "Domingo"
}


# ============================================================
# FACTORES TERRITORIALES
# ============================================================
#
# Estos factores NO representan demanda real observada.
#
# Solamente crean patrones controlados para desarrollar
# y validar técnicamente el modelo.
# ============================================================

COMMUNE_FACTORS = {
    "Puente Alto": 1.30,
    "La Florida": 1.20,
    "Maipú": 1.15,
    "Santiago": 1.25,
    "Ñuñoa": 0.95,
    "Las Condes": 0.90,
    "Providencia": 0.85,
    "San Bernardo": 1.10
}


CATEGORY_FACTORS = {
    "Electricidad": 1.30,
    "Gasfitería": 1.25,
    "Cerrajería": 0.90,
    "Climatización": 0.80,
    "Electrodomésticos": 0.95
}


TIME_BAND_FACTORS = {
    "Mañana": 1.20,
    "Tarde": 1.00,
    "Noche": 0.70
}


# ============================================================
# FACTORES TEMPORALES
# ============================================================

def weekday_factor(
    weekday: int
) -> float:

    if weekday in (
        5,
        6
    ):
        return 0.85

    if weekday in (
        0,
        1
    ):
        return 1.10

    return 1.00


def seasonal_factor(
    month: int,
    category: str
) -> float:

    factor = 1.0

    # Climatización aumenta en verano.

    if (
        category == "Climatización"
        and
        month in (
            12,
            1,
            2
        )
    ):
        factor *= 1.70


    # Electricidad aumenta moderadamente en invierno.

    if (
        category == "Electricidad"
        and
        month in (
            6,
            7,
            8
        )
    ):
        factor *= 1.20


    # Gasfitería aumenta en invierno.

    if (
        category == "Gasfitería"
        and
        month in (
            6,
            7,
            8
        )
    ):
        factor *= 1.35


    # Cerrajería tiene una estacionalidad menor.

    if (
        category == "Cerrajería"
        and
        month in (
            1,
            2
        )
    ):
        factor *= 0.90


    return factor


# ============================================================
# GENERADOR DE DEMANDA
# ============================================================

def calculate_expected_demand(
    current_date: date,
    commune: str,
    category: str,
    time_band: str
) -> float:

    base_demand = 2.30


    value = (
        base_demand
        *
        COMMUNE_FACTORS[
            commune
        ]
        *
        CATEGORY_FACTORS[
            category
        ]
        *
        TIME_BAND_FACTORS[
            time_band
        ]
        *
        weekday_factor(
            current_date.weekday()
        )
        *
        seasonal_factor(
            current_date.month,
            category
        )
    )


    # Tendencia temporal suave.
    #
    # Simula crecimiento gradual de uso de la plataforma,
    # no crecimiento real observado.

    days_since_start = (
        current_date
        -
        START_DATE
    ).days


    trend = (
        1
        +
        (
            days_since_start
            /
            365
        )
        *
        0.08
    )


    return (
        value
        *
        trend
    )


def generate_observed_demand(
    expected_demand: float
) -> int:

    # Variabilidad aleatoria controlada.
    #
    # El ruido permite que el modelo no reciba una relación
    # completamente determinista.

    noise = random.gauss(
        0,
        1.10
    )


    observed = round(
        expected_demand
        +
        noise
    )


    return max(
        0,
        observed
    )


# ============================================================
# GENERACIÓN
# ============================================================

def generate_dataset() -> pd.DataFrame:

    random.seed(
        SEED
    )


    rows = []


    current_date = (
        START_DATE
    )


    while (
        current_date
        <=
        END_DATE
    ):

        weekday_number = (
            current_date.weekday()
        )


        weekday_name = (
            WEEKDAY_NAMES[
                weekday_number
            ]
        )


        is_weekend = int(
            weekday_number
            in (
                5,
                6
            )
        )


        for commune in COMMUNES:

            for category in CATEGORIES:

                for time_band in TIME_BANDS:

                    expected_demand = (
                        calculate_expected_demand(
                            current_date,
                            commune,
                            category,
                            time_band
                        )
                    )


                    demand = (
                        generate_observed_demand(
                            expected_demand
                        )
                    )


                    urgent_probability = (
                        0.22
                    )


                    urgent_requests = (
                        round(
                            demand
                            *
                            urgent_probability
                            *
                            random.uniform(
                                0.70,
                                1.30
                            )
                        )
                    )


                    urgent_requests = min(
                        demand,
                        max(
                            0,
                            urgent_requests
                        )
                    )


                    unique_clients = max(
                        0,
                        demand
                        -
                        random.randint(
                            0,
                            min(
                                2,
                                demand
                            )
                        )
                    )


                    rows.append({

                        "creation_date":
                            current_date.isoformat(),

                        "creation_year":
                            current_date.year,

                        "creation_month":
                            current_date.month,

                        "creation_day":
                            current_date.day,

                        "creation_weekday_number":
                            weekday_number,

                        "creation_weekday":
                            weekday_name,

                        "creation_time_band":
                            time_band,

                        "commune":
                            commune,

                        "category":
                            category,

                        "is_weekend":
                            is_weekend,

                        "urgent_requests":
                            urgent_requests,

                        "unique_clients":
                            unique_clients,

                        "demand":
                            demand,

                        "synthetic_expected_demand":
                            round(
                                expected_demand,
                                4
                            ),

                        "data_source":
                            "synthetic",

                        "is_synthetic":
                            1
                    })


        current_date += timedelta(
            days=1
        )


    df = pd.DataFrame(
        rows
    )


    # ========================================================
    # VARIABLES HISTÓRICAS
    # ========================================================

    df[
        "creation_date"
    ] = pd.to_datetime(
        df[
            "creation_date"
        ]
    )


    df = (
        df
        .sort_values(
            [
                "commune",
                "category",
                "creation_time_band",
                "creation_date"
            ]
        )
        .reset_index(
            drop=True
        )
    )


    group_columns = [
        "commune",
        "category",
        "creation_time_band"
    ]


    # Día anterior disponible para la misma combinación.

    df[
        "demand_lag_1"
    ] = (
        df
        .groupby(
            group_columns
        )[
            "demand"
        ]
        .shift(
            1
        )
    )


    # Demanda de la semana anterior.

    df[
        "demand_lag_7"
    ] = (
        df
        .groupby(
            group_columns
        )[
            "demand"
        ]
        .shift(
            7
        )
    )


    # Promedio móvil de los 7 días anteriores.
    #
    # shift(1) evita utilizar la demanda del mismo día
    # que intentamos explicar.

    df[
        "rolling_mean_7"
    ] = (
        df
        .groupby(
            group_columns
        )[
            "demand"
        ]
        .transform(
            lambda series:
                series
                .shift(
                    1
                )
                .rolling(
                    window=7,
                    min_periods=1
                )
                .mean()
        )
        .round(
            4
        )
    )


    # Promedio móvil de 28 días.

    df[
        "rolling_mean_28"
    ] = (
        df
        .groupby(
            group_columns
        )[
            "demand"
        ]
        .transform(
            lambda series:
                series
                .shift(
                    1
                )
                .rolling(
                    window=28,
                    min_periods=1
                )
                .mean()
        )
        .round(
            4
        )
    )


    # Orden cronológico final para lectura.

    df = (
        df
        .sort_values(
            [
                "creation_date",
                "commune",
                "category",
                "creation_time_band"
            ]
        )
        .reset_index(
            drop=True
        )
    )


    return df


# ============================================================
# VALIDACIÓN
# ============================================================

def validate_dataset(
    df: pd.DataFrame
):

    if df.empty:

        raise ValueError(
            "El dataset sintético quedó vacío."
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
            "Se detectaron registros no marcados como sintéticos."
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
            "Se detectó un data_source distinto de synthetic."
        )


    if (
        df[
            "demand"
        ]
        .lt(
            0
        )
        .any()
    ):

        raise ValueError(
            "Se detectó demanda negativa."
        )


# ============================================================
# RESUMEN
# ============================================================

def print_summary(
    df: pd.DataFrame
):

    print()

    print(
        "=" * 60
    )

    print(
        " SERVIGO - DATOS SINTÉTICOS DE ENTRENAMIENTO"
    )

    print(
        "=" * 60
    )


    print(
        "Semilla:",
        SEED
    )


    print(
        "Periodo:",
        START_DATE,
        "→",
        END_DATE
    )


    print(
        "Observaciones:",
        len(
            df
        )
    )


    print(
        "Comunas:",
        df[
            "commune"
        ].nunique()
    )


    print(
        "Categorías:",
        df[
            "category"
        ].nunique()
    )


    print(
        "Franjas:",
        df[
            "creation_time_band"
        ].nunique()
    )


    print(
        "Demanda total sintética:",
        int(
            df[
                "demand"
            ].sum()
        )
    )


    print(
        "Demanda promedio:",
        round(
            float(
                df[
                    "demand"
                ].mean()
            ),
            2
        )
    )


    print(
        "Demanda máxima:",
        int(
            df[
                "demand"
            ].max()
        )
    )


    print()

    print(
        "data_source = synthetic"
    )


    print(
        "is_synthetic = 1"
    )


    print()

    print(
        "IMPORTANTE:"
    )


    print(
        "Estos datos NO representan demanda real de ServiGo."
    )


    print(
        "Se utilizan exclusivamente para desarrollo,"
    )


    print(
        "entrenamiento y validación técnica del modelo."
    )


    print(
        "=" * 60
    )


# ============================================================
# MAIN
# ============================================================

def main():

    df = (
        generate_dataset()
    )


    validate_dataset(
        df
    )


    df.to_csv(
        OUTPUT_FILE,
        index=False,
        encoding="utf-8-sig"
    )


    print_summary(
        df
    )


    print()

    print(
        "Dataset generado:"
    )


    print(
        OUTPUT_FILE
    )


if __name__ == "__main__":

    main()