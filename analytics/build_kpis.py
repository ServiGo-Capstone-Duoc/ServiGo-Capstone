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

KPI_DIR = (
    OUTPUT_DIR
    / "kpis"
)

KPI_DIR.mkdir(
    parents=True,
    exist_ok=True
)


# ============================================================
# ARCHIVOS DE SALIDA
# ============================================================

SUMMARY_FILE = (
    KPI_DIR
    / "kpi_resumen.csv"
)

DEMAND_FILE = (
    KPI_DIR
    / "kpi_demanda.csv"
)

OPERATION_FILE = (
    KPI_DIR
    / "kpi_operacion.csv"
)

ECONOMIC_FILE = (
    KPI_DIR
    / "kpi_economico.csv"
)

QUALITY_FILE = (
    KPI_DIR
    / "kpi_calidad.csv"
)

CANCELLATION_FILE = (
    KPI_DIR
    / "kpi_cancelaciones.csv"
)


# ============================================================
# HELPERS
# ============================================================

def safe_rate(
    numerator,
    denominator
) -> float:

    if not denominator:
        return 0.0

    return round(
        (
            numerator
            /
            denominator
        )
        * 100,
        2
    )


def numeric_series(
    df: pd.DataFrame,
    column: str
) -> pd.Series:

    if column not in df.columns:

        return pd.Series(
            dtype="float64"
        )

    return (
        pd.to_numeric(
            df[
                column
            ],
            errors="coerce"
        )
        .dropna()
    )


def mean_value(
    df: pd.DataFrame,
    column: str
):

    values = numeric_series(
        df,
        column
    )

    if values.empty:

        return None

    return round(
        float(
            values.mean()
        ),
        2
    )


def median_value(
    df: pd.DataFrame,
    column: str
):

    values = numeric_series(
        df,
        column
    )

    if values.empty:

        return None

    return round(
        float(
            values.median()
        ),
        2
    )


def sum_value(
    df: pd.DataFrame,
    column: str
):

    values = numeric_series(
        df,
        column
    )

    if values.empty:

        return 0.0

    return round(
        float(
            values.sum()
        ),
        2
    )


def save_csv(
    df: pd.DataFrame,
    path: Path
):

    df.to_csv(
        path,
        index=False,
        encoding="utf-8-sig"
    )


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


    # --------------------------------------------------------
    # FECHAS
    # --------------------------------------------------------

    date_columns = [

        "created_at",

        "preferred_date",

        "accepted_at",

        "en_route_at",

        "arrived_at",

        "started_at",

        "completed_at",

        "cancelled_at",

        "paid_at",

        "reviewed_at",

        "creation_date"
    ]


    for column in date_columns:

        if column in df.columns:

            df[
                column
            ] = pd.to_datetime(
                df[
                    column
                ],
                errors="coerce",
                utc=True
            )


    # --------------------------------------------------------
    # FLAGS
    # --------------------------------------------------------

    flag_columns = [

        "flag_accepted",

        "flag_completed",

        "flag_cancelled",

        "flag_paid",

        "flag_reviewed"
    ]


    for column in flag_columns:

        if column in df.columns:

            df[
                column
            ] = (
                pd.to_numeric(
                    df[
                        column
                    ],
                    errors="coerce"
                )
                .fillna(
                    0
                )
                .astype(
                    int
                )
            )


    return df


# ============================================================
# KPI RESUMEN
# ============================================================

