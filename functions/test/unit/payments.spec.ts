import {
  describe,
  expect,
  it
} from 'vitest';

import {
  getPaymentStatusFromWebpay,
  isValidBuyOrder,
  isValidPaymentAmount,
  isWebpayApproved,
  validateWebpayCommit
} from '../../src/domain/payments';


describe(
  'ServiGo - Payments / Webpay',
  () => {


    /*
     * =========================================
     * MONTO
     * =========================================
     */

    describe(
      'monto',
      () => {


        it(
          'acepta monto positivo',
          () => {

            expect(
              isValidPaymentAmount(
                60060
              )
            ).toBe(
              true
            );
          }
        );


        it(
          'acepta monto decimal positivo',
          () => {

            expect(
              isValidPaymentAmount(
                1000.5
              )
            ).toBe(
              true
            );
          }
        );


        it(
          'rechaza cero',
          () => {

            expect(
              isValidPaymentAmount(
                0
              )
            ).toBe(
              false
            );
          }
        );


        it(
          'rechaza monto negativo',
          () => {

            expect(
              isValidPaymentAmount(
                -1000
              )
            ).toBe(
              false
            );
          }
        );


        it(
          'rechaza NaN',
          () => {

            expect(
              isValidPaymentAmount(
                Number.NaN
              )
            ).toBe(
              false
            );
          }
        );


        it(
          'rechaza Infinity',
          () => {

            expect(
              isValidPaymentAmount(
                Number.POSITIVE_INFINITY
              )
            ).toBe(
              false
            );
          }
        );


        it(
          'rechaza monto string',
          () => {

            expect(
              isValidPaymentAmount(
                '60060'
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
     * BUY ORDER
     * =========================================
     */

    describe(
      'buyOrder',
      () => {


        it(
          'acepta buyOrder válido',
          () => {

            expect(
              isValidBuyOrder(
                'SG793318801034yJucRJOe'
              )
            ).toBe(
              true
            );
          }
        );


        it(
          'rechaza string vacío',
          () => {

            expect(
              isValidBuyOrder(
                ''
              )
            ).toBe(
              false
            );
          }
        );


        it(
          'rechaza solo espacios',
          () => {

            expect(
              isValidBuyOrder(
                '     '
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
              isValidBuyOrder(
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
     * RESPONSE CODE
     * =========================================
     */

    describe(
      'responseCode',
      () => {


        it(
          '0 significa aprobado',
          () => {

            expect(
              isWebpayApproved(
                0
              )
            ).toBe(
              true
            );
          }
        );


        it.each([
          -1,
          -2,
          -3,
          1,
          10
        ])(
          '%s significa no aprobado',
          responseCode => {

            expect(
              isWebpayApproved(
                responseCode
              )
            ).toBe(
              false
            );
          }
        );


        it(
          'string 0 no se considera aprobado',
          () => {

            expect(
              isWebpayApproved(
                '0'
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
     * COMMIT
     * =========================================
     */

    describe(
      'validación COMMIT',
      () => {


        const expectedBuyOrder =
          'SG793318801034yJucRJOe';


        const expectedAmount =
          60060;


        it(
          'acepta transacción aprobada consistente',
          () => {

            expect(
              validateWebpayCommit(
                expectedBuyOrder,
                expectedAmount,
                {

                  responseCode:
                    0,

                  buyOrder:
                    expectedBuyOrder,

                  amount:
                    60060
                }
              )
            ).toEqual({

              valid:
                true,

              approved:
                true,

              error:
                null
            });
          }
        );


        it(
          'acepta resultado consistente pero rechazado',
          () => {

            expect(
              validateWebpayCommit(
                expectedBuyOrder,
                expectedAmount,
                {

                  responseCode:
                    -1,

                  buyOrder:
                    expectedBuyOrder,

                  amount:
                    expectedAmount
                }
              )
            ).toEqual({

              valid:
                true,

              approved:
                false,

              error:
                null
            });
          }
        );


        it(
          'rechaza buyOrder alterado',
          () => {

            expect(
              validateWebpayCommit(
                expectedBuyOrder,
                expectedAmount,
                {

                  responseCode:
                    0,

                  buyOrder:
                    'ORDEN-FRAUDULENTA',

                  amount:
                    expectedAmount
                }
              )
                .error
            ).toBe(
              'buy_order_mismatch'
            );
          }
        );


        it(
          'rechaza monto alterado',
          () => {

            const result =
              validateWebpayCommit(
                expectedBuyOrder,
                expectedAmount,
                {

                  responseCode:
                    0,

                  buyOrder:
                    expectedBuyOrder,

                  amount:
                    100
                }
              );


            expect(
              result.valid
            ).toBe(
              false
            );


            expect(
              result.approved
            ).toBe(
              false
            );


            expect(
              result.error
            ).toBe(
              'amount_mismatch'
            );
          }
        );


        it(
          'acepta monto numérico devuelto como string',
          () => {

            const result =
              validateWebpayCommit(
                expectedBuyOrder,
                expectedAmount,
                {

                  responseCode:
                    0,

                  buyOrder:
                    expectedBuyOrder,

                  amount:
                    '60060'
                }
              );


            expect(
              result.valid
            ).toBe(
              true
            );
          }
        );


        it(
          'rechaza expectedAmount inválido',
          () => {

            expect(
              validateWebpayCommit(
                expectedBuyOrder,
                0,
                {

                  responseCode:
                    0,

                  buyOrder:
                    expectedBuyOrder,

                  amount:
                    0
                }
              )
                .error
            ).toBe(
              'invalid_expected_amount'
            );
          }
        );


        it(
          'rechaza expectedBuyOrder vacío',
          () => {

            expect(
              validateWebpayCommit(
                '',
                expectedAmount,
                {

                  responseCode:
                    0,

                  buyOrder:
                    '',

                  amount:
                    expectedAmount
                }
              )
                .error
            ).toBe(
              'invalid_expected_buy_order'
            );
          }
        );
      }
    );


    /*
     * =========================================
     * ESTADO PAYMENT
     * =========================================
     */

    describe(
      'estado final',
      () => {


        it(
          'responseCode 0 -> approved',
          () => {

            expect(
              getPaymentStatusFromWebpay(
                0
              )
            ).toBe(
              'approved'
            );
          }
        );


        it(
          'responseCode distinto de 0 -> rejected',
          () => {

            expect(
              getPaymentStatusFromWebpay(
                -1
              )
            ).toBe(
              'rejected'
            );
          }
        );
      }
    );
  }
);