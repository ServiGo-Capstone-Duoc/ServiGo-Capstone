export interface AcceptedQuoteContext {
  quoteId: string;
  requestId: string;
  clientId: string;
  technicianId: string;
  technicianName: string;
  visitFeeAmount: number;
  laborAmount: number;
  materialsAmount: number;
  otherAmount: number;
  totalAmount: number;
  availableDate: unknown;
  comment: string;
  acceptedAt: unknown;
}

export interface AcceptedQuoteResolutionInput {
  requestId: string;
  clientId: string;
  assignedTechnicianId?: string | null;
  acceptedQuoteId?: string | null;
  storedQuote?: Record<string, unknown> | null;
  acceptedSnapshot?: Record<string, unknown> | null;
}

function cleanText(
  value: unknown
): string {
  return typeof value === 'string'
    ? value.trim()
    : '';
}

function cleanAmount(
  value: unknown
): number {
  return typeof value === 'number'
    && Number.isFinite(value)
      ? value
      : Number.NaN;
}

function buildContext(
  candidate: Record<string, unknown>,
  quoteIdHint: string,
  input: AcceptedQuoteResolutionInput,
  requireAcceptedStatus: boolean
): AcceptedQuoteContext | null {
  const candidateQuoteId =
    cleanText(candidate['quoteId']);

  const quoteId =
    candidateQuoteId
    || quoteIdHint;

  const expectedQuoteId =
    cleanText(input.acceptedQuoteId);

  const requestId =
    cleanText(candidate['requestId']);

  const clientId =
    cleanText(candidate['clientId']);

  const technicianId =
    cleanText(candidate['technicianId']);

  const expectedTechnicianId =
    cleanText(input.assignedTechnicianId);

  const visitFeeAmount =
    cleanAmount(
      candidate['visitFeeAmount']
      ?? 0
    );

  const laborAmount =
    cleanAmount(candidate['laborAmount']);

  const materialsAmount =
    cleanAmount(candidate['materialsAmount']);

  const otherAmount =
    cleanAmount(candidate['otherAmount']);

  const totalAmount =
    cleanAmount(candidate['totalAmount']);

  if (
    !quoteId
    || (
      expectedQuoteId
      && quoteId !== expectedQuoteId
    )
    || requestId !== input.requestId
    || clientId !== input.clientId
    || !technicianId
    || (
      expectedTechnicianId
      && technicianId !== expectedTechnicianId
    )
    || (
      requireAcceptedStatus
      && candidate['status'] !== 'accepted'
    )
    || !Number.isFinite(visitFeeAmount)
    || !Number.isFinite(laborAmount)
    || !Number.isFinite(materialsAmount)
    || !Number.isFinite(otherAmount)
    || !Number.isFinite(totalAmount)
    || visitFeeAmount < 0
    || laborAmount < 0
    || materialsAmount < 0
    || otherAmount < 0
    || totalAmount <= 0
    || totalAmount !== visitFeeAmount + laborAmount + materialsAmount + otherAmount
  ) {
    return null;
  }

  return {
    quoteId,
    requestId,
    clientId,
    technicianId,
    technicianName:
      cleanText(candidate['technicianName']),
    visitFeeAmount,
    laborAmount,
    materialsAmount,
    otherAmount,
    totalAmount,
    availableDate:
      candidate['availableDate'] ?? null,
    comment:
      cleanText(candidate['comment']),
    acceptedAt:
      candidate['acceptedAt'] ?? null
  };
}

/*
 * Resuelve el presupuesto aceptado usando dos fuentes autoritativas:
 *
 * 1. Documento original quotes/{quoteId} con status accepted.
 * 2. Snapshot histórico almacenado dentro de serviceRequests/{requestId}.
 *
 * Un documento inválido no bloquea el uso de la otra fuente válida.
 */
export function resolveAcceptedQuoteContext(
  input: AcceptedQuoteResolutionInput
): AcceptedQuoteContext | null {
  const acceptedQuoteId =
    cleanText(input.acceptedQuoteId)
    || cleanText(input.acceptedSnapshot?.['quoteId']);

  if (
    input.storedQuote
  ) {
    const fromStoredQuote =
      buildContext(
        input.storedQuote,
        acceptedQuoteId,
        input,
        true
      );

    if (
      fromStoredQuote
    ) {
      return fromStoredQuote;
    }
  }

  if (
    input.acceptedSnapshot
  ) {
    return buildContext(
      input.acceptedSnapshot,
      acceptedQuoteId,
      input,
      false
    );
  }

  return null;
}