def build_summary(
    df: pd.DataFrame
) -> pd.DataFrame:

    total = len(
        df
    )


    accepted = int(
        df[
            "flag_accepted"
        ].sum()
    )


    completed = int(
        df[
            "flag_completed"
        ].sum()
    )


    cancelled = int(
        df[
            "flag_cancelled"
        ].sum()
    )


    paid = int(
        df[
            "flag_paid"
        ].sum()
    )


    reviewed = int(
        df[
            "flag_reviewed"
        ].sum()
    )


    rating_values = (
        numeric_series(
            df,
            "rating"
        )
    )


    rating_average = (

        round(
            float(
                rating_values.mean()
            ),
            2
        )

        if not rating_values.empty

        else None
    )


    quote_values = (
        numeric_series(
            df,
            "quote_total_amount"
        )
    )


    average_quote = (

        round(
            float(
                quote_values.mean()
            ),
            2
        )

        if not quote_values.empty

        else None
    )


    payment_values = (
        numeric_series(
            df,
            "payment_amount"
        )
    )


    average_payment = (

        round(
            float(
                payment_values.mean()
            ),
            2
        )

        if not payment_values.empty

        else None
    )


    total_paid_amount = (
        round(
            float(
                payment_values.sum()
            ),
            2
        )

        if not payment_values.empty

        else 0.0
    )


    rows = [

        {
            "kpi":
                "Solicitudes",

            "value":
                total,

            "unit":
                "cantidad"
        },

        {
            "kpi":
                "Contratadas",

            "value":
                accepted,

            "unit":
                "cantidad"
        },

        {
            "kpi":
                "Completadas",

            "value":
                completed,

            "unit":
                "cantidad"
        },

        {
            "kpi":
                "Canceladas",

            "value":
                cancelled,

            "unit":
                "cantidad"
        },

        {
            "kpi":
                "Pagadas",

            "value":
                paid,

            "unit":
                "cantidad"
        },

        {
            "kpi":
                "Evaluadas",

            "value":
                reviewed,

            "unit":
                "cantidad"
        },

        {
            "kpi":
                "Tasa contratación",

            "value":
                safe_rate(
                    accepted,
                    total
                ),

            "unit":
                "%"
        },

        {
            "kpi":
                "Tasa completitud",

            "value":
                safe_rate(
                    completed,
                    total
                ),

            "unit":
                "%"
        },

        {
            "kpi":
                "Tasa cancelación",

            "value":
                safe_rate(
                    cancelled,
                    total
                ),

            "unit":
                "%"
        },

        {
            "kpi":
                "Tasa pago",

            "value":
                safe_rate(
                    paid,
                    completed
                ),

            "unit":
                "%"
        },

        {
            "kpi":
                "Cobertura evaluación",

            "value":
                safe_rate(
                    reviewed,
                    completed
                ),

            "unit":
                "%"
        },

        {
            "kpi":
                "Rating promedio",

            "value":
                rating_average,

            "unit":
                "rating"
        },

        {
            "kpi":
                "Ticket cotizado promedio",

            "value":
                average_quote,

            "unit":
                "CLP"
        },

        {
            "kpi":
                "Pago promedio",

            "value":
                average_payment,

            "unit":
                "CLP"
        },

        {
            "kpi":
                "Monto total pagado",

            "value":
                total_paid_amount,

            "unit":
                "CLP"
        }
    ]


    return pd.DataFrame(
        rows
    )


# ============================================================
# KPI DEMANDA
# ============================================================

def build_demand(
    df: pd.DataFrame
) -> pd.DataFrame:

    demand = (
        df
        .groupby(
            [
                "creation_date",
                "creation_year",
                "creation_month",
                "creation_weekday",
                "creation_hour",
                "year_month",
                "commune",
                "category",
                "time_slot",
                "urgency"
            ],
            dropna=False
        )
        .agg(

            requests=(
                "request_id",
                "count"
            ),

            accepted=(
                "flag_accepted",
                "sum"
            ),

            completed=(
                "flag_completed",
                "sum"
            ),

            cancelled=(
                "flag_cancelled",
                "sum"
            ),

            paid=(
                "flag_paid",
                "sum"
            )

        )
        .reset_index()
    )


    demand[
        "acceptance_rate"
    ] = demand.apply(
        lambda row:
            safe_rate(
                row[
                    "accepted"
                ],
                row[
                    "requests"
                ]
            ),
        axis=1
    )


    demand[
        "completion_rate"
    ] = demand.apply(
        lambda row:
            safe_rate(
                row[
                    "completed"
                ],
                row[
                    "requests"
                ]
            ),
        axis=1
    )


    demand[
        "cancellation_rate"
    ] = demand.apply(
        lambda row:
            safe_rate(
                row[
                    "cancelled"
                ],
                row[
                    "requests"
                ]
            ),
        axis=1
    )


    return demand


