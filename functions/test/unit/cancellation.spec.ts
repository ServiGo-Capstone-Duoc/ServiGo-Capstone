import {
  describe,
  expect,
  it
} from 'vitest';

import {
  canCancelService,
  isFinalOrBlockedStatus,
  validateCancellationReason
} from '../../src/domain/cancellation';


describe(
  'ServiGo - Cancellation',
  () => {


    describe(
      'cliente',
      () => {


        it.each([
          'published',
          'matched',
          'quoted',
          'accepted',
          'en_route',
          'arrived'
        ] as const)(
          'permite cancelar %s',
          status => {

            expect(
              canCancelService(
                'client',
                status
              )
            ).toBe(
              true
            );
          }
        );


        it.each([
          'in_progress',
          'completed',
          'cancelled'
        ] as const)(
          'bloquea cancelación en %s',
          status => {

            expect(
              canCancelService(
                'client',
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
      'técnico',
      () => {


        it.each([
          'accepted',
          'en_route',
          'arrived'
        ] as const)(
          'permite cancelar %s',
          status => {

            expect(
              canCancelService(
                'technician',
                status
              )
            ).toBe(
              true
            );
          }
        );


        it.each([
          'published',
          'matched',
          'quoted',
          'in_progress',
          'completed',
          'cancelled'
        ] as const)(
          'bloquea cancelación en %s',
          status => {

            expect(
              canCancelService(
                'technician',
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
      'estados finales o bloqueados',
      () => {


        it.each([
          'in_progress',
          'completed',
          'cancelled'
        ] as const)(
          'identifica %s como bloqueado',
          status => {

            expect(
              isFinalOrBlockedStatus(
                status
              )
            ).toBe(
              true
            );
          }
        );


        it(
          'accepted no está bloqueado',
          () => {

            expect(
              isFinalOrBlockedStatus(
                'accepted'
              )
            ).toBe(
              false
            );
          }
        );
      }
    );


    describe(
      'motivo',
      () => {


        it(
          'acepta un motivo válido',
          () => {

            const result =
              validateCancellationReason(
                'No podré recibir al técnico.'
              );


            expect(
              result.valid
            ).toBe(
              true
            );


            expect(
              result.error
            ).toBeNull();
          }
        );


        it(
          'elimina espacios exteriores',
          () => {

            const result =
              validateCancellationReason(
                '   Ya no necesito el servicio.   '
              );


            expect(
              result.normalizedReason
            ).toBe(
              'Ya no necesito el servicio.'
            );
          }
        );


        it(
          'rechaza motivo vacío',
          () => {

            expect(
              validateCancellationReason(
                ''
              ).error
            ).toBe(
              'required'
            );
          }
        );


        it(
          'rechaza solo espacios',
          () => {

            expect(
              validateCancellationReason(
                '     '
              ).error
            ).toBe(
              'required'
            );
          }
        );


        it(
          'rechaza menos de 5 caracteres',
          () => {

            expect(
              validateCancellationReason(
                'No'
              ).error
            ).toBe(
              'too_short'
            );
          }
        );


        it(
          'acepta exactamente 5 caracteres',
          () => {

            expect(
              validateCancellationReason(
                '12345'
              ).valid
            ).toBe(
              true
            );
          }
        );


        it(
          'acepta exactamente 500 caracteres',
          () => {

            expect(
              validateCancellationReason(
                'x'.repeat(
                  500
                )
              ).valid
            ).toBe(
              true
            );
          }
        );


        it(
          'rechaza 501 caracteres',
          () => {

            expect(
              validateCancellationReason(
                'x'.repeat(
                  501
                )
              ).error
            ).toBe(
              'too_long'
            );
          }
        );


        it(
          'rechaza valores que no son string',
          () => {

            expect(
              validateCancellationReason(
                null
              ).valid
            ).toBe(
              false
            );
          }
        );
      }
    );
  }
);

