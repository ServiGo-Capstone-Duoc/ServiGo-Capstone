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