# ============================================================
# KPI OPERACIÓN
# ============================================================

def build_operation(
    df: pd.DataFrame
) -> pd.DataFrame:

    metrics = [

        (
            "Solicitud a contratación",
            "minutes_request_to_accept"
        ),

        (
            "Contratación a salida",
            "minutes_accept_to_trip"
        ),

        (
            "Tiempo de viaje",
            "minutes_trip"
        ),

        (
            "Llegada a inicio",
            "minutes_arrival_to_start"
        ),

        (
            "Duración trabajo",
            "minutes_execution"
        ),

        (
            "Solicitud a término",
            "minutes_request_to_complete"
        ),

        (
            "Término a pago",
            "minutes_complete_to_payment"
        )
    ]


    rows = []


    for (
        label,
        column
    ) in metrics:

        values = (
            numeric_series(
                df,
                column
            )
        )


        rows.append({

            "metric":
                label,

            "source_column":
                column,

            "records":
                int(
                    len(
                        values
                    )
                ),

            "average_minutes":
                (
                    round(
                        float(
                            values.mean()
                        ),
                        2
                    )
                    if not values.empty
                    else None
                ),

            "median_minutes":
                (
                    round(
                        float(
                            values.median()
                        ),
                        2
                    )
                    if not values.empty
                    else None
                ),

            "minimum_minutes":
                (
                    round(
                        float(
                            values.min()
                        ),
                        2
                    )
                    if not values.empty
                    else None
                ),

            "maximum_minutes":
                (
                    round(
                        float(
                            values.max()
                        ),
                        2
                    )
                    if not values.empty
                    else None
                )
        })


    return pd.DataFrame(
        rows
    )


# ============================================================
# KPI ECONÓMICO
# ============================================================

def build_economic(
    df: pd.DataFrame
) -> pd.DataFrame:

    economic = (
        df
        .groupby(
            [
                "year_month",
                "commune",
                "category"
            ],
            dropna=False
        )
        .agg(

            requests=(
                "request_id",
                "count"
            ),

            completed=(
                "flag_completed",
                "sum"
            ),

            paid_services=(
                "flag_paid",
                "sum"
            ),

            labor_amount=(
                "quote_labor_amount",
                "sum"
            ),

            materials_amount=(
                "quote_materials_amount",
                "sum"
            ),

            other_amount=(
                "quote_other_amount",
                "sum"
            ),

            quoted_amount=(
                "quote_total_amount",
                "sum"
            ),

            paid_amount=(
                "payment_amount",
                "sum"
            ),

            average_quote=(
                "quote_total_amount",
                "mean"
            ),

            average_payment=(
                "payment_amount",
                "mean"
            )

        )
        .reset_index()
    )


    numeric_columns = [

        "labor_amount",

        "materials_amount",

        "other_amount",

        "quoted_amount",

        "paid_amount",

        "average_quote",

        "average_payment"
    ]


    for column in numeric_columns:

        economic[
            column
        ] = (
            pd.to_numeric(
                economic[
                    column
                ],
                errors="coerce"
            )
            .round(
                2
            )
        )


    return economic


# ============================================================
# KPI CALIDAD
# ============================================================

