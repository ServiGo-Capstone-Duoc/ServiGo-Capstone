import {
  Injectable
} from '@angular/core';

import {
  collection,
  DocumentData,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc
} from 'firebase/firestore';

import {
  firestore
} from '../firebase/firebase';

import {
  ChatMessage
} from '../models/chat-message.model';

import {
  ServiceRequest
} from '../models/service-request.model';


@Injectable({
  providedIn:
    'root'
})
export class ChatService {


  /*
   * =========================================
   * SOLICITUD / CONVERSACIÓN
   * =========================================
   *
   * El serviceRequest actúa como cabecera
   * de la conversación.
   */

  async getConversationRequest(
    requestId: string,
    userId: string
  ): Promise<ServiceRequest | null> {


    const requestRef =
      doc(
        firestore,
        'serviceRequests',
        requestId
      );


    const snapshot =
      await getDoc(
        requestRef
      );


    if (
      !snapshot.exists()
    ) {

      return null;
    }


    const data =
      snapshot.data();


    const clientId =
      data['clientId']
      ?? '';


    const technicianId =
      data['assignedTechnicianId']
      ?? null;


    /*
     * Solamente participantes.
     */

    if (
      userId !== clientId
      &&
      userId !== technicianId
    ) {

      return null;
    }


    /*
     * Chat disponible una vez contratado.
     */

    const status =
      data['status']
      ?? 'published';


    if (
  status !== 'accepted'
  &&
  status !== 'en_route'
  &&
  status !== 'arrived'
  &&
  status !== 'in_progress'
  &&
  status !== 'completed'
  &&
  status !== 'cancelled'
) {

  return null;
}


    return this.mapRequest(
      data
    );
  }


  /*
   * =========================================
   * ESCUCHAR MENSAJES
   * =========================================
   *
   * onSnapshot permite chat en tiempo real.
   */

  listenToMessages(
    requestId: string,
    callback:
      (
        messages:
          ChatMessage[]
      ) => void,
    onError?:
      (
        error:
          unknown
      ) => void
  ): () => void {


    const messagesQuery =
      query(
        collection(
          firestore,
          'serviceRequests',
          requestId,
          'messages'
        ),

        orderBy(
          'createdAt',
          'asc'
        )
      );


    return onSnapshot(
      messagesQuery,

      snapshot => {

        const messages =
          snapshot.docs.map(
            messageSnapshot =>
              this.mapMessage(
                requestId,
                messageSnapshot.id,
                messageSnapshot.data()
              )
          );


        callback(
          messages
        );
      },

      error => {

        console.error(
          '[ServiGo Chat] Error escuchando mensajes:',
          error
        );


        if (
          onError
        ) {

          onError(
            error
          );
        }
      }
    );
  }


  /*
   * =========================================
   * ENVIAR MENSAJE
   * =========================================
   */

  async sendMessage(
    requestId: string,
    senderId: string,
    senderName: string,
    text: string
  ): Promise<void> {


    const cleanText =
      text.trim();


    if (
      !cleanText
    ) {

      throw new Error(
        'empty-message'
      );
    }


    if (
      cleanText.length > 1000
    ) {

      throw new Error(
        'message-too-long'
      );
    }


    /*
     * Validamos nuevamente que quien envía
     * participa de la conversación.
     */

    const request =
      await this.getConversationRequest(
        requestId,
        senderId
      );


    if (
      !request
    ) {

      throw new Error(
        'chat-not-available'
      );
    }


    const messageRef =
      doc(
        collection(
          firestore,
          'serviceRequests',
          requestId,
          'messages'
        )
      );


    await setDoc(
      messageRef,
      {

        id:
          messageRef.id,

        requestId,

        senderId,

        senderName:
          senderName.trim()
          ||
          'Usuario ServiGo',

        text:
          cleanText,

        createdAt:
          serverTimestamp()
      }
    );
  }


  /*
   * =========================================
   * MAPEO MENSAJE
   * =========================================
   */

  private mapMessage(
    requestId: string,
    id: string,
    data: DocumentData
  ): ChatMessage {


    return {

      id,

      requestId,

      senderId:
        data['senderId']
        ?? '',

      senderName:
        data['senderName']
        ?? 'Usuario ServiGo',

      text:
        data['text']
        ?? '',

      createdAt:
        this.toDate(
          data['createdAt']
        )
    };
  }


  /*
   * =========================================
   * MAPEO SOLICITUD
   * =========================================
   */

  private mapRequest(
    data: DocumentData
  ): ServiceRequest {


    return {

      id:
        data['id']
        ?? '',

      clientId:
        data['clientId']
        ?? '',

      clientName:
        data['clientName']
        ?? '',

      category:
        data['category']
        ?? '',

      description:
        data['description']
        ?? '',

      address:
        data['address']
        ?? '',

      commune:
        data['commune']
        ?? '',

      latitude:
        typeof data['latitude'] ===
        'number'
          ? data['latitude']
          : null,

      longitude:
        typeof data['longitude'] ===
        'number'
          ? data['longitude']
          : null,

      preferredDate:
        this.toDate(
          data['preferredDate']
        ),

      timeSlot:
        data['timeSlot']
        ?? '',

      urgency:
        data['urgency']
        ?? 'normal',

      photoUrls:
        Array.isArray(
          data['photoUrls']
        )
          ? data['photoUrls']
          : [],

      status:
        data['status']
        ?? 'published',

      assignedTechnicianId:
  data['assignedTechnicianId']
  ?? null,


acceptedQuoteId:
  data['acceptedQuoteId']
  ?? null,


/*
 * =====================================
 * ESTADO ECONÓMICO
 * =====================================
 *
 * Compatibilidad con solicitudes
 * anteriores al módulo de pagos.
 */

paymentStatus:
  data['paymentStatus'] ===
    'paid'
      ? 'paid'
      : 'pending',


paymentId:
  typeof data['paymentId'] ===
    'string'
      ? data['paymentId']
      : null,

      createdAt:
        this.toDate(
          data['createdAt']
        ),

      updatedAt:
        this.toDate(
          data['updatedAt']
        )
    };
  }


  /*
   * =========================================
   * FECHA
   * =========================================
   */

  private toDate(
    value: any
  ): Date | null {


    if (
      value
      &&
      typeof value.toDate ===
      'function'
    ) {

      return value.toDate();
    }


    if (
      value instanceof Date
    ) {

      return value;
    }


    return null;
  }
}