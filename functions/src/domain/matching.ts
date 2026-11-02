/*
 * ============================================================
 * SERVIGO - DOMINIO MATCHING
 * ============================================================
 */

export type MatchingUrgency =
  | 'normal'
  | 'soon'
  | 'urgent';


export interface MatchingResult {

  matches: boolean;

  score: number;

  reasons: string[];
}


/*
 * ============================================================
 * NORMALIZACIÓN
 * ============================================================
 */

export function normalizeMatchingText(
  value:
    unknown
): string {


  if (
    typeof value !==
    'string'
  ) {

    return '';
  }


  return value
    .normalize(
      'NFD'
    )
    .replace(
      /[\u0300-\u036f]/g,
      ''
    )
    .trim()
    .toLowerCase();
}


/*
 * ============================================================
 * ESPECIALIDAD
 * ============================================================
 */

export function hasMatchingSpecialty(
  specialties:
    unknown,
  category:
    unknown
): boolean {


  if (
    !Array.isArray(
      specialties
    )
  ) {

    return false;
  }


  const normalizedCategory =
    normalizeMatchingText(
      category
    );


  if (
    !normalizedCategory
  ) {

    return false;
  }


  return specialties
    .map(
      normalizeMatchingText
    )
    .includes(
      normalizedCategory
    );
}


/*
 * ============================================================
 * COMUNA
 * ============================================================
 */

export function hasMatchingCommune(
  technicianCommune:
    unknown,
  requestCommune:
    unknown
): boolean {


  const normalizedTechnician =
    normalizeMatchingText(
      technicianCommune
    );


  const normalizedRequest =
    normalizeMatchingText(
      requestCommune
    );


  return (
    !!normalizedTechnician
    &&
    normalizedTechnician ===
      normalizedRequest
  );
}


/*
 * ============================================================
 * SCORE
 * ============================================================
 */

export function calculateMatchScore(
  urgency:
    MatchingUrgency
): number {


  let score =
    80;


  if (
    urgency ===
    'urgent'
  ) {

    score +=
      15;
  }


  else if (
    urgency ===
    'soon'
  ) {

    score +=
      5;
  }


  return score;
}


/*
 * ============================================================
 * MATCH COMPLETO
 * ============================================================
 */

export function calculateTechnicianMatch(
  specialties:
    unknown,
  technicianCommune:
    unknown,
  category:
    unknown,
  requestCommune:
    unknown,
  urgency:
    MatchingUrgency
): MatchingResult {


  const specialtyMatches =
    hasMatchingSpecialty(
      specialties,
      category
    );


  const communeMatches =
    hasMatchingCommune(
      technicianCommune,
      requestCommune
    );


  if (
    !specialtyMatches
    ||
    !communeMatches
  ) {

    return {

      matches:
        false,

      score:
        0,

      reasons:
        []
    };
  }


  const reasons =
    [
      'Especialidad compatible',
      'Misma comuna'
    ];


  if (
    urgency ===
    'urgent'
  ) {

    reasons.push(
      'Solicitud urgente'
    );
  }


  else if (
    urgency ===
    'soon'
  ) {

    reasons.push(
      'Solicitud prioritaria'
    );
  }


  return {

    matches:
      true,

    score:
      calculateMatchScore(
        urgency
      ),

    reasons
  };
}