def build_quality(
    df: pd.DataFrame
) -> pd.DataFrame:

    quality = (
        df
        .groupby(
            [
                "year_month",
                "commune",
                "category"
            ],
            dropna=False
        )
        .agg(

            completed_services=(
                "flag_completed",
                "sum"
            ),

            reviewed_services=(
                "flag_reviewed",
                "sum"
            ),

            average_rating=(
                "rating",
                "mean"
            )

        )
        .reset_index()
    )


    quality[
        "review_coverage"
    ] = quality.apply(
        lambda row:
            safe_rate(
                row[
                    "reviewed_services"
                ],
                row[
                    "completed_services"
                ]
            ),
        axis=1
    )


    quality[
        "average_rating"
    ] = (
        pd.to_numeric(
            quality[
                "average_rating"
            ],
            errors="coerce"
        )
        .round(
            2
        )
    )


    return quality


# ============================================================
# KPI CANCELACIONES
# ============================================================

def build_cancellations(
    df: pd.DataFrame
) -> pd.DataFrame:

    cancelled_df = (
        df[
            df[
                "flag_cancelled"
            ] == 1
        ]
        .copy()
    )


    if cancelled_df.empty:

        return pd.DataFrame(
            columns=[
                "year_month",
                "commune",
                "category",
                "cancelled_by",
                "previous_status",
                "cancellations"
            ]
        )


    cancelled_df[
        "cancelled_by"
    ] = (
        cancelled_df[
            "cancelled_by"
        ]
        .fillna(
            ""
        )
        .replace(
            "",
            "Sin información"
        )
    )


    cancelled_df[
        "previous_status"
    ] = (
        cancelled_df[
            "previous_status"
        ]
        .fillna(
            ""
        )
        .replace(
            "",
            "Sin información"
        )
    )


    cancellations = (
        cancelled_df
        .groupby(
            [
                "year_month",
                "commune",
                "category",
                "cancelled_by",
                "previous_status"
            ],
            dropna=False
        )
        .agg(

            cancellations=(
                "request_id",
                "count"
            )

        )
        .reset_index()
    )


    return cancellations


# ============================================================
# MAIN
# ============================================================

def main():

    print()

    print(
        "=" * 60
    )

    print(
        " SERVIGO - BUILD KPIs"
    )

    print(
        "=" * 60
    )


    df = load_dataset()


    print(
        f"Dataset cargado: {len(df)} solicitudes"
    )


    # ========================================================
    # GENERAR TABLAS
    # ========================================================

    summary = build_summary(
        df
    )


    demand = build_demand(
        df
    )


    operation = build_operation(
        df
    )


    economic = build_economic(
        df
    )


    quality = build_quality(
        df
    )


    cancellations = (
        build_cancellations(
            df
        )
    )


    # ========================================================
    # GUARDAR
    # ========================================================

    save_csv(
        summary,
        SUMMARY_FILE
    )


    save_csv(
        demand,
        DEMAND_FILE
    )


    save_csv(
        operation,
        OPERATION_FILE
    )


    save_csv(
        economic,
        ECONOMIC_FILE
    )


    save_csv(
        quality,
        QUALITY_FILE
    )


    save_csv(
        cancellations,
        CANCELLATION_FILE
    )


    # ========================================================
    # RESULTADO
    # ========================================================

    print()

    print(
        "Archivos generados:"
    )


    for file in [

        SUMMARY_FILE,

        DEMAND_FILE,

        OPERATION_FILE,

        ECONOMIC_FILE,

        QUALITY_FILE,

        CANCELLATION_FILE

    ]:

        print(
            f"  OK - {file.name}"
        )


    print()

    print(
        "Filas:"
    )


    print(
        f"  Resumen:       {len(summary)}"
    )


    print(
        f"  Demanda:       {len(demand)}"
    )


    print(
        f"  Operación:     {len(operation)}"
    )


    print(
        f"  Económico:     {len(economic)}"
    )


    print(
        f"  Calidad:       {len(quality)}"
    )


    print(
        f"  Cancelaciones: {len(cancellations)}"
    )


    print()

    print(
        "Directorio:"
    )

    print(
        KPI_DIR
    )


    print()

    print(
        "=" * 60
    )

    print(
        " KPIs GENERADOS CORRECTAMENTE"
    )

    print(
        "=" * 60
    )


if __name__ == "__main__":

    main()