import {
  describe,
  expect,
  it
} from 'vitest';

import {
  buildQuoteOpportunityId,
  canAcceptQuote,
  getOpportunityStatusAfterAcceptance,
  getQuoteStatusAfterAcceptance,
  hasValidQuoteRelations,
  isSelfQuote,
  quoteBelongsToClient
} from '../../src/domain/quotes';


describe(
  'ServiGo - Quotes',
  () => {


    describe(
      'aceptación',
      () => {


        it(
          'permite sent + published',
          () => {

            expect(
              canAcceptQuote(
                'sent',
                'published'
              )
            ).toBe(
              true
            );
          }
        );


        it(
          'bloquea quote accepted',
          () => {

            expect(
              canAcceptQuote(
                'accepted',
                'published'
              )
            ).toBe(
              false
            );
          }
        );


        it(
          'bloquea quote rejected',
          () => {

            expect(
              canAcceptQuote(
                'rejected',
                'published'
              )
            ).toBe(
              false
            );
          }
        );


        it.each([
          'accepted',
          'en_route',
          'arrived',
          'in_progress',
          'completed',
          'cancelled'
        ])(
          'bloquea aceptación cuando servicio está %s',
          status => {

            expect(
              canAcceptQuote(
                'sent',
                status
              )
            ).toBe(
              false
            );
          }
        );
      }
    );


    describe(
      'propiedad',
      () => {


        it(
          'acepta cuando Auth, quote y solicitud tienen mismo cliente',
          () => {

            expect(
              quoteBelongsToClient(
                'cliente-1',
                'cliente-1',
                'cliente-1'
              )
            ).toBe(
              true
            );
          }
        );


        it(
          'rechaza quote de otro cliente',
          () => {

            expect(
              quoteBelongsToClient(
                'cliente-1',
                'cliente-2',
                'cliente-1'
              )
            ).toBe(
              false
            );
          }
        );


        it(
          'rechaza solicitud de otro cliente',
          () => {

            expect(
              quoteBelongsToClient(
                'cliente-1',
                'cliente-1',
                'cliente-2'
              )
            ).toBe(
              false
            );
          }
        );


        it(
          'rechaza usuario vacío',
          () => {

            expect(
              quoteBelongsToClient(
                '',
                '',
                ''
              )
            ).toBe(
              false
            );
          }
        );
      }
    );


    describe(
      'relaciones',
      () => {


        it(
          'acepta relaciones completas',
          () => {

            expect(
              hasValidQuoteRelations(
                'request-1',
                'tecnico-1',
                'cliente-1'
              )
            ).toBe(
              true
            );
          }
        );


        it(
          'rechaza requestId vacío',
          () => {

            expect(
              hasValidQuoteRelations(
                '',
                'tecnico-1',
                'cliente-1'
              )
            ).toBe(
              false
            );
          }
        );


        it(
          'rechaza technicianId vacío',
          () => {

            expect(
              hasValidQuoteRelations(
                'request-1',
                '',
                'cliente-1'
              )
            ).toBe(
              false
            );
          }
        );


        it(
          'rechaza clientId vacío',
          () => {

            expect(
              hasValidQuoteRelations(
                'request-1',
                'tecnico-1',
                ''
              )
            ).toBe(
              false
            );
          }
        );


        it(
          'rechaza identificadores con solo espacios',
          () => {

            expect(
              hasValidQuoteRelations(
                '   ',
                'tecnico-1',
                'cliente-1'
              )
            ).toBe(
              false
            );
          }
        );
      }
    );


    describe(
      'autocotización',
      () => {


        it(
          'detecta cliente y técnico iguales',
          () => {

            expect(
              isSelfQuote(
                'usuario-1',
                'usuario-1'
              )
            ).toBe(
              true
            );
          }
        );


        it(
          'acepta actores diferentes',
          () => {

            expect(
              isSelfQuote(
                'cliente-1',
                'tecnico-1'
              )
            ).toBe(
              false
            );
          }
        );


        it(
          'no considera dos IDs vacíos como autocotización',
          () => {

            expect(
              isSelfQuote(
                '',
                ''
              )
            ).toBe(
              false
            );
          }
        );
      }
    );


    describe(
      'opportunityId',
      () => {


        it(
          'construye ID determinista',
          () => {

            expect(
              buildQuoteOpportunityId(
                'tecnico-123',
                'request-456'
              )
            ).toBe(
              'tecnico-123_request-456'
            );
          }
        );


        it(
          'siempre produce mismo ID',
          () => {

            const first =
              buildQuoteOpportunityId(
                'T1',
                'R1'
              );


            const second =
              buildQuoteOpportunityId(
                'T1',
                'R1'
              );


            expect(
              first
            ).toBe(
              second
            );
          }
        );
      }
    );


    describe(
      'quotes después de aceptación',
      () => {


        it(
          'quote ganadora pasa a accepted',
          () => {

            expect(
              getQuoteStatusAfterAcceptance(
                'quote-1',
                'quote-1',
                'sent'
              )
            ).toBe(
              'accepted'
            );
          }
        );


        it(
          'otra quote sent pasa a rejected',
          () => {

            expect(
              getQuoteStatusAfterAcceptance(
                'quote-2',
                'quote-1',
                'sent'
              )
            ).toBe(
              'rejected'
            );
          }
        );


        it(
          'quote ya rejected permanece rejected',
          () => {

            expect(
              getQuoteStatusAfterAcceptance(
                'quote-2',
                'quote-1',
                'rejected'
              )
            ).toBe(
              'rejected'
            );
          }
        );
      }
    );


    describe(
      'oportunidades después de aceptación',
      () => {


        it(
          'ganadora pasa a assigned',
          () => {

            expect(
              getOpportunityStatusAfterAcceptance(
                'tech1_request1',
                'tech1_request1',
                'quoted'
              )
            ).toBe(
              'assigned'
            );
          }
        );


        it.each([
          'available',
          'viewed',
          'quoted'
        ] as const)(
          'otra oportunidad %s pasa a assigned_elsewhere',
          status => {

            expect(
              getOpportunityStatusAfterAcceptance(
                'tech2_request1',
                'tech1_request1',
                status
              )
            ).toBe(
              'assigned_elsewhere'
            );
          }
        );


        it(
          'assigned existente permanece assigned',
          () => {

            expect(
              getOpportunityStatusAfterAcceptance(
                'tech2_request1',
                'tech1_request1',
                'assigned'
              )
            ).toBe(
              'assigned'
            );
          }
        );


        it(
          'assigned_elsewhere permanece igual',
          () => {

            expect(
              getOpportunityStatusAfterAcceptance(
                'tech2_request1',
                'tech1_request1',
                'assigned_elsewhere'
              )
            ).toBe(
              'assigned_elsewhere'
            );
          }
        );
      }
    );
  }
);