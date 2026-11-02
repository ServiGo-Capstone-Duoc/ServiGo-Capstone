import {
  describe,
  expect,
  it
} from 'vitest';

import {
  canTransitionJob,
  getNextJobStatus,
  isValidJobAction
} from '../../src/domain/job-status';


describe(
  'ServiGo - Job Status',
  () => {


    /*
     * =========================================
     * ACCIONES
     * =========================================
     */

    describe(
      'isValidJobAction',
      () => {


        it(
          'acepta start_trip',
          () => {

            expect(
              isValidJobAction(
                'start_trip'
              )
            ).toBe(
              true
            );
          }
        );


        it(
          'acepta arrive',
          () => {

            expect(
              isValidJobAction(
                'arrive'
              )
            ).toBe(
              true
            );
          }
        );


        it(
          'acepta start',
          () => {

            expect(
              isValidJobAction(
                'start'
              )
            ).toBe(
              true
            );
          }
        );


        it(
          'acepta complete',
          () => {

            expect(
              isValidJobAction(
                'complete'
              )
            ).toBe(
              true
            );
          }
        );


        it(
          'rechaza acción desconocida',
          () => {

            expect(
              isValidJobAction(
                'cancel'
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
     * TRANSICIONES CORRECTAS
     * =========================================
     */

    describe(
      'transiciones válidas',
      () => {


        it(
          'accepted -> en_route',
          () => {

            expect(
              getNextJobStatus(
                'accepted',
                'start_trip'
              )
            ).toBe(
              'en_route'
            );
          }
        );


        it(
          'en_route -> arrived',
          () => {

            expect(
              getNextJobStatus(
                'en_route',
                'arrive'
              )
            ).toBe(
              'arrived'
            );
          }
        );


        it(
          'arrived -> in_progress',
          () => {

            expect(
              getNextJobStatus(
                'arrived',
                'start'
              )
            ).toBe(
              'in_progress'
            );
          }
        );


        it(
          'in_progress -> completed',
          () => {

            expect(
              getNextJobStatus(
                'in_progress',
                'complete'
              )
            ).toBe(
              'completed'
            );
          }
        );
      }
    );


    /*
     * =========================================
     * TRANSICIONES INVÁLIDAS
     * =========================================
     */

    describe(
      'transiciones inválidas',
      () => {


        it(
          'no permite accepted -> start',
          () => {

            expect(
              canTransitionJob(
                'accepted',
                'start'
              )
            ).toBe(
              false
            );
          }
        );


        it(
          'no permite accepted -> complete',
          () => {

            expect(
              canTransitionJob(
                'accepted',
                'complete'
              )
            ).toBe(
              false
            );
          }
        );


        it(
          'no permite en_route -> complete',
          () => {

            expect(
              canTransitionJob(
                'en_route',
                'complete'
              )
            ).toBe(
              false
            );
          }
        );


        it(
          'no permite arrived -> start_trip',
          () => {

            expect(
              canTransitionJob(
                'arrived',
                'start_trip'
              )
            ).toBe(
              false
            );
          }
        );


        it(
          'no permite completed -> complete',
          () => {

            expect(
              canTransitionJob(
                'completed',
                'complete'
              )
            ).toBe(
              false
            );
          }
        );


        it(
          'devuelve null para transición inválida',
          () => {

            expect(
              getNextJobStatus(
                'accepted',
                'complete'
              )
            ).toBeNull();
          }
        );
      }
    );
  }
);