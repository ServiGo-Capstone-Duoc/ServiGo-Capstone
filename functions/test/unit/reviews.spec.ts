import {
  describe,
  expect,
  it
} from 'vitest';

import {
  calculateUpdatedRating,
  canSubmitReview,
  isValidRating,
  validateReview
} from '../../src/domain/reviews';


describe(
  'ServiGo - Reviews',
  () => {


    /*
     * =========================================
     * RATING
     * =========================================
     */

    describe(
      'rating',
      () => {


        it.each([
          1,
          2,
          3,
          4,
          5
        ])(
          'acepta rating %s',
          rating => {

            expect(
              isValidRating(
                rating
              )
            ).toBe(
              true
            );
          }
        );


        it.each([
          0,
          6,
          -1,
          2.5
        ])(
          'rechaza rating %s',
          rating => {

            expect(
              isValidRating(
                rating
              )
            ).toBe(
              false
            );
          }
        );


        it(
          'rechaza rating string',
          () => {

            expect(
              isValidRating(
                '5'
              )
            ).toBe(
              false
            );
          }
        );


        it(
          'rechaza null',
          () => {

            expect(
              isValidRating(
                null
              )
            ).toBe(
              false
            );
          }
        );
      }
    );


    /*
     * =========================================
     * COMENTARIO
     * =========================================
     */

    describe(
      'comentario',
      () => {


        it(
          'acepta evaluación válida',
          () => {

            const result =
              validateReview(
                5,
                'Excelente servicio.'
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
              validateReview(
                4,
                '   Buen trabajo.   '
              );


            expect(
              result.normalizedComment
            ).toBe(
              'Buen trabajo.'
            );
          }
        );


        it(
          'rechaza comentario vacío',
          () => {

            expect(
              validateReview(
                5,
                ''
              ).error
            ).toBe(
              'comment_too_short'
            );
          }
        );


        it(
          'rechaza comentario de 2 caracteres',
          () => {

            expect(
              validateReview(
                5,
                'Ok'
              ).error
            ).toBe(
              'comment_too_short'
            );
          }
        );


        it(
          'acepta exactamente 3 caracteres',
          () => {

            expect(
              validateReview(
                5,
                'Bien'.slice(
                  0,
                  3
                )
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
              validateReview(
                5,
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
              validateReview(
                5,
                'x'.repeat(
                  501
                )
              ).error
            ).toBe(
              'comment_too_long'
            );
          }
        );


        it(
          'rechaza comentario no string',
          () => {

            expect(
              validateReview(
                5,
                null
              ).valid
            ).toBe(
              false
            );
          }
        );
      }
    );


    /*
     * =========================================
     * SERVICIO + PAGO
     * =========================================
     */

    describe(
      'elegibilidad',
      () => {


        it(
          'permite completed + paid',
          () => {

            expect(
              canSubmitReview(
                'completed',
                'paid'
              )
            ).toBe(
              true
            );
          }
        );


        it(
          'bloquea completed + pending',
          () => {

            expect(
              canSubmitReview(
                'completed',
                'pending'
              )
            ).toBe(
              false
            );
          }
        );


        it(
          'bloquea in_progress + paid',
          () => {

            expect(
              canSubmitReview(
                'in_progress',
                'paid'
              )
            ).toBe(
              false
            );
          }
        );


        it(
          'bloquea accepted + pending',
          () => {

            expect(
              canSubmitReview(
                'accepted',
                'pending'
              )
            ).toBe(
              false
            );
          }
        );
      }
    );


    /*
     * =========================================
     * REPUTACIÓN
     * =========================================
     */

    describe(
      'reputación',
      () => {


        it(
          'primera evaluación 5 genera promedio 5',
          () => {

            expect(
              calculateUpdatedRating(
                0,
                0,
                5
              )
            ).toEqual({

              averageRating:
                5,

              ratingCount:
                1
            });
          }
        );


        it(
          'promedio 4 con una evaluación + 5 = 4.5',
          () => {

            expect(
              calculateUpdatedRating(
                4,
                1,
                5
              )
            ).toEqual({

              averageRating:
                4.5,

              ratingCount:
                2
            });
          }
        );


        it(
          'recalcula correctamente varias evaluaciones',
          () => {

            expect(
              calculateUpdatedRating(
                4.5,
                2,
                3
              )
            ).toEqual({

              averageRating:
                4,

              ratingCount:
                3
            });
          }
        );


        it(
          'redondea a dos decimales',
          () => {

            expect(
              calculateUpdatedRating(
                4.33,
                3,
                5
              )
                .averageRating
            ).toBe(
              4.5
            );
          }
        );


        it(
          'tolera promedio previo inválido',
          () => {

            expect(
              calculateUpdatedRating(
                null,
                0,
                4
              )
            ).toEqual({

              averageRating:
                4,

              ratingCount:
                1
            });
          }
        );


        it(
          'tolera contador previo inválido',
          () => {

            expect(
              calculateUpdatedRating(
                4,
                -5,
                5
              )
            ).toEqual({

              averageRating:
                5,

              ratingCount:
                1
            });
          }
        );
      }
    );
  }
);