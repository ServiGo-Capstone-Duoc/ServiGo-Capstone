from __future__ import annotations

import os
import re
import unicodedata
from datetime import datetime
from pathlib import Path
from typing import Any

import firebase_admin
import pandas as pd
from firebase_admin import firestore


# ============================================================
# CONFIGURACIÓN
# ============================================================

PROJECT_ID = "servigo-dev"

BASE_DIR = Path(__file__).resolve().parent

OUTPUT_DIR = (
    BASE_DIR
    / "output"
)

OUTPUT_DIR.mkdir(
    parents=True,
    exist_ok=True
)


# Dataset completo:
# incluye registros reales + fixtures de QA.

OUTPUT_FULL_FILE = (
    OUTPUT_DIR
    / "servigo_analytics_full.csv"
)


# Dataset analítico:
# excluye fixtures técnicos.

OUTPUT_FILE = (
    OUTPUT_DIR
    / "servigo_analytics.csv"
)


# ============================================================
# FIRESTORE
# ============================================================

def initialize_firestore():

    emulator_host = os.getenv(
        "FIRESTORE_EMULATOR_HOST"
    )


    if emulator_host:

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


    else:

        print(
            "Firestore remoto"
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
# NORMALIZACIÓN
# ============================================================

def clean_text(
    value: Any
) -> str:

    if value is None:

        return ""


    return str(
        value
    ).strip()


def normalize_key(
    value: Any
) -> str:

    text = (
        clean_text(
            value
        )
        .lower()
    )


    text = unicodedata.normalize(
        "NFD",
        text
    )


    text = "".join(
        char
        for char in text
        if unicodedata.category(
            char
        ) != "Mn"
    )


    text = re.sub(
        r"\s+",
        " ",
        text
    ).strip()


    return text


def normalize_commune(
    value: Any
) -> str:

    text = normalize_key(
        value
    )


    if not text:

        return "Sin comuna"


    return " ".join(
        word.capitalize()
        for word in text.split()
    )


def normalize_category(
    value: Any
) -> str:

    text = clean_text(
        value
    )


    if not text:

        return "Sin categoría"


    return text.title()


# ============================================================
# FECHAS
# ============================================================

def to_datetime(
    value: Any
):

    if value is None:

        return pd.NaT


    if isinstance(
        value,
        datetime
    ):

        return pd.Timestamp(
            value
        )


    if hasattr(
        value,
        "timestamp"
    ):

        try:

            return pd.Timestamp(
                value
            )

        except Exception:

            pass


    return pd.NaT


def minutes_between(
    start,
    end
):

    if (
        pd.isna(
            start
        )
        or
        pd.isna(
            end
        )
    ):

        return None


    seconds = (
        end
        -
        start
    ).total_seconds()



    if seconds < 0:

        return None


    return round(
        seconds
        / 60,
        2
    )


# ============================================================
# EXTRACCIÓN
# ============================================================

def read_collection(
    db,
    name: str
):

    rows = []


    for snapshot in (
        db.collection(
            name
        )
        .stream()
    ):

        data = (
            snapshot.to_dict()
            or {}
        )


        data[
            "_documentId"
        ] = snapshot.id


        rows.append(
            data
        )


    print(
        f"{name}: {len(rows)} registros"
    )


    return rows


# ============================================================
# ÍNDICES
# ============================================================

def build_quote_index(
    quotes
):

    return {

        row[
            "_documentId"
        ]:
            row

        for row
        in quotes
    }


def build_payment_index(
    payments
):

    result = {}


    for row in payments:

        request_id = clean_text(
            row.get(
                "requestId"
            )
        )


        if request_id:

            result[
                request_id
            ] = row


    return result


def build_review_index(
    reviews
):

    result = {}


    for row in reviews:

        request_id = clean_text(
            row.get(
                "requestId"
            )
        )


        if request_id:

            result[
                request_id
            ] = row


    return result


# ============================================================
# REGISTROS DE PRUEBA
# ============================================================
#
# Estos IDs corresponden a fixtures técnicos utilizados
# durante QA, pruebas de Chat, Push y seguridad.
#
# Se conservan en servigo_analytics_full.csv pero se
# excluyen de servigo_analytics.csv.
# ============================================================

TEST_REQUEST_PREFIXES = (

    "manual_",

    "push_",

    "chat_security_test_",

    "cancel_test_",

    "test_"
)


def is_test_request(
    request_id: str
) -> int:

    normalized_id = (
        clean_text(
            request_id
        )
        .lower()
    )


    return int(
        normalized_id.startswith(
            TEST_REQUEST_PREFIXES
        )
    )


# ============================================================
# DATASET
# ============================================================

def build_dataset(
    requests,
    quotes,
    payments,
    reviews
):

    quote_index = (
        build_quote_index(
            quotes
        )
    )


    payment_index = (
        build_payment_index(
            payments
        )
    )


    review_index = (
        build_review_index(
            reviews
        )
    )


    rows = []


    for request in requests:

        request_id = (
            request[
                "_documentId"
            ]
        )


        accepted_quote_id = clean_text(
            request.get(
                "acceptedQuoteId"
            )
        )


        quote = (
            quote_index.get(
                accepted_quote_id,
                {}
            )
        )


        payment = (
            payment_index.get(
                request_id,
                {}
            )
        )


        review = (
            review_index.get(
                request_id,
                {}
            )
        )


        # ====================================================
        # FECHAS
        # ====================================================

        created_at = to_datetime(
            request.get(
                "createdAt"
            )
        )


        preferred_date = to_datetime(
            request.get(
                "preferredDate"
            )
        )


        accepted_at = to_datetime(
            request.get(
                "acceptedAt"
            )
        )


        en_route_at = to_datetime(
            request.get(
                "enRouteAt"
            )
        )


        arrived_at = to_datetime(
            request.get(
                "arrivedAt"
            )
        )


        started_at = to_datetime(
            request.get(
                "startedAt"
            )
        )


        completed_at = to_datetime(
            request.get(
                "completedAt"
            )
        )


        cancelled_at = to_datetime(
            request.get(
                "cancelledAt"
            )
        )


        paid_at = to_datetime(
            payment.get(
                "paidAt"
            )
            or
            request.get(
                "paidAt"
            )
        )


        reviewed_at = to_datetime(
            review.get(
                "createdAt"
            )
            or
            request.get(
                "reviewedAt"
            )
        )


        status = clean_text(
            request.get(
                "status"
            )
        )


        payment_status = clean_text(
            request.get(
                "paymentStatus"
            )
        )


        # ====================================================
        # DIMENSIONES TEMPORALES
        # ====================================================

        creation_year = (
            created_at.year
            if not pd.isna(
                created_at
            )
            else None
        )


        creation_month = (
            created_at.month
            if not pd.isna(
                created_at
            )
            else None
        )


        creation_day = (
            created_at.day
            if not pd.isna(
                created_at
            )
            else None
        )


        creation_hour = (
            created_at.hour
            if not pd.isna(
                created_at
            )
            else None
        )


        creation_weekday = (
            created_at.day_name()
            if not pd.isna(
                created_at
            )
            else ""
        )


        creation_date = (
            created_at.date()
            if not pd.isna(
                created_at
            )
            else None
        )


        year_month = (
            created_at.strftime(
                "%Y-%m"
            )
            if not pd.isna(
                created_at
            )
            else ""
        )


        # ====================================================
        # FLAGS
        # ====================================================

        is_accepted = int(
            bool(
                accepted_quote_id
            )
        )


        is_completed = int(
            status ==
            "completed"
        )


        is_cancelled = int(
            status ==
            "cancelled"
        )


        is_paid = int(

            payment_status ==
            "paid"

            or

            clean_text(
                payment.get(
                    "status"
                )
            ) ==
            "approved"
        )


        has_review = int(
            bool(
                review
            )
        )


        test_record = (
            is_test_request(
                request_id
            )
        )


        # ====================================================
        # FILA
        # ====================================================

        rows.append({

            # ------------------------------------------------
            # IDENTIFICACIÓN
            # ------------------------------------------------

            "request_id":
                request_id,


            "client_id":
                clean_text(
                    request.get(
                        "clientId"
                    )
                ),


            "technician_id":
                clean_text(
                    request.get(
                        "assignedTechnicianId"
                    )
                ),


            "accepted_quote_id":
                accepted_quote_id,


            # ------------------------------------------------
            # DEMANDA
            # ------------------------------------------------

            "category":
                normalize_category(
                    request.get(
                        "category"
                    )
                ),


            "commune":
                normalize_commune(
                    request.get(
                        "commune"
                    )
                ),


            "urgency":
                clean_text(
                    request.get(
                        "urgency"
                    )
                ),


            "time_slot":
                clean_text(
                    request.get(
                        "timeSlot"
                    )
                ),


            "status":
                status,


            # ------------------------------------------------
            # FECHAS
            # ------------------------------------------------

            "created_at":
                created_at,


            "preferred_date":
                preferred_date,


            "accepted_at":
                accepted_at,


            "en_route_at":
                en_route_at,


            "arrived_at":
                arrived_at,


            "started_at":
                started_at,


            "completed_at":
                completed_at,


            "cancelled_at":
                cancelled_at,


            "paid_at":
                paid_at,


            "reviewed_at":
                reviewed_at,


            # ------------------------------------------------
            # DIMENSIONES CALENDARIO
            # ------------------------------------------------

            "creation_date":
                creation_date,


            "creation_year":
                creation_year,


            "creation_month":
                creation_month,


            "creation_day":
                creation_day,


            "creation_hour":
                creation_hour,


            "creation_weekday":
                creation_weekday,


            "year_month":
                year_month,


            # ------------------------------------------------
            # TIEMPOS OPERACIONALES
            # ------------------------------------------------

            "minutes_request_to_accept":
                minutes_between(
                    created_at,
                    accepted_at
                ),


            "minutes_accept_to_trip":
                minutes_between(
                    accepted_at,
                    en_route_at
                ),


            "minutes_trip":
                minutes_between(
                    en_route_at,
                    arrived_at
                ),


            "minutes_arrival_to_start":
                minutes_between(
                    arrived_at,
                    started_at
                ),


            "minutes_execution":
                minutes_between(
                    started_at,
                    completed_at
                ),


            "minutes_request_to_complete":
                minutes_between(
                    created_at,
                    completed_at
                ),


            "minutes_complete_to_payment":
                minutes_between(
                    completed_at,
                    paid_at
                ),


            # ------------------------------------------------
            # ECONÓMICO - COTIZACIÓN
            # ------------------------------------------------

            "quote_labor_amount":
                quote.get(
                    "laborAmount"
                ),


            "quote_materials_amount":
                quote.get(
                    "materialsAmount"
                ),


            "quote_other_amount":
                quote.get(
                    "otherAmount"
                ),


            "quote_total_amount":
                quote.get(
                    "totalAmount"
                ),


            # ------------------------------------------------
            # ECONÓMICO - PAGO
            # ------------------------------------------------

            "payment_amount":
                payment.get(
                    "amount"
                ),


            "payment_currency":
                clean_text(
                    payment.get(
                        "currency"
                    )
                ),


            "payment_method":
                clean_text(
                    payment.get(
                        "method"
                    )
                ),


            "payment_transaction_status":
                clean_text(
                    payment.get(
                        "status"
                    )
                ),


            "payment_status":
                payment_status,


            # ------------------------------------------------
            # CALIDAD
            # ------------------------------------------------

            "rating":
                review.get(
                    "rating"
                ),


            "review_comment":
                clean_text(
                    review.get(
                        "comment"
                    )
                ),


            # ------------------------------------------------
            # CANCELACIÓN
            # ------------------------------------------------

            "previous_status":
                clean_text(
                    request.get(
                        "previousStatus"
                    )
                ),


            "cancelled_by":
                clean_text(
                    request.get(
                        "cancelledBy"
                    )
                ),


            "cancellation_reason":
                clean_text(
                    request.get(
                        "cancellationReason"
                    )
                ),


            # ------------------------------------------------
            # FLAGS
            # ------------------------------------------------

            "flag_accepted":
                is_accepted,


            "flag_completed":
                is_completed,


            "flag_cancelled":
                is_cancelled,


            "flag_paid":
                is_paid,


            "flag_reviewed":
                has_review,


            "is_test_record":
                test_record
        })


    return pd.DataFrame(
        rows
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
        " SERVIGO ANALYTICS"
    )

    print(
        "=" * 60
    )


    print(
        f"Solicitudes: {len(df)}"
    )


    if df.empty:

        print(
            "Sin registros analíticos disponibles."
        )

        print(
            "=" * 60
        )

        return


    print(
        "Completadas:",
        int(
            df[
                "flag_completed"
            ].sum()
        )
    )


    print(
        "Canceladas:",
        int(
            df[
                "flag_cancelled"
            ].sum()
        )
    )


    print(
        "Contratadas:",
        int(
            df[
                "flag_accepted"
            ].sum()
        )
    )


    print(
        "Pagadas:",
        int(
            df[
                "flag_paid"
            ].sum()
        )
    )


    print(
        "Evaluadas:",
        int(
            df[
                "flag_reviewed"
            ].sum()
        )
    )


    # ========================================================
    # TASAS
    # ========================================================

    total_requests = len(
        df
    )


    if total_requests > 0:

        acceptance_rate = (
            df[
                "flag_accepted"
            ].sum()
            /
            total_requests
            *
            100
        )


        completion_rate = (
            df[
                "flag_completed"
            ].sum()
            /
            total_requests
            *
            100
        )


        cancellation_rate = (
            df[
                "flag_cancelled"
            ].sum()
            /
            total_requests
            *
            100
        )


        print(
            "Tasa contratación:",
            f"{acceptance_rate:.2f}%"
        )


        print(
            "Tasa completitud:",
            f"{completion_rate:.2f}%"
        )


        print(
            "Tasa cancelación:",
            f"{cancellation_rate:.2f}%"
        )


    # ========================================================
    # RATING
    # ========================================================

    ratings = (
        pd.to_numeric(
            df[
                "rating"
            ],
            errors="coerce"
        )
        .dropna()
    )


    if not ratings.empty:

        print(
            "Rating promedio:",
            round(
                ratings.mean(),
                2
            )
        )


    # ========================================================
    # COTIZACIÓN
    # ========================================================

    quote_amounts = (
        pd.to_numeric(
            df[
                "quote_total_amount"
            ],
            errors="coerce"
        )
        .dropna()
    )


    if not quote_amounts.empty:

        print(
            "Ticket cotizado promedio:",
            round(
                quote_amounts.mean(),
                0
            )
        )


    # ========================================================
    # PAGO
    # ========================================================

    payment_amounts = (
        pd.to_numeric(
            df[
                "payment_amount"
            ],
            errors="coerce"
        )
        .dropna()
    )


    if not payment_amounts.empty:

        print(
            "Pago promedio:",
            round(
                payment_amounts.mean(),
                0
            )
        )


    # ========================================================
    # TIEMPOS
    # ========================================================

    request_to_accept = (
        pd.to_numeric(
            df[
                "minutes_request_to_accept"
            ],
            errors="coerce"
        )
        .dropna()
    )


    if not request_to_accept.empty:

        print(
            "Minutos promedio solicitud → contratación:",
            round(
                request_to_accept.mean(),
                2
            )
        )


    request_to_complete = (
        pd.to_numeric(
            df[
                "minutes_request_to_complete"
            ],
            errors="coerce"
        )
        .dropna()
    )


    if not request_to_complete.empty:

        print(
            "Minutos promedio solicitud → término:",
            round(
                request_to_complete.mean(),
                2
            )
        )


    print(
        "=" * 60
    )


# ============================================================
# MAIN
# ============================================================

def main():

    db = (
        initialize_firestore()
    )


    print()

    print(
        "Extrayendo información ServiGo..."
    )

    print()


    requests = read_collection(
        db,
        "serviceRequests"
    )


    quotes = read_collection(
        db,
        "quotes"
    )


    payments = read_collection(
        db,
        "payments"
    )


    reviews = read_collection(
        db,
        "reviews"
    )


    # ========================================================
    # CONSTRUIR DATASET
    # ========================================================

    df = build_dataset(
        requests,
        quotes,
        payments,
        reviews
    )


    # ========================================================
    # DATASET COMPLETO QA
    # ========================================================
    #
    # Incluye todos los registros, incluidos fixtures.
    # Nos sirve para revisar el pipeline y las pruebas.
    # ========================================================

    df.to_csv(
        OUTPUT_FULL_FILE,
        index=False,
        encoding="utf-8-sig"
    )


    # ========================================================
    # DATASET ANALÍTICO
    # ========================================================
    #
    # Excluye registros identificados como fixtures técnicos.
    # Este archivo será utilizado por BI.
    # ========================================================

    if (
        not df.empty
        and
        "is_test_record"
        in df.columns
    ):

        analytics_df = (
            df[
                df[
                    "is_test_record"
                ] == 0
            ]
            .copy()
        )

    else:

        analytics_df = (
            df.copy()
        )


    analytics_df.to_csv(
        OUTPUT_FILE,
        index=False,
        encoding="utf-8-sig"
    )


    # ========================================================
    # RESUMEN ANALÍTICO
    # ========================================================

    print_summary(
        analytics_df
    )


    # ========================================================
    # CONTROL QA
    # ========================================================

    total_records = len(
        df
    )


    test_records = (

        int(
            df[
                "is_test_record"
            ].sum()
        )

        if (
            not df.empty
            and
            "is_test_record"
            in df.columns
        )

        else 0
    )


    analytics_records = len(
        analytics_df
    )


    print()

    print(
        "CONTROL DE DATASET"
    )

    print(
        "-" * 60
    )


    print(
        "Registros totales:",
        total_records
    )


    print(
        "Registros de prueba excluidos:",
        test_records
    )


    print(
        "Registros disponibles para BI:",
        analytics_records
    )


    print(
        "-" * 60
    )


    print()

    print(
        "Dataset completo QA:"
    )

    print(
        OUTPUT_FULL_FILE
    )


    print()

    print(
        "Dataset Analytics:"
    )

    print(
        OUTPUT_FILE
    )


# ============================================================
# EJECUCIÓN
# ============================================================

if __name__ == "__main__":

    main()