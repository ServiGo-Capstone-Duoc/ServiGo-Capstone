/*
 * ============================================================
 * SERVIGO - DOMINIO DE EVALUACIONES
 * ============================================================
 */


export interface ReviewValidationResult {

  valid: boolean;

  error:
    | 'invalid_rating'
    | 'comment_too_short'
    | 'comment_too_long'
    | null;

  normalizedComment: string;
}


export interface RatingCalculationResult {

  averageRating: number;

  ratingCount: number;
}


/*
 * ============================================================
 * VALIDAR RATING
 * ============================================================
 */

export function isValidRating(
  rating:
    unknown
): boolean {


  return (
    typeof rating ===
      'number'
    &&
    Number.isInteger(
      rating
    )
    &&
    rating >=
      1
    &&
    rating <=
      5
  );
}


/*
 * ============================================================
 * VALIDAR REVIEW
 * ============================================================
 */

export function validateReview(
  rating:
    unknown,
  comment:
    unknown
): ReviewValidationResult {


  const normalizedComment =
    typeof comment ===
      'string'
      ? comment.trim()
      : '';


  if (
    !isValidRating(
      rating
    )
  ) {

    return {

      valid:
        false,

      error:
        'invalid_rating',

      normalizedComment
    };
  }


  if (
    normalizedComment.length <
      3
  ) {

    return {

      valid:
        false,

      error:
        'comment_too_short',

      normalizedComment
    };
  }


  if (
    normalizedComment.length >
      500
  ) {

    return {

      valid:
        false,

      error:
        'comment_too_long',

      normalizedComment
    };
  }


  return {

    valid:
      true,

    error:
      null,

    normalizedComment
  };
}


/*
 * ============================================================
 * ELEGIBILIDAD PARA EVALUAR
 * ============================================================
 */

export function canSubmitReview(
  serviceStatus:
    unknown,
  paymentStatus:
    unknown
): boolean {


  return (
    serviceStatus ===
      'completed'
    &&
    paymentStatus ===
      'paid'
  );
}


/*
 * ============================================================
 * RECALCULAR REPUTACIÓN
 * ============================================================
 */

export function calculateUpdatedRating(
  currentAverage:
    unknown,
  currentRatingCount:
    unknown,
  newRating:
    number
): RatingCalculationResult {


  const safeAverage =
    typeof currentAverage ===
      'number'
    &&
    Number.isFinite(
      currentAverage
    )
      ? currentAverage
      : 0;


  const safeCount =
    typeof currentRatingCount ===
      'number'
    &&
    Number.isInteger(
      currentRatingCount
    )
    &&
    currentRatingCount >=
      0
      ? currentRatingCount
      : 0;


  const ratingCount =
    safeCount +
    1;


  const averageRating =
    Number(
      (
        (
          (
            safeAverage *
            safeCount
          )
          +
          newRating
        )
        /
        ratingCount
      )
        .toFixed(
          2
        )
    );


  return {

    averageRating,

    ratingCount
  };
}