import {
  describe,
  expect,
  it
} from 'vitest';

import {
  resolveAcceptedQuoteContext
} from '../../src/domain/accepted-quote';

const validQuote = {
  requestId: 'request-1',
  clientId: 'client-1',
  technicianId: 'tech-1',
  technicianName: 'Técnico QA',
  laborAmount: 30000,
  materialsAmount: 5000,
  otherAmount: 0,
  totalAmount: 35000,
  status: 'accepted',
  comment: 'Trabajo completo'
};

describe('resolveAcceptedQuoteContext', () => {
  it('prefiere el documento de cotización válido', () => {
    const result = resolveAcceptedQuoteContext({
      requestId: 'request-1',
      clientId: 'client-1',
      assignedTechnicianId: 'tech-1',
      acceptedQuoteId: 'quote-1',
      storedQuote: validQuote,
      acceptedSnapshot: null
    });

    expect(result?.quoteId).toBe('quote-1');
    expect(result?.totalAmount).toBe(35000);
  });

  it('usa el snapshot cuando el documento original falta', () => {
    const result = resolveAcceptedQuoteContext({
      requestId: 'request-1',
      clientId: 'client-1',
      assignedTechnicianId: 'tech-1',
      acceptedQuoteId: null,
      storedQuote: null,
      acceptedSnapshot: {
        ...validQuote,
        quoteId: 'quote-legacy'
      }
    });

    expect(result?.quoteId).toBe('quote-legacy');
    expect(result?.technicianId).toBe('tech-1');
  });

  it('descarta montos inconsistentes', () => {
    const result = resolveAcceptedQuoteContext({
      requestId: 'request-1',
      clientId: 'client-1',
      assignedTechnicianId: 'tech-1',
      acceptedQuoteId: 'quote-1',
      storedQuote: {
        ...validQuote,
        totalAmount: 99999
      },
      acceptedSnapshot: null
    });

    expect(result).toBeNull();
  });

  it('rechaza una fuente que apunta a otro presupuesto', () => {
    const result = resolveAcceptedQuoteContext({
      requestId: 'request-1',
      clientId: 'client-1',
      assignedTechnicianId: 'tech-1',
      acceptedQuoteId: 'quote-expected',
      storedQuote: {
        ...validQuote,
        quoteId: 'quote-other'
      },
      acceptedSnapshot: null
    });

    expect(result).toBeNull();
  });

  it('usa el snapshot correcto si el documento preferido no es válido', () => {
    const result = resolveAcceptedQuoteContext({
      requestId: 'request-1',
      clientId: 'client-1',
      assignedTechnicianId: 'tech-1',
      acceptedQuoteId: 'quote-expected',
      storedQuote: {
        ...validQuote,
        status: 'rejected'
      },
      acceptedSnapshot: {
        ...validQuote,
        quoteId: 'quote-expected'
      }
    });

    expect(result?.quoteId).toBe('quote-expected');
    expect(result?.totalAmount).toBe(35000);
  });

});
