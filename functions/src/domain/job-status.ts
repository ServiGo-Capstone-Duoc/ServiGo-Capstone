/*
 * ============================================================
 * SERVIGO - DOMINIO DE ESTADOS DEL TRABAJO
 * ============================================================
 *
 * Este archivo contiene lógica pura.
 *
 * NO depende de:
 *
 * - Firebase
 * - Firestore
 * - Authentication
 * - Functions
 *
 * Esto permite probar las reglas de negocio mediante
 * pruebas unitarias rápidas y deterministas.
 */


export type JobStatus =
  | 'accepted'
  | 'en_route'
  | 'arrived'
  | 'in_progress'
  | 'completed';


export type JobAction =
  | 'start_trip'
  | 'arrive'
  | 'start'
  | 'complete';


/*
 * ============================================================
 * TRANSICIONES PERMITIDAS
 * ============================================================
 */

const JOB_TRANSITIONS:
  Record<
    JobAction,
    {
      from: JobStatus;
      to: JobStatus;
    }
  > = {

    start_trip: {
      from:
        'accepted',

      to:
        'en_route'
    },

    arrive: {
      from:
        'en_route',

      to:
        'arrived'
    },

    start: {
      from:
        'arrived',

      to:
        'in_progress'
    },

    complete: {
      from:
        'in_progress',

      to:
        'completed'
    }
  };


/*
 * ============================================================
 * VALIDAR ACCIÓN
 * ============================================================
 */

export function isValidJobAction(
  action:
    unknown
): action is JobAction {


  return (
    action ===
      'start_trip'
    ||
    action ===
      'arrive'
    ||
    action ===
      'start'
    ||
    action ===
      'complete'
  );
}


/*
 * ============================================================
 * OBTENER SIGUIENTE ESTADO
 * ============================================================
 */

export function getNextJobStatus(
  currentStatus:
    JobStatus,
  action:
    JobAction
): JobStatus | null {


  const transition =
    JOB_TRANSITIONS[
      action
    ];


  if (
    transition.from !==
    currentStatus
  ) {

    return null;
  }


  return transition.to;
}


/*
 * ============================================================
 * VALIDAR TRANSICIÓN
 * ============================================================
 */

export function canTransitionJob(
  currentStatus:
    JobStatus,
  action:
    JobAction
): boolean {


  return (
    getNextJobStatus(
      currentStatus,
      action
    ) !==
    null
  );
}