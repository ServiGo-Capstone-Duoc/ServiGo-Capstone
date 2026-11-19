/*
 * ============================================================
 * SERVIGO - DOMINIO DE COTIZACIONES
 * ============================================================
 */


export type QuoteStatus =
  | 'sent'
  | 'accepted'
  | 'rejected';


export type OpportunityStatus =
  | 'available'
  | 'viewed'
  | 'quoted'
  | 'assigned'
  | 'assigned_elsewhere';


/*
 * ============================================================
 * QUOTE DISPONIBLE
 * ============================================================
 */

export function canAcceptQuote(
  quoteStatus:
    unknown,
  serviceStatus:
    unknown
): boolean {


  return (
    quoteStatus ===
      'sent'
    &&
    serviceStatus ===
      'published'
  );
}


/*
 * ============================================================
 * PROPIEDAD DE LA QUOTE
 * ============================================================
 */

export function quoteBelongsToClient(
  authenticatedClientId:
    unknown,
  quoteClientId:
    unknown,
  requestClientId:
    unknown
): boolean {


  if (
    typeof authenticatedClientId !==
      'string'
    ||
    !authenticatedClientId
  ) {

    return false;
  }


  return (
    authenticatedClientId ===
      quoteClientId
    &&
    authenticatedClientId ===
      requestClientId
  );
}


/*
 * ============================================================
 * RELACIONES
 * ============================================================
 */

export function hasValidQuoteRelations(
  requestId:
    unknown,
  technicianId:
    unknown,
  clientId:
    unknown
): boolean {


  return (
    typeof requestId ===
      'string'
    &&
    requestId.trim().length >
      0
    &&
    typeof technicianId ===
      'string'
    &&
    technicianId.trim().length >
      0
    &&
    typeof clientId ===
      'string'
    &&
    clientId.trim().length >
      0
  );
}


/*
 * ============================================================
 * AUTOCOTIZACIÓN
 * ============================================================
 */

export function isSelfQuote(
  clientId:
    unknown,
  technicianId:
    unknown
): boolean {


  return (
    typeof clientId ===
      'string'
    &&
    clientId.length >
      0
    &&
    clientId ===
      technicianId
  );
}


/*
 * ============================================================
 * ID DETERMINISTA DE OPORTUNIDAD
 * ============================================================
 */

export function buildQuoteOpportunityId(
  technicianId:
    string,
  requestId:
    string
): string {


  return (
    `${technicianId}_${requestId}`
  );
}


/*
 * ============================================================
 * ESTADO DE QUOTE DESPUÉS DE ACEPTAR
 * ============================================================
 */

export function getQuoteStatusAfterAcceptance(
  currentQuoteId:
    string,
  acceptedQuoteId:
    string,
  currentStatus:
    QuoteStatus
): QuoteStatus {


  if (
    currentQuoteId ===
    acceptedQuoteId
  ) {

    return 'accepted';
  }


  if (
    currentStatus ===
    'sent'
  ) {

    return 'rejected';
  }


  return currentStatus;
}


/*
 * ============================================================
 * ESTADO DE OPORTUNIDAD DESPUÉS DE ACEPTAR
 * ============================================================
 */

export function getOpportunityStatusAfterAcceptance(
  opportunityId:
    string,
  winningOpportunityId:
    string,
  currentStatus:
    OpportunityStatus
): OpportunityStatus {


  if (
    opportunityId ===
    winningOpportunityId
  ) {

    return 'assigned';
  }


  if (
    currentStatus ===
      'available'
    ||
    currentStatus ===
      'viewed'
    ||
    currentStatus ===
      'quoted'
  ) {

    return 'assigned_elsewhere';
  }


  return currentStatus;
}