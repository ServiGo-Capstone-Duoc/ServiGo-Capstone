export type CancellationActor =
  | 'client'
  | 'technician';


export type CancellableServiceStatus =
  | 'published'
  | 'matched'
  | 'quoted'
  | 'accepted'
  | 'en_route'
  | 'arrived'
  | 'in_progress'
  | 'completed'
  | 'cancelled';


const CLIENT_CANCELLABLE_STATUSES:
  CancellableServiceStatus[] = [
    'published',
    'matched',
    'quoted',
    'accepted',
    'en_route',
    'arrived'
  ];


const TECHNICIAN_CANCELLABLE_STATUSES:
  CancellableServiceStatus[] = [
    'accepted',
    'en_route',
    'arrived'
  ];


export function canCancelService(
  actor: CancellationActor,
  status: CancellableServiceStatus
): boolean {

  if (
    actor ===
    'client'
  ) {

    return CLIENT_CANCELLABLE_STATUSES
      .includes(
        status
      );
  }


  return TECHNICIAN_CANCELLABLE_STATUSES
    .includes(
      status
    );
}


export function isFinalOrBlockedStatus(
  status: CancellableServiceStatus
): boolean {

  return (
    status ===
      'in_progress'
    ||
    status ===
      'completed'
    ||
    status ===
      'cancelled'
  );
}


export function validateCancellationReason(
  reason: unknown
): {
  valid: boolean;
  normalizedReason: string;
  error:
    | 'required'
    | 'too_short'
    | 'too_long'
    | null;
} {

  const normalizedReason =
    typeof reason ===
      'string'
      ? reason.trim()
      : '';


  if (
    !normalizedReason
  ) {

    return {
      valid:
        false,

      normalizedReason,

      error:
        'required'
    };
  }


  if (
    normalizedReason.length <
    5
  ) {

    return {
      valid:
        false,

      normalizedReason,

      error:
        'too_short'
    };
  }


  if (
    normalizedReason.length >
    500
  ) {

    return {
      valid:
        false,

      normalizedReason,

      error:
        'too_long'
    };
  }


  return {
    valid:
      true,

    normalizedReason,

    error:
      null
  };
}
export interface CancellationPenaltyInput {
  actor: CancellationActor;
  now: Date;
  scheduledAt: Date | null;
  visitFeeAmount: number;
}

export interface CancellationPenaltyResult {
  percent: 0 | 50 | 100;
  amount: number;
  baseAmount: number;
  reason:
    | 'technician_cancelled'
    | 'no_agreed_visit_fee'
    | 'no_schedule'
    | 'more_than_one_day_before'
    | 'same_day'
    | 'one_hour_or_less';
}

function chileDateKey(
  value: Date
): string {
  const parts =
    new Intl.DateTimeFormat(
      'en-CA',
      {
        timeZone: 'America/Santiago',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }
    ).formatToParts(value);

  const map =
    Object.fromEntries(
      parts.map(part => [part.type, part.value])
    );

  return `${map['year']}-${map['month']}-${map['day']}`;
}

export function calculateCancellationPenalty(
  input: CancellationPenaltyInput
): CancellationPenaltyResult {
  const baseAmount =
    Number.isFinite(input.visitFeeAmount)
      ? Math.max(0, Math.round(input.visitFeeAmount))
      : 0;

  if (
    input.actor === 'technician'
  ) {
    return {
      percent: 0,
      amount: 0,
      baseAmount,
      reason: 'technician_cancelled'
    };
  }

  if (
    baseAmount <= 0
  ) {
    return {
      percent: 0,
      amount: 0,
      baseAmount,
      reason: 'no_agreed_visit_fee'
    };
  }

  if (
    !input.scheduledAt
    || Number.isNaN(input.scheduledAt.getTime())
  ) {
    return {
      percent: 0,
      amount: 0,
      baseAmount,
      reason: 'no_schedule'
    };
  }

  const millisecondsUntilService =
    input.scheduledAt.getTime()
    - input.now.getTime();

  if (
    millisecondsUntilService <=
      60 * 60 * 1000
  ) {
    return {
      percent: 100,
      amount: baseAmount,
      baseAmount,
      reason: 'one_hour_or_less'
    };
  }

  if (
    chileDateKey(input.now) ===
    chileDateKey(input.scheduledAt)
  ) {
    return {
      percent: 50,
      amount: Math.round(baseAmount * 0.5),
      baseAmount,
      reason: 'same_day'
    };
  }

  return {
    percent: 0,
    amount: 0,
    baseAmount,
    reason: 'more_than_one_day_before'
  };
}
