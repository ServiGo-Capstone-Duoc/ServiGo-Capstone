/*
 * ============================================================
 * SERVIGO - DOMINIO DE CHAT
 * ============================================================
 */


export type ChatPushType =
  | 'technician_new_message'
  | 'client_new_message';


export interface ChatRecipientResult {

  valid: boolean;

  recipientId: string;

  pushType:
    ChatPushType | null;
}


/*
 * ============================================================
 * TEXTO DEL MENSAJE
 * ============================================================
 */

export function normalizeChatText(
  value:
    unknown
): string {


  return typeof value ===
    'string'
    ? value.trim()
    : '';
}


/*
 * ============================================================
 * VALIDAR CONTENIDO
 * ============================================================
 *
 * Firestore Rules limita los mensajes a 1000 caracteres.
 */

export function isValidChatText(
  value:
    unknown
): boolean {


  const text =
    normalizeChatText(
      value
    );


  return (
    text.length >
      0
    &&
    text.length <=
      1000
  );
}


/*
 * ============================================================
 * VALIDAR MENSAJE PARA TRIGGER
 * ============================================================
 */

export function isValidChatTriggerMessage(
  requestId:
    unknown,
  senderId:
    unknown,
  text:
    unknown
): boolean {


  return (
    typeof requestId ===
      'string'
    &&
    requestId.trim().length >
      0
    &&
    typeof senderId ===
      'string'
    &&
    senderId.trim().length >
      0
    &&
    isValidChatText(
      text
    )
  );
}


/*
 * ============================================================
 * DETERMINAR DESTINATARIO
 * ============================================================
 */

export function resolveChatRecipient(
  senderId:
    unknown,
  clientId:
    unknown,
  technicianId:
    unknown
): ChatRecipientResult {


  const sender =
    typeof senderId ===
      'string'
      ? senderId.trim()
      : '';


  const client =
    typeof clientId ===
      'string'
      ? clientId.trim()
      : '';


  const technician =
    typeof technicianId ===
      'string'
      ? technicianId.trim()
      : '';


  /*
   * Cliente -> Técnico
   */

  if (
    sender
    &&
    sender ===
      client
  ) {

    if (
      !technician
    ) {

      return {
        valid:
          false,

        recipientId:
          '',

        pushType:
          null
      };
    }


    return {
      valid:
        true,

      recipientId:
        technician,

      pushType:
        'technician_new_message'
    };
  }


  /*
   * Técnico -> Cliente
   */

  if (
    sender
    &&
    sender ===
      technician
  ) {

    if (
      !client
    ) {

      return {
        valid:
          false,

        recipientId:
          '',

        pushType:
          null
      };
    }


    return {
      valid:
        true,

      recipientId:
        client,

      pushType:
        'client_new_message'
    };
  }


  /*
   * Usuario ajeno.
   */

  return {
    valid:
      false,

    recipientId:
      '',

    pushType:
      null
  };
}


/*
 * ============================================================
 * PREVIEW PUSH
 * ============================================================
 */

export function buildChatPreview(
  value:
    unknown,
  maxLength =
    120
): string {


  const text =
    normalizeChatText(
      value
    );


  if (
    text.length <=
    maxLength
  ) {

    return text;
  }


  return `${text.substring(
    0,
    maxLength
  )}…`;
}