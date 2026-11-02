import {
  describe,
  expect,
  it
} from 'vitest';

import {
  buildChatPreview,
  isValidChatText,
  isValidChatTriggerMessage,
  normalizeChatText,
  resolveChatRecipient
} from '../../src/domain/chat';


describe(
  'ServiGo - Chat',
  () => {


    describe(
      'normalización',
      () => {


        it(
          'elimina espacios exteriores',
          () => {

            expect(
              normalizeChatText(
                '   Hola técnico   '
              )
            ).toBe(
              'Hola técnico'
            );
          }
        );


        it(
          'valor no string queda vacío',
          () => {

            expect(
              normalizeChatText(
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
      'contenido',
      () => {


        it(
          'acepta mensaje normal',
          () => {

            expect(
              isValidChatText(
                'Hola, necesito ayuda.'
              )
            ).toBe(
              true
            );
          }
        );


        it(
          'rechaza vacío',
          () => {

            expect(
              isValidChatText(
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
              isValidChatText(
                '       '
              )
            ).toBe(
              false
            );
          }
        );


        it(
          'acepta exactamente 1000 caracteres',
          () => {

            expect(
              isValidChatText(
                'x'.repeat(
                  1000
                )
              )
            ).toBe(
              true
            );
          }
        );


        it(
          'rechaza 1001 caracteres',
          () => {

            expect(
              isValidChatText(
                'x'.repeat(
                  1001
                )
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
              isValidChatText(
                null
              )
            ).toBe(
              false
            );
          }
        );
      }
    );


    describe(
      'trigger',
      () => {


        it(
          'acepta mensaje completo',
          () => {

            expect(
              isValidChatTriggerMessage(
                'request-1',
                'cliente-1',
                'Hola'
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
              isValidChatTriggerMessage(
                '',
                'cliente-1',
                'Hola'
              )
            ).toBe(
              false
            );
          }
        );


        it(
          'rechaza senderId vacío',
          () => {

            expect(
              isValidChatTriggerMessage(
                'request-1',
                '',
                'Hola'
              )
            ).toBe(
              false
            );
          }
        );


        it(
          'rechaza texto vacío',
          () => {

            expect(
              isValidChatTriggerMessage(
                'request-1',
                'cliente-1',
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
      'destinatario',
      () => {


        it(
          'mensaje cliente se dirige al técnico',
          () => {

            expect(
              resolveChatRecipient(
                'cliente-1',
                'cliente-1',
                'tecnico-1'
              )
            ).toEqual({

              valid:
                true,

              recipientId:
                'tecnico-1',

              pushType:
                'technician_new_message'
            });
          }
        );


        it(
          'mensaje técnico se dirige al cliente',
          () => {

            expect(
              resolveChatRecipient(
                'tecnico-1',
                'cliente-1',
                'tecnico-1'
              )
            ).toEqual({

              valid:
                true,

              recipientId:
                'cliente-1',

              pushType:
                'client_new_message'
            });
          }
        );


        it(
          'usuario ajeno queda bloqueado',
          () => {

            expect(
              resolveChatRecipient(
                'intruso-1',
                'cliente-1',
                'tecnico-1'
              )
            ).toEqual({

              valid:
                false,

              recipientId:
                '',

              pushType:
                null
            });
          }
        );


        it(
          'cliente sin técnico no genera destinatario',
          () => {

            expect(
              resolveChatRecipient(
                'cliente-1',
                'cliente-1',
                ''
              ).valid
            ).toBe(
              false
            );
          }
        );


        it(
          'técnico sin cliente no genera destinatario',
          () => {

            expect(
              resolveChatRecipient(
                'tecnico-1',
                '',
                'tecnico-1'
              ).valid
            ).toBe(
              false
            );
          }
        );


        it(
          'sender vacío queda bloqueado',
          () => {

            expect(
              resolveChatRecipient(
                '',
                'cliente-1',
                'tecnico-1'
              ).valid
            ).toBe(
              false
            );
          }
        );
      }
    );


    describe(
      'preview push',
      () => {


        it(
          'mensaje corto queda intacto',
          () => {

            expect(
              buildChatPreview(
                'Hola'
              )
            ).toBe(
              'Hola'
            );
          }
        );


        it(
          '120 caracteres quedan intactos',
          () => {

            const message =
              'x'.repeat(
                120
              );


            expect(
              buildChatPreview(
                message
              )
            ).toBe(
              message
            );
          }
        );


        it(
          '121 caracteres se truncan',
          () => {

            const result =
              buildChatPreview(
                'x'.repeat(
                  121
                )
              );


            expect(
              result
            ).toBe(
              `${'x'.repeat(
                120
              )}…`
            );
          }
        );


        it(
          'permite longitud personalizada',
          () => {

            expect(
              buildChatPreview(
                '1234567890',
                5
              )
            ).toBe(
              '12345…'
            );
          }
        );
      }
    );
  }
);