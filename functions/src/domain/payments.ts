/*
 * ============================================================
 * SERVIGO - DOMINIO DE PAGOS / WEBPAY
 * ============================================================
 *
 * Lógica pura.
 *
 * NO llama:
 *
 * - Transbank
 * - Firebase
 * - Firestore
 * - Functions
 */


export interface WebpayCommitData {

  responseCode:
    unknown;

  buyOrder:
    unknown;

  amount:
    unknown;
}


export type WebpayValidationError =
  | 'invalid_expected_amount'
  | 'invalid_expected_buy_order'
  | 'buy_order_mismatch'
  | 'amount_mismatch'
  | null;


export interface WebpayValidationResult {

  valid:
    boolean;

  approved:
    boolean;

  error:
    WebpayValidationError;
}


/*
 * ============================================================
 * MONTO
 * ============================================================
 */

export function isValidPaymentAmount(
  amount:
    unknown
): amount is number {


  return (
    typeof amount ===
      'number'
    &&
    Number.isFinite(
      amount
    )
    &&
    amount >
      0
  );
}


/*
 * ============================================================
 * BUY ORDER
 * ============================================================
 */

export function isValidBuyOrder(
  buyOrder:
    unknown
): buyOrder is string {


  return (
    typeof buyOrder ===
      'string'
    &&
    buyOrder.trim().length >
      0
  );
}


/*
 * ============================================================
 * RESPONSE CODE
 * ============================================================
 */

export function isWebpayApproved(
  responseCode:
    unknown
): boolean {


  return (
    responseCode ===
    0
  );
}


/*
 * ============================================================
 * VALIDAR RESULTADO COMMIT
 * ============================================================
 */

export function validateWebpayCommit(
  expectedBuyOrder:
    unknown,
  expectedAmount:
    unknown,
  result:
    WebpayCommitData
): WebpayValidationResult {


  if (
    !isValidBuyOrder(
      expectedBuyOrder
    )
  ) {

    return {

      valid:
        false,

      approved:
        false,

      error:
        'invalid_expected_buy_order'
    };
  }


  if (
    !isValidPaymentAmount(
      expectedAmount
    )
  ) {

    return {

      valid:
        false,

      approved:
        false,

      error:
        'invalid_expected_amount'
    };
  }


  if (
    result.buyOrder !==
    expectedBuyOrder
  ) {

    return {

      valid:
        false,

      approved:
        false,

      error:
        'buy_order_mismatch'
    };
  }


  if (
    Number(
      result.amount
    ) !==
    expectedAmount
  ) {

    return {

      valid:
        false,

      approved:
        false,

      error:
        'amount_mismatch'
    };
  }


  return {

    valid:
      true,

    approved:
      isWebpayApproved(
        result.responseCode
      ),

    error:
      null
  };
}


/*
 * ============================================================
 * ESTADO FINAL PAYMENT
 * ============================================================
 */

export function getPaymentStatusFromWebpay(
  responseCode:
    unknown
):
  | 'approved'
  | 'rejected' {


  return isWebpayApproved(
    responseCode
  )
    ? 'approved'
    : 'rejected';
}