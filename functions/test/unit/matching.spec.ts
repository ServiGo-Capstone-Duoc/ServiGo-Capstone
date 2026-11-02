import {
  describe,
  expect,
  it
} from 'vitest';

import {
  calculateMatchScore,
  calculateTechnicianMatch,
  hasMatchingCommune,
  hasMatchingSpecialty,
  normalizeMatchingText
} from '../../src/domain/matching';


describe(
  'ServiGo - Matching',
  () => {


    describe(
      'normalización',
      () => {


        it(
          'convierte a minúsculas',
          () => {

            expect(
              normalizeMatchingText(
                'ELECTRICIDAD'
              )
            ).toBe(
              'electricidad'
            );
          }
        );


        it(
          'elimina espacios exteriores',
          () => {

            expect(
              normalizeMatchingText(
                '   Electricidad   '
              )
            ).toBe(
              'electricidad'
            );
          }
        );


        it(
          'elimina tildes',
          () => {

            expect(
              normalizeMatchingText(
                'Gasfitería'
              )
            ).toBe(
              'gasfiteria'
            );
          }
        );


        it(
          'normaliza Ñuñoa',
          () => {

            expect(
              normalizeMatchingText(
                'Ñuñoa'
              )
            ).toBe(
              'nunoa'
            );
          }
        );


        it(
          'retorna vacío para null',
          () => {

            expect(
              normalizeMatchingText(
                null
              )
            ).toBe(
              ''
            );
          }
        );
      }
    );


    describe(
      'especialidad',
      () => {


        it(
          'encuentra especialidad exacta',
          () => {

            expect(
              hasMatchingSpecialty(
                [
                  'Electricidad',
                  'Gasfitería'
                ],
                'Electricidad'
              )
            ).toBe(
              true
            );
          }
        );


        it(
          'ignora mayúsculas',
          () => {

            expect(
              hasMatchingSpecialty(
                [
                  'ELECTRICIDAD'
                ],
                'electricidad'
              )
            ).toBe(
              true
            );
          }
        );


        it(
          'ignora tildes',
          () => {

            expect(
              hasMatchingSpecialty(
                [
                  'Gasfitería'
                ],
                'Gasfiteria'
              )
            ).toBe(
              true
            );
          }
        );


        it(
          'rechaza especialidad distinta',
          () => {

            expect(
              hasMatchingSpecialty(
                [
                  'Electricidad'
                ],
                'Cerrajería'
              )
            ).toBe(
              false
            );
          }
        );


        it(
          'rechaza specialties inválido',
          () => {

            expect(
              hasMatchingSpecialty(
                null,
                'Electricidad'
              )
            ).toBe(
              false
            );
          }
        );
      }
    );


    describe(
      'comuna',
      () => {


        it(
          'acepta misma comuna',
          () => {

            expect(
              hasMatchingCommune(
                'Puente Alto',
                'Puente Alto'
              )
            ).toBe(
              true
            );
          }
        );


        it(
          'ignora mayúsculas',
          () => {

            expect(
              hasMatchingCommune(
                'PUENTE ALTO',
                'puente alto'
              )
            ).toBe(
              true
            );
          }
        );


        it(
          'ignora tildes',
          () => {

            expect(
              hasMatchingCommune(
                'Ñuñoa',
                'Nunoa'
              )
            ).toBe(
              true
            );
          }
        );


        it(
          'rechaza comunas diferentes',
          () => {

            expect(
              hasMatchingCommune(
                'Maipú',
                'Providencia'
              )
            ).toBe(
              false
            );
          }
        );
      }
    );


    describe(
      'score',
      () => {


        it(
          'normal = 80',
          () => {

            expect(
              calculateMatchScore(
                'normal'
              )
            ).toBe(
              80
            );
          }
        );


        it(
          'soon = 85',
          () => {

            expect(
              calculateMatchScore(
                'soon'
              )
            ).toBe(
              85
            );
          }
        );


        it(
          'urgent = 95',
          () => {

            expect(
              calculateMatchScore(
                'urgent'
              )
            ).toBe(
              95
            );
          }
        );
      }
    );


    describe(
      'matching completo',
      () => {


        it(
          'genera match normal',
          () => {

            const result =
              calculateTechnicianMatch(
                [
                  'Electricidad'
                ],
                'Puente Alto',
                'Electricidad',
                'Puente Alto',
                'normal'
              );


            expect(
              result.matches
            ).toBe(
              true
            );


            expect(
              result.score
            ).toBe(
              80
            );


            expect(
              result.reasons
            ).toEqual([
              'Especialidad compatible',
              'Misma comuna'
            ]);
          }
        );


        it(
          'genera match urgente 95',
          () => {

            const result =
              calculateTechnicianMatch(
                [
                  'Electricidad'
                ],
                'Puente Alto',
                'electricidad',
                'PUENTE ALTO',
                'urgent'
              );


            expect(
              result
            ).toEqual({

              matches:
                true,

              score:
                95,

              reasons: [
                'Especialidad compatible',
                'Misma comuna',
                'Solicitud urgente'
              ]
            });
          }
        );


        it(
          'genera match soon 85',
          () => {

            const result =
              calculateTechnicianMatch(
                [
                  'Gasfitería'
                ],
                'Ñuñoa',
                'Gasfiteria',
                'Nunoa',
                'soon'
              );


            expect(
              result.score
            ).toBe(
              85
            );


            expect(
              result.reasons
            ).toContain(
              'Solicitud prioritaria'
            );
          }
        );


        it(
          'no genera match por especialidad',
          () => {

            const result =
              calculateTechnicianMatch(
                [
                  'Electricidad'
                ],
                'Puente Alto',
                'Cerrajería',
                'Puente Alto',
                'urgent'
              );


            expect(
              result
            ).toEqual({

              matches:
                false,

              score:
                0,

              reasons:
                []
            });
          }
        );


        it(
          'no genera match por comuna',
          () => {

            const result =
              calculateTechnicianMatch(
                [
                  'Electricidad'
                ],
                'Puente Alto',
                'Electricidad',
                'Providencia',
                'urgent'
              );


            expect(
              result.matches
            ).toBe(
              false
            );


            expect(
              result.score
            ).toBe(
              0
            );
          }
        );
      }
    );
  }
);