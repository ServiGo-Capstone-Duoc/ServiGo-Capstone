import {

  onDocumentCreated

} from 'firebase-functions/v2/firestore';



import {

  logger

} from 'firebase-functions';


import {

  HttpsError,

  onCall

} from 'firebase-functions/v2/https';



import {

  initializeApp

} from 'firebase-admin/app';



import {

  FieldValue,

  getFirestore

} from 'firebase-admin/firestore';



import {

  getMessaging

} from 'firebase-admin/messaging';


import {
  WebpayPlus
} from 'transbank-sdk';


initializeApp();





const db =

  getFirestore();





const messaging =

  getMessaging();





/*

 * =========================================

 * ENTORNO SERVIGO

 * =========================================

 */



const servigoEnvironment =

  process.env['SERVIGO_ENV']

  ?? 'development';





const pushEnabled =

  process.env['PUSH_ENABLED']

  === 'true';





logger.info(

  'Configuración ServiGo Functions',

  {

    environment:

      servigoEnvironment,



    pushEnabled

  }

);





/*

 * =========================================

 * NORMALIZAR TEXTO

 * =========================================

 */



function normalizeText(

  value: unknown

): string {





  if (

    typeof value !==

    'string'

  ) {



    return '';

  }





  return value

    .normalize(

      'NFD'

    )

    .replace(

      /[\u0300-\u036f]/g,

      ''

    )

    .trim()

    .toLowerCase();

}





/*

 * =========================================

 * ID DETERMINISTA DE OPORTUNIDAD

 * =========================================

 */



function buildOpportunityId(

  technicianId: string,

  requestId: string

): string {





  return (

    `${technicianId}_${requestId}`

  );

}


/*
 * ============================================================
 * PUSH SERVIGO
 * ============================================================
 *
 * Punto central de envío de notificaciones.
 *
 * En desarrollo PUSH_ENABLED puede permanecer false.
 * En ese caso registramos el evento pero no enviamos FCM.
 */

interface ServiGoPushData {

  requestId: string;

type:
  | 'technician_opportunity'
  | 'client_new_quote'
  | 'technician_quote_accepted'
  | 'client_technician_en_route'
  | 'client_technician_arrived'
  | 'client_job_started'
  | 'client_job_completed'
  | 'client_service_cancelled'
  | 'technician_service_cancelled'
  | 'client_new_message'
  | 'technician_new_message';

  opportunityId?: string;

  quoteId?: string;

  category?: string;

  commune?: string;

  matchScore?: string;
}


async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  data: ServiGoPushData
): Promise<boolean> {


  if (
    !userId
  ) {

    logger.warn(
      'Push omitido: userId vacío.',
      {
        type:
          data.type,

        requestId:
          data.requestId
      }
    );

    return false;
  }


  /*
   * =========================================
   * CONTROL POR ENTORNO
   * =========================================
   */

  if (
    !pushEnabled
  ) {

    logger.info(
      'Push preparado pero omitido por configuración.',
      {

        environment:
          servigoEnvironment,

        userId,

        type:
          data.type,

        requestId:
          data.requestId,

        title,

        body
      }
    );

    return false;
  }


  /*
   * =========================================
   * TOKEN ANDROID
   * =========================================
   */

  const tokenId =
    `${userId}_android`;


  const tokenSnapshot =
    await db
      .collection(
        'deviceTokens'
      )
      .doc(
        tokenId
      )
      .get();


  if (
    !tokenSnapshot.exists
  ) {

    logger.info(
      'Push omitido: usuario sin token Android.',
      {

        userId,

        type:
          data.type,

        requestId:
          data.requestId
      }
    );

    return false;
  }


  const tokenData =
    tokenSnapshot.data()
    ?? {};


  const token =
    tokenData[
      'token'
    ];


  const active =
    tokenData[
      'active'
    ];


  if (
    typeof token !==
      'string'
    ||
    !token
    ||
    active !==
      true
  ) {

    logger.info(
      'Push omitido: token inválido o inactivo.',
      {

        userId,

        type:
          data.type,

        requestId:
          data.requestId
      }
    );

    return false;
  }


  /*
   * =========================================
   * PAYLOAD
   * =========================================
   *
   * FCM data exige valores string.
   */

  const pushData:
    Record<string, string> = {

      requestId:
        data.requestId,

      type:
        data.type
    };


  if (
    data.opportunityId
  ) {

    pushData[
      'opportunityId'
    ] =
      data.opportunityId;
  }


  if (
    data.quoteId
  ) {

    pushData[
      'quoteId'
    ] =
      data.quoteId;
  }


  if (
    data.category
  ) {

    pushData[
      'category'
    ] =
      data.category;
  }


  if (
    data.commune
  ) {

    pushData[
      'commune'
    ] =
      data.commune;
  }


  if (
    data.matchScore
  ) {

    pushData[
      'matchScore'
    ] =
      data.matchScore;
  }


  /*
   * =========================================
   * ENVIAR
   * =========================================
   */

  try {

    await messaging.send({

      token,

      notification: {

        title,

        body
      },

      data:
        pushData,

      android: {

        priority:
          'high',

        notification: {

          channelId:
            'servigo_general',

          sound:
            'default'
        }
      }
    });


    logger.info(
      'Push enviado correctamente.',
      {

        userId,

        type:
          data.type,

        requestId:
          data.requestId
      }
    );


    return true;


  } catch (error) {

    logger.error(
      'Error enviando push.',
      {

        userId,

        type:
          data.type,

        requestId:
          data.requestId,

        error
      }
    );


    return false;
  }
}


/*

 * ============================================================

 * SERVICE REQUEST CREADA

 * ============================================================

 *

 * Flujo:

 *

 * serviceRequests/{requestId}

 *          ↓

 * buscar técnicos aprobados

 *          ↓

 * validar especialidad

 *          ↓

 * validar comuna

 *          ↓

 * calcular match

 *          ↓

 * technicianOpportunities

 *          ↓

 * FCM si corresponde

 */



export const onServiceRequestCreated =

  onDocumentCreated(

    {

      document:

        'serviceRequests/{requestId}',



      region:

        'southamerica-west1'

    },



    async event => {





      const snapshot =

        event.data;





      if (

        !snapshot

      ) {



        logger.warn(

          'Solicitud creada sin snapshot.'

        );



        return;

      }





      const request =

        snapshot.data();





      const requestId =

        event.params.requestId;





      /*

       * =====================================

       * VALIDAR ESTADO

       * =====================================

       */



      if (

        request['status'] !==

        'published'

      ) {



        logger.info(

          'Solicitud ignorada por status.',

          {

            requestId,



            status:

              request['status']

          }

        );



        return;

      }





      /*

       * =====================================

       * DATOS DE SOLICITUD

       * =====================================

       */



      const clientId =

        request['clientId']

        ?? '';





      const category =

        request['category']

        ?? '';





      const commune =

        request['commune']

        ?? '';





      const urgency =

        request['urgency']

        ?? 'normal';





      const normalizedCategory =

        normalizeText(

          category

        );





      const normalizedCommune =

        normalizeText(

          commune

        );





      logger.info(

        'Procesando nueva solicitud.',

        {

          requestId,

          category,

          commune,

          urgency

        }

      );





      /*

       * =====================================

       * TÉCNICOS APROBADOS

       * =====================================

       */



      const applicationsSnapshot =

        await db

          .collection(

            'technicianApplications'

          )

          .where(

            'status',

            '==',

            'approved'

          )

          .get();





      if (

        applicationsSnapshot.empty

      ) {



        logger.info(

          'No existen técnicos aprobados.'

        );



        return;

      }





      let matchesCreated =

        0;





      let pushesSent =

        0;





      /*

       * =====================================

       * MATCHING

       * =====================================

       */



      for (

        const applicationDoc

        of applicationsSnapshot.docs

      ) {





        const application =

          applicationDoc.data();





        const technicianId =

          application['userId']

          ?? '';





        /*

         * Técnico inválido o cliente

         * cotizando su propia solicitud.

         */



        if (

          !technicianId

          ||

          technicianId ===

            clientId

        ) {



          continue;

        }





        /*

         * ===================================

         * ESPECIALIDADES

         * ===================================

         */



        const specialties =

          Array.isArray(

            application[

              'specialties'

            ]

          )

            ? application[

              'specialties'

            ]

            : [];





        const technicianSpecialties =

          specialties.map(

            normalizeText

          );





        if (

          !technicianSpecialties

            .includes(

              normalizedCategory

            )

        ) {



          continue;

        }





        /*

         * ===================================

         * COMUNA

         * ===================================

         */



        const technicianCommune =

          normalizeText(

            application[

              'baseCommune'

            ]

          );





        if (

          technicianCommune !==

          normalizedCommune

        ) {



          continue;

        }





        /*

         * ===================================

         * SCORE

         * ===================================

         *

         * Base:

         *

         * + especialidad

         * + misma comuna

         *

         * = 80

         */



        let matchScore =

          80;





        const matchReasons:

          string[] = [

            'Especialidad compatible',

            'Misma comuna'

          ];





        if (

          urgency ===

          'urgent'

        ) {



          matchScore +=

            15;





          matchReasons.push(

            'Solicitud urgente'

          );





        } else if (

          urgency ===

          'soon'

        ) {



          matchScore +=

            5;





          matchReasons.push(

            'Solicitud prioritaria'

          );

        }





        /*

         * ===================================

         * PERFIL DEL TÉCNICO

         * ===================================

         */



        const userSnapshot =

          await db

            .collection(

              'users'

            )

            .doc(

              technicianId

            )

            .get();





        if (

          !userSnapshot.exists

        ) {



          continue;

        }





        const user =

          userSnapshot.data()

          ?? {};





        const technicianRating =

          typeof user[

            'averageRating'

          ] ===

          'number'

            ? user[

              'averageRating'

            ]

            : null;





        const technicianRatingCount =

          typeof user[

            'ratingCount'

          ] ===

          'number'

            ? user[

              'ratingCount'

            ]

            : 0;





        /*

         * ===================================

         * ELEGIBILIDAD PUSH

         * ===================================

         *

         * Técnico nuevo:

         * ratingCount === 0

         *

         * Técnico con historial:

         * rating >= 4

         */



        const eligibleForPush =

          technicianRatingCount ===

            0

          ||

          (

            technicianRating !==

              null

            &&

            technicianRating >=

              4

          );





        const notificationPriority =

          eligibleForPush

            ? 'priority'

            : 'standard';





        /*

         * ===================================

         * ID OPORTUNIDAD

         * ===================================

         */



        const opportunityId =

          buildOpportunityId(

            technicianId,

            requestId

          );





        const opportunityRef =

          db

            .collection(

              'technicianOpportunities'

            )

            .doc(

              opportunityId

            );





        /*

         * ===================================

         * EVITAR DUPLICADOS

         * ===================================

         */



        const existingOpportunity =

          await opportunityRef

            .get();





        if (

          existingOpportunity.exists

        ) {



          logger.info(

            'Oportunidad ya existente.',

            {

              opportunityId

            }

          );



          continue;

        }





        /*

         * ===================================

         * CREAR OPORTUNIDAD

         * ===================================

         */



        await opportunityRef

          .set({



            id:

              opportunityId,



            technicianId,



            requestId,



            clientId,



            category,



            commune,



            matchScore,



            matchReasons,



            status:

              'available',



            notificationPriority,



            eligibleForPush,



            technicianRating,



            technicianRatingCount,



            createdAt:

              FieldValue

                .serverTimestamp(),



            updatedAt:

              FieldValue

                .serverTimestamp(),



            notifiedAt:

              null,



            viewedAt:

              null

          });





        matchesCreated++;





        /*

         * ===================================

         * NO PUSH

         * ===================================

         */



        if (

          !eligibleForPush

        ) {



          continue;

        }





        /*

         * =====================================

         * CONTROL DE PUSH POR ENTORNO

         * =====================================

         *

         * DEV / TEST:

         *

         * creamos oportunidad,

         * pero podemos desactivar FCM real.

         */



        if (

          !pushEnabled

        ) {



          logger.info(

            'Push omitido por configuración.',

            {

              environment:

                servigoEnvironment,



              technicianId,



              requestId,



              opportunityId

            }

          );



          continue;

        }





        /*

         * ===================================

         * TOKEN ANDROID

         * ===================================

         */



        const tokenId =

          `${technicianId}_android`;





        const tokenSnapshot =

          await db

            .collection(

              'deviceTokens'

            )

            .doc(

              tokenId

            )

            .get();





        if (

          !tokenSnapshot.exists

        ) {



          logger.info(

            'Técnico elegible sin token.',

            {

              technicianId

            }

          );



          continue;

        }





        const tokenData =

          tokenSnapshot.data()

          ?? {};





        const token =

          tokenData[

            'token'

          ];





        const active =

          tokenData[

            'active'

          ];





        if (

          typeof token !==

            'string'

          ||

          !token

          ||

          active !==

            true

        ) {



          continue;

        }





        /*

         * ===================================

         * PUSH FCM

         * ===================================

         */



        try {



          await messaging.send({



            token,



            notification: {



              title:

                'Nueva oportunidad cerca de ti',



              body:

                `${category} · ${commune} · ${matchScore}% compatible`

            },



            data: {



              requestId,



              opportunityId,



              category,



              commune,



              matchScore:

                String(

                  matchScore

                ),



              type:

                'technician_opportunity'

            },



            android: {



              priority:

                'high',



              notification: {



                channelId:

                  'servigo_opportunities',



                sound:

                  'default'

              }

            }

          });





          /*

           * Registrar momento

           * de notificación.

           */



          await opportunityRef

            .update({



              notifiedAt:

                FieldValue

                  .serverTimestamp(),



              updatedAt:

                FieldValue

                  .serverTimestamp()

            });





          pushesSent++;





          logger.info(

            'Push enviado.',

            {

              technicianId,

              requestId,

              opportunityId

            }

          );





        } catch (error) {



          logger.error(

            'Error enviando push.',

            {

              technicianId,

              requestId,

              error

            }

          );

        }

      }





      /*

       * =====================================

       * RESULTADO MATCHING

       * =====================================

       */



      logger.info(

        'Matching finalizado.',

        {

          requestId,

          matchesCreated,

          pushesSent

        }

      );

    }

  );





/*

 * ============================================================

 * QUOTE CREADA

 * ============================================================

 *

 * Esta función se ejecuta cada vez que

 * aparece:

 *

 * quotes/{quoteId}

 *

 * Flujo:

 *

 * técnico envía presupuesto

 *        ↓

 * quote status = sent

 *        ↓

 * validar solicitud

 *        ↓

 * validar oportunidad

 *        ↓

 * available/viewed -> quoted

 *

 * La modificación se hace mediante

 * Admin SDK.

 *

 * El cliente Angular NO tiene permiso

 * para modificar directamente estos

 * campos de technicianOpportunities.

 */



export const onQuoteCreated =

  onDocumentCreated(

    {

      document:

        'quotes/{quoteId}',



      region:

        'southamerica-west1'

    },



    async event => {





      /*

       * =====================================

       * SNAPSHOT

       * =====================================

       */



      const snapshot =

        event.data;





      if (

        !snapshot

      ) {



        logger.warn(

          'Presupuesto creado sin snapshot.'

        );



        return;

      }





      const quote =

        snapshot.data();





      const quoteId =

        event.params.quoteId;





      /*

       * =====================================

       * DATOS PRINCIPALES

       * =====================================

       */



      const requestId =

        quote[

          'requestId'

        ]

        ?? '';





      const technicianId =

        quote[

          'technicianId'

        ]

        ?? '';





      const clientId =

        quote[

          'clientId'

        ]

        ?? '';





      const quoteStatus =

        quote[

          'status'

        ]

        ?? '';





      logger.info(

        'Procesando nuevo presupuesto.',

        {

          quoteId,

          requestId,

          technicianId,

          clientId,

          quoteStatus

        }

      );





      /*

       * =====================================

       * VALIDACIÓN DE IDENTIFICADORES

       * =====================================

       */



      if (

        !requestId

        ||

        !technicianId

        ||

        !clientId

      ) {



        logger.error(

          'Presupuesto inválido: faltan identificadores.',

          {

            quoteId,

            requestId,

            technicianId,

            clientId

          }

        );



        return;

      }





      /*

       * =====================================

       * VALIDACIÓN STATUS QUOTE

       * =====================================

       *

       * Solo procesamos presupuestos

       * recién enviados.

       */



      if (

        quoteStatus !==

        'sent'

      ) {



        logger.info(

          'Presupuesto ignorado por status.',

          {

            quoteId,

            quoteStatus

          }

        );



        return;

      }





      /*

       * =====================================

       * OBTENER SERVICE REQUEST

       * =====================================

       */



      const requestRef =

        db

          .collection(

            'serviceRequests'

          )

          .doc(

            requestId

          );





      const requestSnapshot =

        await requestRef

          .get();





      if (

        !requestSnapshot.exists

      ) {



        logger.error(

          'Solicitud asociada al presupuesto no existe.',

          {

            quoteId,

            requestId

          }

        );



        return;

      }





      const serviceRequest =

        requestSnapshot.data()

        ?? {};





      /*

       * =====================================

       * VALIDAR CLIENTE

       * =====================================

       *

       * Evita que una quote apunte

       * artificialmente a otro cliente.

       */



      if (

        serviceRequest[

          'clientId'

        ] !==

        clientId

      ) {



        logger.error(

          'Cliente del presupuesto no coincide con la solicitud.',

          {

            quoteId,



            requestId,



            quoteClientId:

              clientId,



            requestClientId:

              serviceRequest[

                'clientId'

              ]

          }

        );



        return;

      }





      /*

       * =====================================

       * VALIDAR SERVICE REQUEST

       * =====================================

       *

       * Una solicitud solamente puede

       * recibir presupuestos mientras

       * continúe publicada.

       */



      if (

        serviceRequest[

          'status'

        ] !==

        'published'

      ) {



        logger.warn(

          'La solicitud ya no admite presupuestos.',

          {

            quoteId,



            requestId,



            requestStatus:

              serviceRequest[

                'status'

              ]

          }

        );



        return;

      }





      /*

       * =====================================

       * EVITAR AUTOCOTIZACIÓN

       * =====================================

       */



      if (

        technicianId ===

        clientId

      ) {



        logger.error(

          'Presupuesto inválido: técnico y cliente son el mismo usuario.',

          {

            quoteId,

            requestId,

            technicianId

          }

        );



        return;

      }





      /*

       * =====================================

       * ID OPORTUNIDAD

       * =====================================

       *

       * Exactamente la misma fórmula

       * utilizada durante el matching:

       *

       * technicianId_requestId

       */



      const opportunityId =

        buildOpportunityId(

          technicianId,

          requestId

        );





      const opportunityRef =

        db

          .collection(

            'technicianOpportunities'

          )

          .doc(

            opportunityId

          );





      const opportunitySnapshot =

        await opportunityRef

          .get();





      /*

       * =====================================

       * VALIDAR EXISTENCIA

       * =====================================

       */



      if (

        !opportunitySnapshot.exists

      ) {



        logger.error(

          'No existe oportunidad asociada al presupuesto.',

          {

            quoteId,

            requestId,

            technicianId,

            opportunityId

          }

        );



        return;

      }





      const opportunity =

        opportunitySnapshot.data()

        ?? {};





      /*

       * =====================================

       * VALIDAR RELACIÓN

       * =====================================

       */



      if (

        opportunity[

          'technicianId'

        ] !==

          technicianId

        ||

        opportunity[

          'requestId'

        ] !==

          requestId

      ) {



        logger.error(

          'La oportunidad no coincide con el presupuesto.',

          {

            quoteId,

            opportunityId,

            technicianId,

            requestId

          }

        );



        return;

      }





      /*

       * =====================================

       * ESTADO ACTUAL

       * =====================================

       *

       * Permitimos:

       *

       * available -> quoted

       *

       * viewed -> quoted

       */



      const opportunityStatus =

        opportunity[

          'status'

        ];





      if (

        opportunityStatus !==

          'available'

        &&

        opportunityStatus !==

          'viewed'

      ) {



        logger.warn(

          'Oportunidad no admite transición a quoted.',

          {

            quoteId,

            opportunityId,

            opportunityStatus

          }

        );



        return;

      }





      /*

       * =====================================

       * ACTUALIZAR OPORTUNIDAD

       * =====================================

       */



      await opportunityRef

        .update({



          status:

            'quoted',



          quoteId,



          quotedAt:

            FieldValue

              .serverTimestamp(),



          updatedAt:

            FieldValue

              .serverTimestamp()

        });





      /*

       * =====================================

       * LOG RESULTADO

       * =====================================

       */



      logger.info(

        'Oportunidad marcada como cotizada.',

        {

          quoteId,

          requestId,

          technicianId,

          opportunityId,



          previousStatus:

            opportunityStatus,



          newStatus:

            'quoted'

        }

      );
/*
 * =====================================
 * PUSH AL CLIENTE
 * =====================================
 */

await sendPushToUser(

  clientId,

  'Recibiste un nuevo presupuesto',

  `Tienes una nueva propuesta para ${serviceRequest['category'] ?? 'tu servicio'}.`,

  {

    requestId,

    quoteId,

    type:
      'client_new_quote',

    category:
      serviceRequest[
        'category'
      ]
      ?? ''
  }
);




      /*

       * =====================================

       * SIGUIENTE ETAPA

       * =====================================

       *

       * Posteriormente agregaremos:

       *

       * 1. Push al cliente.

       * 2. Registro de notificación.

       * 3. Contador de quotes.

       * 4. Flujo de aceptación.

       *

       * Primero validamos:

       *

       * quote

       *   ↓

       * opportunity = quoted

       */

    }

  );


/*
 * ============================================================
 * ACEPTAR COTIZACION
 * ============================================================
 *
 * Callable autoritativa para contratar a un tecnico.
 *
 * El cliente solamente envia quoteId.
 * La identidad del cliente se obtiene desde Firebase Auth.
 *
 * La transaccion realiza de forma atomica:
 *
 * - quote seleccionada -> accepted
 * - otras quotes sent -> rejected
 * - serviceRequest -> accepted
 * - assignedTechnicianId
 * - acceptedQuoteId
 * - oportunidad ganadora -> assigned
 * - otras oportunidades -> assigned_elsewhere
 */

export const acceptQuote =
  onCall(
    {
      region:
        'southamerica-west1'
    },

    async request => {

      const clientId =
        request.auth?.uid;


      if (
        !clientId
      ) {

        throw new HttpsError(
          'unauthenticated',
          'Debes iniciar sesion para aceptar un presupuesto.'
        );
      }


      const quoteId =
        typeof request.data?.quoteId === 'string'
          ? request.data.quoteId.trim()
          : '';


      if (
        !quoteId
      ) {

        throw new HttpsError(
          'invalid-argument',
          'quoteId es obligatorio.'
        );
      }


      logger.info(
        'Solicitud de aceptacion de presupuesto.',
        {
          quoteId,
          clientId
        }
      );


      try {

        const result =
          await db.runTransaction(
            async transaction => {

              const quoteRef =
                db
                  .collection(
                    'quotes'
                  )
                  .doc(
                    quoteId
                  );


              const quoteSnapshot =
                await transaction.get(
                  quoteRef
                );


              if (
                !quoteSnapshot.exists
              ) {

                throw new HttpsError(
                  'not-found',
                  'El presupuesto no existe.'
                );
              }


              const quote =
                quoteSnapshot.data()
                ?? {};


              const requestId =
                typeof quote['requestId'] === 'string'
                  ? quote['requestId']
                  : '';


              const technicianId =
                typeof quote['technicianId'] === 'string'
                  ? quote['technicianId']
                  : '';


              const quoteClientId =
                typeof quote['clientId'] === 'string'
                  ? quote['clientId']
                  : '';


              if (
                !requestId
                ||
                !technicianId
                ||
                !quoteClientId
              ) {

                throw new HttpsError(
                  'failed-precondition',
                  'El presupuesto no contiene relaciones validas.'
                );
              }


              if (
                quoteClientId !==
                clientId
              ) {

                throw new HttpsError(
                  'permission-denied',
                  'Este presupuesto no pertenece al cliente autenticado.'
                );
              }


              if (
                quote['status'] !==
                'sent'
              ) {

                throw new HttpsError(
                  'failed-precondition',
                  'El presupuesto ya no esta disponible.'
                );
              }


              const serviceRequestRef =
                db
                  .collection(
                    'serviceRequests'
                  )
                  .doc(
                    requestId
                  );


              const serviceRequestSnapshot =
                await transaction.get(
                  serviceRequestRef
                );


              if (
                !serviceRequestSnapshot.exists
              ) {

                throw new HttpsError(
                  'not-found',
                  'La solicitud asociada no existe.'
                );
              }


              const serviceRequest =
                serviceRequestSnapshot.data()
                ?? {};


              if (
                serviceRequest['clientId'] !==
                clientId
              ) {

                throw new HttpsError(
                  'permission-denied',
                  'La solicitud no pertenece al cliente autenticado.'
                );
              }


              if (
                serviceRequest['status'] !==
                'published'
              ) {

                throw new HttpsError(
                  'failed-precondition',
                  'La solicitud ya no admite contratacion.'
                );
              }


              const quotesQuery =
                db
                  .collection(
                    'quotes'
                  )
                  .where(
                    'requestId',
                    '==',
                    requestId
                  );


              const opportunitiesQuery =
                db
                  .collection(
                    'technicianOpportunities'
                  )
                  .where(
                    'requestId',
                    '==',
                    requestId
                  );


              const quotesSnapshot =
                await transaction.get(
                  quotesQuery
                );


              const opportunitiesSnapshot =
                await transaction.get(
                  opportunitiesQuery
                );


              const winningOpportunityId =
                buildOpportunityId(
                  technicianId,
                  requestId
                );


              const winningOpportunity =
                opportunitiesSnapshot.docs.find(
                  opportunityDoc =>
                    opportunityDoc.id ===
                    winningOpportunityId
                );


              if (
                !winningOpportunity
              ) {

                throw new HttpsError(
                  'failed-precondition',
                  'No existe una oportunidad valida para el tecnico seleccionado.'
                );
              }


              const winningOpportunityData =
                winningOpportunity.data();


              if (
                winningOpportunityData['technicianId'] !==
                  technicianId
                ||
                winningOpportunityData['requestId'] !==
                  requestId
              ) {

                throw new HttpsError(
                  'failed-precondition',
                  'La oportunidad seleccionada no coincide con el presupuesto.'
                );
              }


              const now =
                FieldValue.serverTimestamp();


              transaction.update(
                quoteRef,
                {
                  status:
                    'accepted',

                  acceptedAt:
                    now,

                  updatedAt:
                    now
                }
              );


              for (
                const quoteDoc
                of quotesSnapshot.docs
              ) {

                if (
                  quoteDoc.id ===
                  quoteId
                ) {

                  continue;
                }


                const otherQuote =
                  quoteDoc.data();


                if (
                  otherQuote['status'] !==
                  'sent'
                ) {

                  continue;
                }


                transaction.update(
                  quoteDoc.ref,
                  {
                    status:
                      'rejected',

                    rejectedReason:
                      'another_quote_accepted',

                    rejectedAt:
                      now,

                    updatedAt:
                      now
                  }
                );
              }


              transaction.update(
                serviceRequestRef,
                {
                  status:
                    'accepted',

                  assignedTechnicianId:
                    technicianId,

                  acceptedQuoteId:
                    quoteId,

                  acceptedAt:
                    now,

                  updatedAt:
                    now
                }
              );


              for (
                const opportunityDoc
                of opportunitiesSnapshot.docs
              ) {

                const opportunity =
                  opportunityDoc.data();


                if (
                  opportunityDoc.id ===
                  winningOpportunityId
                ) {

                  transaction.update(
                    opportunityDoc.ref,
                    {
                      status:
                        'assigned',

                      quoteId,

                      assignedAt:
                        now,

                      updatedAt:
                        now
                    }
                  );

                  continue;
                }


                const opportunityStatus =
                  opportunity['status'];


                if (
                  opportunityStatus !== 'available'
                  &&
                  opportunityStatus !== 'viewed'
                  &&
                  opportunityStatus !== 'quoted'
                ) {

                  continue;
                }


                transaction.update(
                  opportunityDoc.ref,
                  {
                    status:
                      'assigned_elsewhere',

                    assignedElsewhereAt:
                      now,

                    updatedAt:
                      now
                  }
                );
              }


              return {
                quoteId,
                requestId,
                technicianId
              };
            }
          );


        logger.info(
          'Presupuesto aceptado correctamente.',
          result
        );
/*
 * =====================================
 * PUSH AL TÉCNICO CONTRATADO
 * =====================================
 */

await sendPushToUser(

  result.technicianId,

  'Tu presupuesto fue aceptado',

  'El cliente confirmó tu propuesta. Ya puedes revisar el trabajo asignado.',

  {

    requestId:
      result.requestId,

    quoteId:
      result.quoteId,

    type:
      'technician_quote_accepted'
  }
);

        return {
          ok:
            true,

          ...result
        };


      } catch (error) {

        if (
          error instanceof HttpsError
        ) {

          throw error;
        }


        logger.error(
          'Error aceptando presupuesto.',
          {
            quoteId,
            clientId,
            error
          }
        );


        throw new HttpsError(
          'internal',
          'No fue posible aceptar el presupuesto.'
        );
      }
    }
  );



/*
 * =========================================
 * ACTUALIZAR ESTADO DEL TRABAJO
 * =========================================
 *
 * Callable utilizada por el tecnico asignado.
 *
 * Transiciones permitidas:
 *
 * accepted -> in_progress
 * in_progress -> completed
 *
 * El cliente no puede ejecutar esta funcion y
 * un tecnico no puede modificar trabajos ajenos.
 */

/*
 * ============================================================
 * ACTUALIZAR ESTADO DEL TRABAJO
 * ============================================================
 *
 * Callable autoritativa utilizada por el técnico asignado.
 *
 * Transiciones permitidas:
 *
 * accepted
 *    ↓ start_trip
 * en_route
 *    ↓ arrive
 * arrived
 *    ↓ start
 * in_progress
 *    ↓ complete
 * completed
 *
 * El cliente no puede ejecutar esta función.
 * Un técnico tampoco puede modificar trabajos ajenos.
 */

export const updateJobStatus =
  onCall(
    {
      region:
        'southamerica-west1'
    },

    async request => {


      /*
       * =====================================
       * AUTENTICACIÓN
       * =====================================
       */

      const technicianId =
        request.auth?.uid;


      if (
        !technicianId
      ) {

        throw new HttpsError(
          'unauthenticated',
          'Debes iniciar sesión para gestionar un trabajo.'
        );
      }


      /*
       * =====================================
       * DATOS
       * =====================================
       */

      const requestId =
        typeof request.data?.requestId ===
          'string'
          ? request.data.requestId.trim()
          : '';


      const action =
        typeof request.data?.action ===
          'string'
          ? request.data.action.trim()
          : '';


      if (
        !requestId
      ) {

        throw new HttpsError(
          'invalid-argument',
          'requestId es obligatorio.'
        );
      }


      /*
       * =====================================
       * ACCIONES PERMITIDAS
       * =====================================
       */

      if (
        action !== 'start_trip'
        &&
        action !== 'arrive'
        &&
        action !== 'start'
        &&
        action !== 'complete'
      ) {

        throw new HttpsError(
          'invalid-argument',
          'La acción debe ser start_trip, arrive, start o complete.'
        );
      }


      /*
       * =====================================
       * REFERENCIA
       * =====================================
       */

      const requestRef =
        db
          .collection(
            'serviceRequests'
          )
          .doc(
            requestId
          );


      try {


        /*
         * =====================================
         * TRANSACCIÓN
         * =====================================
         */

        const result =
          await db.runTransaction(
            async transaction => {


              const snapshot =
                await transaction.get(
                  requestRef
                );


              if (
                !snapshot.exists
              ) {

                throw new HttpsError(
                  'not-found',
                  'El trabajo no existe.'
                );
              }


              const data =
                snapshot.data()
                ?? {};


              const assignedTechnicianId =
                typeof data[
                  'assignedTechnicianId'
                ] ===
                  'string'
                  ? data[
                      'assignedTechnicianId'
                    ]
                  : '';


              const currentStatus =
                typeof data[
                  'status'
                ] ===
                  'string'
                  ? data[
                      'status'
                    ]
                  : '';


              const clientId =
                typeof data[
                  'clientId'
                ] ===
                  'string'
                  ? data[
                      'clientId'
                    ]
                  : '';


              const category =
                typeof data[
                  'category'
                ] ===
                  'string'
                  ? data[
                      'category'
                    ]
                  : 'Servicio';


              /*
               * =================================
               * TÉCNICO ASIGNADO
               * =================================
               */

              if (
                assignedTechnicianId !==
                technicianId
              ) {

                throw new HttpsError(
                  'permission-denied',
                  'Este trabajo no está asignado a tu cuenta.'
                );
              }


              if (
                !clientId
              ) {

                throw new HttpsError(
                  'failed-precondition',
                  'El trabajo no contiene un cliente válido.'
                );
              }


              const now =
                FieldValue
                  .serverTimestamp();


              /*
               * =================================
               * IR AL DOMICILIO
               *
               * accepted -> en_route
               * =================================
               */

              if (
                action ===
                'start_trip'
              ) {

                if (
                  currentStatus !==
                  'accepted'
                ) {

                  throw new HttpsError(
                    'failed-precondition',
                    'El desplazamiento ya no puede iniciarse.'
                  );
                }


                transaction.update(
                  requestRef,
                  {

                    status:
                      'en_route',

                    enRouteAt:
                      now,

                    updatedAt:
                      now
                  }
                );


                return {

                  requestId,

                  status:
                    'en_route',

                  previousStatus:
                    currentStatus,

                  clientId,

                  category
                };
              }


              /*
               * =================================
               * TÉCNICO LLEGÓ
               *
               * en_route -> arrived
               * =================================
               */

              if (
                action ===
                'arrive'
              ) {

                if (
                  currentStatus !==
                  'en_route'
                ) {

                  throw new HttpsError(
                    'failed-precondition',
                    'Solo puedes marcar llegada mientras vas en camino.'
                  );
                }


                transaction.update(
                  requestRef,
                  {

                    status:
                      'arrived',

                    arrivedAt:
                      now,

                    updatedAt:
                      now
                  }
                );


                return {

                  requestId,

                  status:
                    'arrived',

                  previousStatus:
                    currentStatus,

                  clientId,

                  category
                };
              }


              /*
               * =================================
               * INICIAR TRABAJO
               *
               * arrived -> in_progress
               * =================================
               */

              if (
                action ===
                'start'
              ) {

                if (
                  currentStatus !==
                  'arrived'
                ) {

                  throw new HttpsError(
                    'failed-precondition',
                    'Debes marcar tu llegada antes de iniciar el trabajo.'
                  );
                }


                transaction.update(
                  requestRef,
                  {

                    status:
                      'in_progress',

                    startedAt:
                      now,

                    updatedAt:
                      now
                  }
                );


                return {

                  requestId,

                  status:
                    'in_progress',

                  previousStatus:
                    currentStatus,

                  clientId,

                  category
                };
              }


              /*
               * =================================
               * FINALIZAR TRABAJO
               *
               * in_progress -> completed
               * =================================
               */

              if (
                currentStatus !==
                'in_progress'
              ) {

                throw new HttpsError(
                  'failed-precondition',
                  'El trabajo no está en curso.'
                );
              }


              transaction.update(
                requestRef,
                {

                  status:
                    'completed',

                  completedAt:
                    now,

                  updatedAt:
                    now
                }
              );


              return {

                requestId,

                status:
                  'completed',

                previousStatus:
                  currentStatus,

                clientId,

                category
              };
            }
          );


        /*
         * =====================================
         * LOG
         * =====================================
         */

        logger.info(
          'Estado del trabajo actualizado correctamente.',
          {

            technicianId,

            action,

            ...result
          }
        );


        /*
         * =====================================
         * PUSH AL CLIENTE
         * =====================================
         */


        /*
         * TÉCNICO VA EN CAMINO
         */

        if (
          action ===
          'start_trip'
        ) {

          await sendPushToUser(

            result.clientId,

            'Tu técnico va en camino',

            `El técnico asignado a ${result.category} comenzó el viaje hacia tu domicilio.`,

            {

              requestId:
                result.requestId,

              type:
                'client_technician_en_route',

              category:
                result.category
            }
          );
        }


        /*
         * TÉCNICO LLEGÓ
         */

        else if (
          action ===
          'arrive'
        ) {

          await sendPushToUser(

            result.clientId,

            'Tu técnico llegó',

            `El técnico de ${result.category} ya se encuentra en el domicilio.`,

            {

              requestId:
                result.requestId,

              type:
                'client_technician_arrived',

              category:
                result.category
            }
          );
        }


        /*
         * TRABAJO INICIADO
         */

        else if (
          action ===
          'start'
        ) {

          await sendPushToUser(

            result.clientId,

            'Tu servicio está en curso',

            `El técnico comenzó el trabajo de ${result.category}.`,

            {

              requestId:
                result.requestId,

              type:
                'client_job_started',

              category:
                result.category
            }
          );
        }


        /*
         * TRABAJO FINALIZADO
         */

        else {

          await sendPushToUser(

            result.clientId,

            'Tu servicio fue finalizado',

            `El técnico finalizó el trabajo de ${result.category}. Puedes revisar el servicio y completar el pago.`,

            {

              requestId:
                result.requestId,

              type:
                'client_job_completed',

              category:
                result.category
            }
          );
        }


        /*
         * =====================================
         * RESPONSE
         * =====================================
         */

        return {

          ok:
            true,

          ...result
        };


      } catch (error) {


        if (
          error instanceof
          HttpsError
        ) {

          throw error;
        }


        logger.error(
          'Error actualizando estado del trabajo.',
          {

            technicianId,

            requestId,

            action,

            error
          }
        );


        throw new HttpsError(
          'internal',
          'No fue posible actualizar el estado del trabajo.'
        );
      }
    }
  );

  /*
 * ============================================================
 * SIMULAR PAGO
 * ============================================================
 *
 * Pago simulado para el MVP / Capstone.
 *
 * El cliente solamente envía:
 *
 * requestId
 *
 * El backend determina de forma autoritativa:
 *
 * - cliente autenticado
 * - solicitud
 * - presupuesto aceptado
 * - técnico contratado
 * - monto real
 *
 * La transacción realiza de forma atómica:
 *
 * - crea payments/{requestId}
 * - serviceRequest.paymentStatus -> paid
 * - serviceRequest.paymentId -> requestId
 *
 * IMPORTANTE:
 *
 * El frontend NO puede definir el monto.
 */
/*
 * ============================================================
 * CREAR TRANSACCIÓN WEBPAY PLUS
 * ============================================================
 *
 * SEGURIDAD:
 *
 * El frontend solamente entrega:
 *
 * requestId
 *
 * El backend determina autoritativamente:
 *
 * - cliente autenticado
 * - presupuesto aceptado
 * - técnico
 * - monto
 * - buyOrder
 * - sessionId
 *
 * El frontend NUNCA define el monto.
 */

export const createWebpayTransaction =
  onCall(
    {
      region:
        'southamerica-west1'
    },

    async request => {


      /*
       * =====================================
       * AUTENTICACIÓN
       * =====================================
       */

      const clientId =
        request.auth?.uid;


      if (
        !clientId
      ) {

        throw new HttpsError(
          'unauthenticated',
          'Debes iniciar sesión para realizar el pago.'
        );
      }


      /*
       * =====================================
       * INPUT
       * =====================================
       */

      const requestId =
        typeof request.data?.requestId ===
          'string'
          ? request.data.requestId.trim()
          : '';


      if (
        !requestId
      ) {

        throw new HttpsError(
          'invalid-argument',
          'requestId es obligatorio.'
        );
      }


      logger.info(
        'Creando transacción Webpay Plus.',
        {
          requestId,
          clientId
        }
      );


      try {


        /*
         * =====================================
         * SOLICITUD
         * =====================================
         */

        const serviceRequestRef =
          db
            .collection(
              'serviceRequests'
            )
            .doc(
              requestId
            );


        const serviceRequestSnapshot =
          await serviceRequestRef
            .get();


        if (
          !serviceRequestSnapshot.exists
        ) {

          throw new HttpsError(
            'not-found',
            'La solicitud no existe.'
          );
        }


        const serviceRequest =
          serviceRequestSnapshot.data()
          ?? {};


        /*
         * =====================================
         * PROPIEDAD
         * =====================================
         */

        if (
          serviceRequest[
            'clientId'
          ] !==
          clientId
        ) {

          throw new HttpsError(
            'permission-denied',
            'La solicitud no pertenece al cliente autenticado.'
          );
        }


        /*
         * =====================================
         * SERVICIO COMPLETADO
         * =====================================
         */

        if (
          serviceRequest[
            'status'
          ] !==
          'completed'
        ) {

          throw new HttpsError(
            'failed-precondition',
            'El servicio debe estar finalizado antes de pagar.'
          );
        }


        /*
         * =====================================
         * YA PAGADO
         * =====================================
         */

        if (
          serviceRequest[
            'paymentStatus'
          ] ===
          'paid'
        ) {

          throw new HttpsError(
            'already-exists',
            'Este servicio ya fue pagado.'
          );
        }


        /*
         * =====================================
         * PRESUPUESTO ACEPTADO
         * =====================================
         */

        const quoteId =
          typeof serviceRequest[
            'acceptedQuoteId'
          ] ===
            'string'
            ? serviceRequest[
                'acceptedQuoteId'
              ]
            : '';


        if (
          !quoteId
        ) {

          throw new HttpsError(
            'failed-precondition',
            'La solicitud no tiene un presupuesto aceptado.'
          );
        }


        /*
         * =====================================
         * TÉCNICO
         * =====================================
         */

        const technicianId =
          typeof serviceRequest[
            'assignedTechnicianId'
          ] ===
            'string'
            ? serviceRequest[
                'assignedTechnicianId'
              ]
            : '';


        if (
          !technicianId
        ) {

          throw new HttpsError(
            'failed-precondition',
            'La solicitud no tiene un técnico asignado.'
          );
        }


        /*
         * =====================================
         * PRESUPUESTO
         * =====================================
         */

        const quoteRef =
          db
            .collection(
              'quotes'
            )
            .doc(
              quoteId
            );


        const quoteSnapshot =
          await quoteRef
            .get();


        if (
          !quoteSnapshot.exists
        ) {

          throw new HttpsError(
            'not-found',
            'El presupuesto aceptado no existe.'
          );
        }


        const quote =
          quoteSnapshot.data()
          ?? {};


        /*
         * =====================================
         * VALIDAR RELACIONES
         * =====================================
         */

        if (
          quote[
            'requestId'
          ] !==
            requestId
          ||
          quote[
            'clientId'
          ] !==
            clientId
          ||
          quote[
            'technicianId'
          ] !==
            technicianId
        ) {

          throw new HttpsError(
            'failed-precondition',
            'El presupuesto no coincide con la solicitud.'
          );
        }


        if (
          quote[
            'status'
          ] !==
          'accepted'
        ) {

          throw new HttpsError(
            'failed-precondition',
            'El presupuesto asociado no está aceptado.'
          );
        }


        /*
         * =====================================
         * MONTO AUTORITATIVO
         * =====================================
         */

        const amount =
          typeof quote[
            'totalAmount'
          ] ===
            'number'
            ? quote[
                'totalAmount'
              ]
            : 0;


        if (
          !Number.isFinite(
            amount
          )
          ||
          amount <= 0
        ) {

          throw new HttpsError(
            'failed-precondition',
            'El presupuesto no contiene un monto válido.'
          );
        }


        /*
         * =====================================
         * IDENTIFICADORES WEBPAY
         * =====================================
         *
         * Webpay limita el tamaño de algunos
         * identificadores.
         *
         * No usamos el requestId completo como
         * buyOrder.
         */

        const timestamp =
          Date.now()
            .toString();


        const requestFragment =
          requestId
            .replace(
              /[^a-zA-Z0-9]/g,
              ''
            )
            .slice(
              0,
              8
            );


        const buyOrder =
          `SG${timestamp.slice(-12)}${requestFragment}`
            .slice(
              0,
              26
            );


        const sessionId =
          `SG-${clientId.slice(0, 12)}-${timestamp}`
            .slice(
              0,
              61
            );


        /*
         * =====================================
         * URL RETORNO
         * =====================================
         *
         * En el siguiente checkpoint
         * construiremos esta ruta en Angular.
         */

        const returnUrl =
          process.env[
            'WEBPAY_RETURN_URL'
          ]
          ??
          'http://localhost:8100/payment/webpay-return';


        /*
         * =====================================
         * WEBPAY INTEGRATION
         * =====================================
         *
         * buildForIntegration utiliza las
         * credenciales oficiales de integración
         * incluidas por Transbank.
         */

const webpayCommerceCode =
  process.env[
    'WEBPAY_COMMERCE_CODE'
  ]
  ??
  '597055555532';


const webpayApiKey =
  process.env[
    'WEBPAY_API_KEY'
  ]
  ??
  '579B532A7440BB0C9079DED94D31EA1615BACEB56610332264630D42D0A36B1C';


const transaction =
  WebpayPlus.Transaction
    .buildForIntegration(
      webpayCommerceCode,
      webpayApiKey
    );


        const webpayResponse =
          await transaction
            .create(
              buyOrder,
              sessionId,
              Math.round(
                amount
              ),
              returnUrl
            );


        const token =
          webpayResponse.token;


        const url =
          webpayResponse.url;


        if (
          !token
          ||
          !url
        ) {

          throw new Error(
            'webpay-invalid-create-response'
          );
        }


        /*
         * =====================================
         * PAYMENT PENDIENTE
         * =====================================
         */

        const paymentId =
          requestId;


        const paymentRef =
          db
            .collection(
              'payments'
            )
            .doc(
              paymentId
            );


        const existingPayment =
          await paymentRef
            .get();


        /*
         * Permitimos reintentar únicamente
         * cuando todavía no existe un pago
         * aprobado.
         */

        if (
          existingPayment.exists
          &&
          existingPayment.data()?.[
            'status'
          ] ===
            'approved'
        ) {

          throw new HttpsError(
            'already-exists',
            'Este servicio ya tiene un pago aprobado.'
          );
        }


        const now =
          FieldValue
            .serverTimestamp();


        await paymentRef
          .set(
            {

              id:
                paymentId,

              requestId,

              quoteId,

              clientId,

              technicianId,

              amount:
                Math.round(
                  amount
                ),

              currency:
                'CLP',

              method:
                'webpay_plus',

              provider:
                'transbank',

              status:
                'pending',

              buyOrder,

              sessionId,

              token,

              webpayUrl:
                url,

              returnUrl,

              transactionId:
                null,

              authorizationCode:
                null,

              responseCode:
                null,

              paymentTypeCode:
                null,

              installmentsNumber:
                null,

              cardLast4:
                null,

              createdAt:
                now,

              updatedAt:
                now,

              paidAt:
                null
            },
            {
              merge:
                true
            }
          );


        /*
         * =====================================
         * IMPORTANTE
         * =====================================
         *
         * NO actualizamos todavía:
         *
         * paymentStatus = paid
         *
         * El pago solamente será confirmado
         * después del COMMIT de Transbank.
         */


        logger.info(
          'Transacción Webpay Plus creada.',
          {
            requestId,
            paymentId,
            clientId,
            technicianId,
            amount,
            buyOrder
          }
        );


        return {

          ok:
            true,

          paymentId,

          requestId,

          quoteId,

          technicianId,

          amount:
            Math.round(
              amount
            ),

          currency:
            'CLP',

          status:
            'pending',

          buyOrder,

          token,

          url
        };


      } catch (error) {


        if (
          error instanceof
          HttpsError
        ) {

          throw error;
        }


        logger.error(
          'Error creando transacción Webpay Plus.',
          {
            requestId,
            clientId,
            error
          }
        );


        throw new HttpsError(
          'internal',
          'No fue posible iniciar el pago con Webpay.'
        );
      }
    }
  );

/*
 * ============================================================
 * CONFIRMAR TRANSACCIÓN WEBPAY PLUS
 * ============================================================
 */

export const commitWebpayTransaction =
  onCall(
    {
      region:
        'southamerica-west1'
    },

    async request => {


      /*
       * =====================================
       * AUTENTICACIÓN
       * =====================================
       */

      const clientId =
        request.auth?.uid;


      if (
        !clientId
      ) {

        throw new HttpsError(
          'unauthenticated',
          'Debes iniciar sesión para confirmar el pago.'
        );
      }


      /*
       * =====================================
       * TOKEN
       * =====================================
       */

      const token =
        typeof request.data?.token ===
          'string'
          ? request.data.token.trim()
          : '';


      if (
        !token
      ) {

        throw new HttpsError(
          'invalid-argument',
          'El token Webpay es obligatorio.'
        );
      }


      logger.info(
        'Confirmando transacción Webpay Plus.',
        {
          clientId
        }
      );


      try {


        /*
         * =====================================
         * BUSCAR PAYMENT POR TOKEN
         * =====================================
         */

        const paymentQuery =
          await db
            .collection(
              'payments'
            )
            .where(
              'token',
              '==',
              token
            )
            .limit(
              1
            )
            .get();


        if (
          paymentQuery.empty
        ) {

          throw new HttpsError(
            'not-found',
            'No encontramos la transacción Webpay.'
          );
        }


        const paymentSnapshot =
          paymentQuery.docs[
            0
          ];


        const payment =
          paymentSnapshot.data();


        const paymentId =
          paymentSnapshot.id;


        /*
         * =====================================
         * PROPIEDAD
         * =====================================
         */

        if (
          payment[
            'clientId'
          ] !==
          clientId
        ) {

          throw new HttpsError(
            'permission-denied',
            'La transacción no pertenece al cliente autenticado.'
          );
        }


        /*
         * =====================================
         * YA APROBADO
         * =====================================
         */

        if (
          payment[
            'status'
          ] ===
          'approved'
        ) {

          throw new HttpsError(
            'already-exists',
            'Esta transacción ya fue confirmada.'
          );
        }


        const requestId =
          typeof payment[
            'requestId'
          ] ===
            'string'
            ? payment[
                'requestId'
              ]
            : '';


        const expectedBuyOrder =
          typeof payment[
            'buyOrder'
          ] ===
            'string'
            ? payment[
                'buyOrder'
              ]
            : '';


        const expectedAmount =
          typeof payment[
            'amount'
          ] ===
            'number'
            ? payment[
                'amount'
              ]
            : 0;


        if (
          !requestId
          ||
          !expectedBuyOrder
          ||
          expectedAmount <= 0
        ) {

          throw new HttpsError(
            'failed-precondition',
            'La transacción almacenada es inválida.'
          );
        }


        /*
         * =====================================
         * TRANSBANK
         * =====================================
         */

        const webpayCommerceCode =
          process.env[
            'WEBPAY_COMMERCE_CODE'
          ]
          ??
          '597055555532';


        const webpayApiKey =
          process.env[
            'WEBPAY_API_KEY'
          ]
          ??
          '579B532A7440BB0C9079DED94D31EA1615BACEB56610332264630D42D0A36B1C';


        const transaction =
          WebpayPlus.Transaction
            .buildForIntegration(
              webpayCommerceCode,
              webpayApiKey
            );


        /*
         * =====================================
         * COMMIT WEBPAY
         * =====================================
         */

        const result =
          await transaction
            .commit(
              token
            );


        logger.info(
          'Respuesta commit Webpay.',
          {
            requestId,
            responseCode:
              result.response_code,
            buyOrder:
              result.buy_order,
            amount:
              result.amount
          }
        );


        /*
         * =====================================
         * VALIDAR IDENTIDAD TRANSACCIÓN
         * =====================================
         */

        if (
          result.buy_order !==
          expectedBuyOrder
        ) {

          logger.error(
            'Webpay buyOrder no coincide.',
            {
              requestId,
              expectedBuyOrder,
              receivedBuyOrder:
                result.buy_order
            }
          );


          throw new HttpsError(
            'failed-precondition',
            'La orden retornada por Webpay no coincide.'
          );
        }


        /*
         * =====================================
         * VALIDAR MONTO
         * =====================================
         */

        if (
          Number(
            result.amount
          ) !==
          expectedAmount
        ) {

          logger.error(
            'Webpay amount no coincide.',
            {
              requestId,
              expectedAmount,
              receivedAmount:
                result.amount
            }
          );


          throw new HttpsError(
            'failed-precondition',
            'El monto retornado por Webpay no coincide.'
          );
        }


        /*
         * =====================================
         * APROBACIÓN
         * =====================================
         */

        const approved =
          result.response_code ===
            0;


        /*
         * =====================================
         * PAGO RECHAZADO
         * =====================================
         */

        if (
          !approved
        ) {

          await paymentSnapshot
            .ref
            .update(
              {

                status:
                  'rejected',

                responseCode:
                  result.response_code,

                updatedAt:
                  FieldValue
                    .serverTimestamp()
              }
            );


          return {

            ok:
              false,

            approved:
              false,

            paymentId,

            requestId,

            responseCode:
              result.response_code
          };
        }


        /*
         * =====================================
         * DATOS TRANSBANK
         * =====================================
         */

        const authorizationCode =
          result.authorization_code
          ??
          '';


        const paymentTypeCode =
          result.payment_type_code
          ??
          '';


        const installmentsNumber =
          result.installments_number
          ??
          0;


        const cardLast4 =
          result.card_detail
            ?.card_number
          ??
          '';


        /*
         * =====================================
         * ACTUALIZACIÓN ATÓMICA
         * =====================================
         */

        const serviceRequestRef =
          db
            .collection(
              'serviceRequests'
            )
            .doc(
              requestId
            );


        await db.runTransaction(
          async firestoreTransaction => {


            const currentPayment =
              await firestoreTransaction
                .get(
                  paymentSnapshot.ref
                );


            const currentRequest =
              await firestoreTransaction
                .get(
                  serviceRequestRef
                );


            if (
              !currentPayment.exists
              ||
              !currentRequest.exists
            ) {

              throw new HttpsError(
                'not-found',
                'No encontramos los datos del servicio.'
              );
            }


            const requestData =
              currentRequest.data()
              ??
              {};


            /*
             * Segunda validación de propiedad.
             */

            if (
              requestData[
                'clientId'
              ] !==
              clientId
            ) {

              throw new HttpsError(
                'permission-denied',
                'La solicitud no pertenece al cliente autenticado.'
              );
            }


            const now =
              FieldValue
                .serverTimestamp();


            /*
             * PAYMENT
             */

            firestoreTransaction
              .update(
                paymentSnapshot.ref,
                {

                  status:
                    'approved',

                  responseCode:
                    result.response_code,

                  authorizationCode,

                  paymentTypeCode,

                  installmentsNumber,

                  cardLast4,

                  transactionDate:
                    result.transaction_date
                    ??
                    null,

                  accountingDate:
                    result.accounting_date
                    ??
                    null,

                  updatedAt:
                    now,

                  paidAt:
                    now
                }
              );


            /*
             * SERVICE REQUEST
             */

            firestoreTransaction
              .update(
                serviceRequestRef,
                {

                  paymentStatus:
                    'paid',

                  paymentId,

                  paidAt:
                    now,

                  updatedAt:
                    now
                }
              );
          }
        );


        logger.info(
          'Pago Webpay aprobado y registrado.',
          {
            paymentId,
            requestId,
            clientId,
            amount:
              expectedAmount,
            authorizationCode
          }
        );


        return {

          ok:
            true,

          approved:
            true,

          paymentId,

          requestId,

          amount:
            expectedAmount,

          currency:
            'CLP',

          status:
            'approved',

          responseCode:
            result.response_code,

          authorizationCode,

          paymentTypeCode,

          installmentsNumber,

          cardLast4
        };


      } catch (error) {


        if (
          error instanceof
          HttpsError
        ) {

          throw error;
        }


        /*
 * =====================================
 * DIAGNÓSTICO ERROR TRANSBANK
 * =====================================
 */

const errorMessage =
  error instanceof Error
    ? error.message
    : String(
        error
      );


const errorName =
  error instanceof Error
    ? error.name
    : 'UnknownError';


const errorStack =
  error instanceof Error
    ? error.stack
    : undefined;


let responseStatus:
  unknown =
    undefined;


let responseData:
  unknown =
    undefined;


if (
  error
  &&
  typeof error ===
    'object'
  &&
  'response' in error
) {

  const response =
    (
      error as {
        response?: {
          status?: unknown;
          data?: unknown;
        };
      }
    ).response;


  responseStatus =
    response?.status;


  responseData =
    response?.data;
}


logger.error(
  'Error confirmando transacción Webpay Plus.',
  {

    clientId,

    errorName,

    errorMessage,

    responseStatus,

    responseData,

    errorStack
  }
);


throw new HttpsError(
  'internal',
  'No fue posible confirmar el pago con Webpay.'
);
      }
    }
  );


  /*
 * ============================================================
 * OBTENER EVALUACIÓN DE SERVICIO
 * ============================================================
 *
 * Permite saber si un servicio ya fue evaluado.
 *
 * La review se identifica de forma determinista:
 *
 * reviews/{requestId}
 */

export const getReviewForRequest =
  onCall(
    {
      region:
        'southamerica-west1'
    },

    async call => {


      /*
       * =====================================
       * AUTH
       * =====================================
       */

      const userId =
        call.auth
          ?.uid;


      if (
        !userId
      ) {

        throw new HttpsError(
          'unauthenticated',
          'Debes iniciar sesión.'
        );
      }


      /*
       * =====================================
       * REQUEST ID
       * =====================================
       */

      const requestId =
        typeof call.data
          ?.requestId ===
          'string'
          ? call.data
              .requestId
              .trim()
          : '';


      if (
        !requestId
      ) {

        throw new HttpsError(
          'invalid-argument',
          'requestId es obligatorio.'
        );
      }


      /*
       * =====================================
       * SERVICE REQUEST
       * =====================================
       */

      const serviceRef =
        db
          .collection(
            'serviceRequests'
          )
          .doc(
            requestId
          );


      const serviceSnapshot =
        await serviceRef
          .get();


      if (
        !serviceSnapshot.exists
      ) {

        throw new HttpsError(
          'not-found',
          'El servicio no existe.'
        );
      }


      const service =
        serviceSnapshot.data()
        ?? {};


      const clientId =
        service[
          'clientId'
        ]
        ?? '';


      const technicianId =
        service[
          'assignedTechnicianId'
        ]
        ?? '';


      /*
       * Cliente y técnico asignado
       * pueden consultar la evaluación.
       */

      if (
        userId !==
          clientId
        &&
        userId !==
          technicianId
      ) {

        throw new HttpsError(
          'permission-denied',
          'No tienes acceso a este servicio.'
        );
      }


      /*
       * =====================================
       * REVIEW
       * =====================================
       */

      const reviewRef =
        db
          .collection(
            'reviews'
          )
          .doc(
            requestId
          );


      const reviewSnapshot =
        await reviewRef
          .get();


      if (
        !reviewSnapshot.exists
      ) {

        return {

          exists:
            false,

          review:
            null
        };
      }


      const review =
        reviewSnapshot.data()
        ?? {};


      return {

        exists:
          true,

        review: {

          id:
            review[
              'id'
            ]
            ?? requestId,

          requestId:
            review[
              'requestId'
            ]
            ?? requestId,

          clientId:
            review[
              'clientId'
            ]
            ?? '',

          technicianId:
            review[
              'technicianId'
            ]
            ?? '',

          rating:
            review[
              'rating'
            ]
            ?? 0,

          comment:
            review[
              'comment'
            ]
            ?? ''
        }
      };
    }
  );


/*
 * ============================================================
 * ENVIAR EVALUACIÓN
 * ============================================================
 *
 * Seguridad:
 *
 * - usuario autenticado
 * - servicio existe
 * - usuario es cliente propietario
 * - servicio está completed
 * - existe técnico asignado
 * - una evaluación por servicio
 * - rating 1..5
 *
 * Además recalcula:
 *
 * averageRating
 * ratingCount
 */

export const submitReview =
  onCall(
    {
      region:
        'southamerica-west1'
    },

    async call => {


      /*
       * =====================================
       * AUTH
       * =====================================
       */

      const clientId =
        call.auth
          ?.uid;


      if (
        !clientId
      ) {

        throw new HttpsError(
          'unauthenticated',
          'Debes iniciar sesión.'
        );
      }


      /*
       * =====================================
       * DATOS
       * =====================================
       */

      const requestId =
        typeof call.data
          ?.requestId ===
          'string'
          ? call.data
              .requestId
              .trim()
          : '';


      const rating =
        Number(
          call.data
            ?.rating
        );


      const comment =
        typeof call.data
          ?.comment ===
          'string'
          ? call.data
              .comment
              .trim()
          : '';


      /*
       * =====================================
       * VALIDACIONES
       * =====================================
       */

      if (
        !requestId
      ) {

        throw new HttpsError(
          'invalid-argument',
          'requestId es obligatorio.'
        );
      }


      if (
        !Number.isInteger(
          rating
        )
        ||
        rating < 1
        ||
        rating > 5
      ) {

        throw new HttpsError(
          'invalid-argument',
          'La evaluación debe estar entre 1 y 5.'
        );
      }


      if (
        comment.length < 3
      ) {

        throw new HttpsError(
          'invalid-argument',
          'El comentario es demasiado corto.'
        );
      }


      if (
        comment.length > 500
      ) {

        throw new HttpsError(
          'invalid-argument',
          'El comentario no puede superar 500 caracteres.'
        );
      }


      /*
       * =====================================
       * REFERENCIAS
       * =====================================
       */

      const serviceRef =
        db
          .collection(
            'serviceRequests'
          )
          .doc(
            requestId
          );


      const reviewRef =
        db
          .collection(
            'reviews'
          )
          .doc(
            requestId
          );


      /*
       * =====================================
       * TRANSACCIÓN
       * =====================================
       */

      const result =
        await db
          .runTransaction(
            async transaction => {


              /*
               * ---------------------------------
               * SERVICE REQUEST
               * ---------------------------------
               */

              const serviceSnapshot =
                await transaction
                  .get(
                    serviceRef
                  );


              if (
                !serviceSnapshot.exists
              ) {

                throw new HttpsError(
                  'not-found',
                  'El servicio no existe.'
                );
              }


              const service =
                serviceSnapshot.data()
                ?? {};


              /*
               * ---------------------------------
               * PROPIETARIO
               * ---------------------------------
               */

              if (
                service[
                  'clientId'
                ] !==
                clientId
              ) {

                throw new HttpsError(
                  'permission-denied',
                  'Solo el cliente propietario puede evaluar.'
                );
              }


              /*
               * ---------------------------------
               * COMPLETED
               * ---------------------------------
               */

              if (
                service[
                  'status'
                ] !==
                'completed'
              ) {

                throw new HttpsError(
                  'failed-precondition',
                  'Solo puedes evaluar un servicio finalizado.'
                );
              }
/*
 * ---------------------------------
 * PAGO COMPLETADO
 * ---------------------------------
 *
 * La evaluación solamente se habilita
 * cuando el servicio fue finalizado
 * y su pago fue aprobado.
 */

if (
  service[
    'paymentStatus'
  ] !==
  'paid'
) {

  throw new HttpsError(
    'failed-precondition',
    'Debes completar el pago antes de evaluar el servicio.'
  );
}

              /*
               * ---------------------------------
               * TÉCNICO
               * ---------------------------------
               */

              const technicianId =
                service[
                  'assignedTechnicianId'
                ]
                ?? '';


              if (
                !technicianId
              ) {

                throw new HttpsError(
                  'failed-precondition',
                  'El servicio no tiene técnico asignado.'
                );
              }


              const technicianRef =
                db
                  .collection(
                    'users'
                  )
                  .doc(
                    technicianId
                  );


              /*
               * ---------------------------------
               * REVIEW EXISTENTE
               * ---------------------------------
               */

              const reviewSnapshot =
                await transaction
                  .get(
                    reviewRef
                  );


              if (
                reviewSnapshot.exists
              ) {

                throw new HttpsError(
                  'already-exists',
                  'Este servicio ya fue evaluado.'
                );
              }


              /*
               * ---------------------------------
               * PERFIL TÉCNICO
               * ---------------------------------
               */

              const technicianSnapshot =
                await transaction
                  .get(
                    technicianRef
                  );


              if (
                !technicianSnapshot.exists
              ) {

                throw new HttpsError(
                  'not-found',
                  'No encontramos el perfil del técnico.'
                );
              }


              const technician =
                technicianSnapshot.data()
                ?? {};


              const currentRatingCount =
                typeof technician[
                  'ratingCount'
                ] ===
                'number'
                  ? technician[
                    'ratingCount'
                  ]
                  : 0;


              const currentAverage =
                typeof technician[
                  'averageRating'
                ] ===
                'number'
                  ? technician[
                    'averageRating'
                  ]
                  : 0;


              /*
               * =================================
               * NUEVO PROMEDIO
               * =================================
               */

              const newRatingCount =
                currentRatingCount
                +
                1;


              const newAverageRating =
                Number(
                  (
                    (
                      (
                        currentAverage
                        *
                        currentRatingCount
                      )
                      +
                      rating
                    )
                    /
                    newRatingCount
                  )
                    .toFixed(
                      2
                    )
                );


              /*
               * =================================
               * CREAR REVIEW
               * =================================
               */

              transaction.set(
                reviewRef,
                {

                  id:
                    requestId,

                  requestId,

                  clientId,

                  technicianId,

                  rating,

                  comment,

                  createdAt:
                    FieldValue
                      .serverTimestamp(),

                  updatedAt:
                    FieldValue
                      .serverTimestamp()
                }
              );


              /*
               * =================================
               * ACTUALIZAR TÉCNICO
               * =================================
               */

              transaction.update(
                technicianRef,
                {

                  averageRating:
                    newAverageRating,

                  ratingCount:
                    newRatingCount,

                  updatedAt:
                    FieldValue
                      .serverTimestamp()
                }
              );


              /*
               * =================================
               * MARCAR SERVICE REQUEST
               * =================================
               */

              transaction.update(
                serviceRef,
                {

                  reviewId:
                    requestId,

                  reviewedAt:
                    FieldValue
                      .serverTimestamp(),

                  updatedAt:
                    FieldValue
                      .serverTimestamp()
                }
              );


              return {

                reviewId:
                  requestId,

                technicianId,

                averageRating:
                  newAverageRating,

                ratingCount:
                  newRatingCount
              };
            }
          );


      /*
       * =====================================
       * LOG
       * =====================================
       */

      logger.info(
        'Evaluación registrada.',
        {

          requestId,

          clientId,

          technicianId:
            result
              .technicianId,

          rating,

          averageRating:
            result
              .averageRating,

          ratingCount:
            result
              .ratingCount
        }
      );


      return {

        ok:
          true,

        reviewId:
          result
            .reviewId,

        technicianId:
          result
            .technicianId,

        rating,

        comment,

        averageRating:
          result
            .averageRating,

        ratingCount:
          result
            .ratingCount
      };
    }
  );

  /*
 * ============================================================
 * GEOCODIFICAR DIRECCIÓN
 * ============================================================
 *
 * Convierte:
 *
 * address + commune
 *
 * en:
 *
 * latitude + longitude
 *
 * La geocodificación se ejecuta en backend.
 *
 * El frontend NO consulta directamente al proveedor.
 *
 * MVP:
 * Nominatim / OpenStreetMap.
 *
 * Más adelante podemos sustituir el proveedor por:
 *
 * - Google Maps
 * - Google Geocoding
 * - Mapbox
 * - HERE
 *
 * sin modificar el frontend.
 */

export const geocodeAddress =
  onCall(
    {
      region:
        'southamerica-west1'
    },

    async request => {


      /*
       * =====================================
       * AUTENTICACIÓN
       * =====================================
       */

      const userId =
        request.auth?.uid;


      if (
        !userId
      ) {

        throw new HttpsError(
          'unauthenticated',
          'Debes iniciar sesión para buscar una dirección.'
        );
      }


      /*
       * =====================================
       * INPUT
       * =====================================
       */

      const address =
        typeof request.data?.address ===
          'string'
          ? request.data.address.trim()
          : '';


      const commune =
        typeof request.data?.commune ===
          'string'
          ? request.data.commune.trim()
          : '';


      /*
       * =====================================
       * VALIDACIONES
       * =====================================
       */

      if (
        address.length < 4
      ) {

        throw new HttpsError(
          'invalid-argument',
          'Ingresa una dirección válida.'
        );
      }


      if (
        commune.length < 2
      ) {

        throw new HttpsError(
          'invalid-argument',
          'Ingresa una comuna válida.'
        );
      }


      if (
        address.length > 180
        ||
        commune.length > 100
      ) {

        throw new HttpsError(
          'invalid-argument',
          'La dirección ingresada es demasiado extensa.'
        );
      }


      /*
       * =====================================
       * CONSULTA
       * =====================================
       *
       * Limitamos explícitamente la búsqueda
       * a Chile.
       */

      const searchText =
        `${address}, ${commune}, Chile`;


      const params =
        new URLSearchParams({
          q:
            searchText,

          format:
            'jsonv2',

          limit:
            '1',

          countrycodes:
            'cl',

          addressdetails:
            '1'
        });


      const url =
        `https://nominatim.openstreetmap.org/search?${params.toString()}`;


      try {


        logger.info(
          'Geocodificando dirección.',
          {
            userId,
            commune
          }
        );


        /*
         * =====================================
         * NOMINATIM
         * =====================================
         */

        const response =
          await fetch(
            url,
            {
              method:
                'GET',

              headers: {

                /*
                 * Nominatim requiere identificar
                 * correctamente la aplicación.
                 */

                'User-Agent':
                  'ServiGo/1.0',

                'Accept':
                  'application/json',

                'Accept-Language':
                  'es-CL,es;q=0.9'
              }
            }
          );


        /*
         * =====================================
         * ERROR HTTP
         * =====================================
         */

        if (
          !response.ok
        ) {

          logger.error(
            'Proveedor de geocodificación respondió con error.',
            {
              status:
                response.status,

              statusText:
                response.statusText
            }
          );


          throw new HttpsError(
            'unavailable',
            'El servicio de ubicación no está disponible temporalmente.'
          );
        }


        /*
         * =====================================
         * RESPUESTA
         * =====================================
         */

        const results =
          await response.json() as Array<{
            lat?: string;
            lon?: string;
            display_name?: string;

            address?: {
              road?: string;
              house_number?: string;
              suburb?: string;
              city?: string;
              town?: string;
              village?: string;
              municipality?: string;
              state?: string;
              country?: string;
            };
          }>;


        /*
         * =====================================
         * SIN RESULTADOS
         * =====================================
         */

        if (
          !Array.isArray(
            results
          )
          ||
          results.length ===
            0
        ) {

          logger.info(
            'Dirección no encontrada.',
            {
              userId,
              commune
            }
          );


          throw new HttpsError(
            'not-found',
            'No encontramos esa dirección. Revisa la dirección y la comuna.'
          );
        }


        const result =
          results[0];


        /*
         * =====================================
         * COORDENADAS
         * =====================================
         */

        const latitude =
          Number(
            result.lat
          );


        const longitude =
          Number(
            result.lon
          );


        if (
          !Number.isFinite(
            latitude
          )
          ||
          !Number.isFinite(
            longitude
          )
          ||
          latitude < -90
          ||
          latitude > 90
          ||
          longitude < -180
          ||
          longitude > 180
        ) {

          logger.error(
            'Proveedor entregó coordenadas inválidas.',
            {
              userId,
              commune
            }
          );


          throw new HttpsError(
            'internal',
            'La dirección encontrada no contiene coordenadas válidas.'
          );
        }


        /*
         * =====================================
         * RESULTADO
         * =====================================
         */

        const displayName =
          typeof result.display_name ===
            'string'
            ? result.display_name
            : searchText;


        logger.info(
          'Dirección geocodificada correctamente.',
          {
            userId,
            commune,
            latitude,
            longitude
          }
        );


        return {

          ok:
            true,

          latitude,

          longitude,

          displayName,

          address,

          commune
        };


      } catch (error) {


        /*
         * Conservamos nuestros errores
         * controlados.
         */

        if (
          error instanceof
          HttpsError
        ) {

          throw error;
        }


        logger.error(
          'Error geocodificando dirección.',
          {
            userId,
            commune,
            error
          }
        );


        throw new HttpsError(
          'unavailable',
          'No pudimos localizar la dirección en este momento.'
        );
      }
    }
  );
/*
 * ============================================================
 * CANCELAR SERVICIO
 * ============================================================
 *
 * Cancelación autoritativa de una solicitud ServiGo.
 *
 * Puede cancelar:
 *
 * CLIENTE:
 *
 * published
 * matched
 * quoted
 * accepted
 * en_route
 * arrived
 *
 * TÉCNICO:
 *
 * accepted
 * en_route
 * arrived
 *
 * NO se permite cancelar:
 *
 * in_progress
 * completed
 * cancelled
 *
 * Se conserva:
 *
 * assignedTechnicianId
 * acceptedQuoteId
 *
 * para mantener trazabilidad histórica.
 *
 * Si existía ubicación compartida del técnico,
 * se elimina desde backend.
 */

export const cancelService =
  onCall(
    {
      region:
        'southamerica-west1'
    },

    async request => {


      /*
       * =====================================
       * AUTENTICACIÓN
       * =====================================
       */

      const userId =
        request.auth?.uid;


      if (
        !userId
      ) {

        throw new HttpsError(
          'unauthenticated',
          'Debes iniciar sesión para cancelar un servicio.'
        );
      }


      /*
       * =====================================
       * DATOS
       * =====================================
       */

      const requestId =
        typeof request.data?.requestId ===
          'string'
          ? request.data.requestId.trim()
          : '';


      const reason =
        typeof request.data?.reason ===
          'string'
          ? request.data.reason.trim()
          : '';


      if (
        !requestId
      ) {

        throw new HttpsError(
          'invalid-argument',
          'requestId es obligatorio.'
        );
      }


      if (
        reason.length < 5
      ) {

        throw new HttpsError(
          'invalid-argument',
          'Debes indicar el motivo de la cancelación.'
        );
      }


      if (
        reason.length > 500
      ) {

        throw new HttpsError(
          'invalid-argument',
          'El motivo de cancelación es demasiado extenso.'
        );
      }


      /*
       * =====================================
       * REFERENCIAS
       * =====================================
       */

      const requestRef =
        db
          .collection(
            'serviceRequests'
          )
          .doc(
            requestId
          );


      try {


        /*
         * =====================================
         * TRANSACCIÓN
         * =====================================
         */

        const result =
          await db.runTransaction(
            async transaction => {


              const snapshot =
                await transaction.get(
                  requestRef
                );


              if (
                !snapshot.exists
              ) {

                throw new HttpsError(
                  'not-found',
                  'El servicio no existe.'
                );
              }


              const data =
                snapshot.data()
                ?? {};


              /*
               * =================================
               * DATOS DEL SERVICIO
               * =================================
               */

              const clientId =
                typeof data[
                  'clientId'
                ] ===
                  'string'
                  ? data[
                      'clientId'
                    ]
                  : '';


              const assignedTechnicianId =
                typeof data[
                  'assignedTechnicianId'
                ] ===
                  'string'
                  ? data[
                      'assignedTechnicianId'
                    ]
                  : '';


              const currentStatus =
                typeof data[
                  'status'
                ] ===
                  'string'
                  ? data[
                      'status'
                    ]
                  : '';


              const category =
                typeof data[
                  'category'
                ] ===
                  'string'
                  ? data[
                      'category'
                    ]
                  : 'Servicio';


              /*
               * =================================
               * ACTOR
               * =================================
               */

              const isClient =
                clientId ===
                userId;


              const isTechnician =
                assignedTechnicianId ===
                  userId;


              if (
                !isClient
                &&
                !isTechnician
              ) {

                throw new HttpsError(
                  'permission-denied',
                  'No tienes permisos para cancelar este servicio.'
                );
              }


              /*
               * =================================
               * ESTADOS FINALES / BLOQUEADOS
               * =================================
               */

              if (
                currentStatus ===
                  'cancelled'
              ) {

                throw new HttpsError(
                  'failed-precondition',
                  'El servicio ya está cancelado.'
                );
              }


              if (
                currentStatus ===
                  'completed'
              ) {

                throw new HttpsError(
                  'failed-precondition',
                  'Un servicio finalizado no puede cancelarse.'
                );
              }


              if (
                currentStatus ===
                  'in_progress'
              ) {

                throw new HttpsError(
                  'failed-precondition',
                  'Un trabajo que ya comenzó no puede cancelarse mediante este flujo.'
                );
              }


              /*
               * =================================
               * ESTADOS PERMITIDOS CLIENTE
               * =================================
               */

              const clientCanCancel =
                currentStatus ===
                  'published'
                ||
                currentStatus ===
                  'matched'
                ||
                currentStatus ===
                  'quoted'
                ||
                currentStatus ===
                  'accepted'
                ||
                currentStatus ===
                  'en_route'
                ||
                currentStatus ===
                  'arrived';


              /*
               * =================================
               * ESTADOS PERMITIDOS TÉCNICO
               * =================================
               */

              const technicianCanCancel =
                currentStatus ===
                  'accepted'
                ||
                currentStatus ===
                  'en_route'
                ||
                currentStatus ===
                  'arrived';


              if (
                isClient
                &&
                !clientCanCancel
              ) {

                throw new HttpsError(
                  'failed-precondition',
                  'La solicitud ya no puede ser cancelada por el cliente.'
                );
              }


              if (
                isTechnician
                &&
                !technicianCanCancel
              ) {

                throw new HttpsError(
                  'failed-precondition',
                  'El trabajo ya no puede ser cancelado por el técnico.'
                );
              }


              /*
               * =================================
               * TIPO DE ACTOR
               * =================================
               */

              const cancelledBy:
                'client'
                | 'technician' =
                  isClient
                    ? 'client'
                    : 'technician';


              const now =
                FieldValue
                  .serverTimestamp();


              /*
               * =================================
               * ACTUALIZAR SERVICIO
               * =================================
               */

              transaction.update(
                requestRef,
                {

                  status:
                    'cancelled',

                  previousStatus:
                    currentStatus,

                  cancelledAt:
                    now,

                  cancelledBy,

                  cancelledByUserId:
                    userId,

                  cancellationReason:
                    reason,

                  updatedAt:
                    now
                }
              );


              /*
               * =================================
               * RESULTADO TRANSACCIÓN
               * =================================
               */

              return {

                requestId,

                category,

                clientId,

                assignedTechnicianId,

                previousStatus:
                  currentStatus,

                cancelledBy
              };
            }
          );


        /*
         * =====================================
         * ELIMINAR UBICACIÓN COMPARTIDA
         * =====================================
         *
         * Lo hacemos incluso si por alguna
         * inconsistencia existiera ubicación
         * fuera de en_route.
         *
         * La privacidad tiene prioridad.
         */

        if (
          result.assignedTechnicianId
        ) {

          const locationRef =
            db
              .collection(
                'technicianLocations'
              )
              .doc(
                result.assignedTechnicianId
              );


          try {

            await locationRef
              .delete();


            logger.info(
              'Ubicación compartida eliminada por cancelación.',
              {
                requestId:
                  result.requestId,

                technicianId:
                  result.assignedTechnicianId
              }
            );


          } catch (locationError) {

            /*
             * La cancelación ya fue realizada.
             *
             * Un error limpiando GPS se registra,
             * pero no revierte el estado.
             */

            logger.error(
              'Error eliminando ubicación después de cancelación.',
              {
                requestId:
                  result.requestId,

                technicianId:
                  result.assignedTechnicianId,

                error:
                  locationError instanceof
                    Error
                    ? locationError.message
                    : String(
                        locationError
                      )
              }
            );
          }
        }


        /*
         * =====================================
         * PUSH
         * =====================================
         */

        if (
          result.cancelledBy ===
            'client'
        ) {


          /*
           * Solo notificamos técnico si ya
           * existía uno contratado/asignado.
           */

          if (
            result.assignedTechnicianId
          ) {

            await sendPushToUser(

              result.assignedTechnicianId,

              'Servicio cancelado',

              `El cliente canceló el servicio de ${result.category}.`,

              {

                requestId:
                  result.requestId,

                type:
                  'technician_service_cancelled',

                category:
                  result.category
              }
            );
          }


        } else {


          /*
           * Técnico cancela:
           * notificamos al cliente propietario.
           */

          if (
            result.clientId
          ) {

            await sendPushToUser(

              result.clientId,

              'Servicio cancelado por el técnico',

              `El técnico canceló el servicio de ${result.category}.`,

              {

                requestId:
                  result.requestId,

                type:
                  'client_service_cancelled',

                category:
                  result.category
              }
            );
          }
        }


        /*
         * =====================================
         * LOG
         * =====================================
         */

        logger.info(
          'Servicio cancelado correctamente.',
          {
            requestId:
              result.requestId,

            cancelledBy:
              result.cancelledBy,

            previousStatus:
              result.previousStatus,

            userId
          }
        );


        /*
         * =====================================
         * RESPUESTA
         * =====================================
         */

        return {

          ok:
            true,

          requestId:
            result.requestId,

          status:
            'cancelled',

          previousStatus:
            result.previousStatus,

          cancelledBy:
            result.cancelledBy
        };


      } catch (error) {


        if (
          error instanceof
          HttpsError
        ) {

          throw error;
        }


        logger.error(
          'Error cancelando servicio.',
          {
            requestId,
            userId,

            error:
              error instanceof
                Error
                ? error.message
                : String(
                    error
                  )
          }
        );


        throw new HttpsError(
          'internal',
          'No fue posible cancelar el servicio.'
        );
      }
    }
  );

  /*
 * ============================================================
 * NUEVO MENSAJE DE CHAT
 * ============================================================
 *
 * Trigger:
 *
 * serviceRequests/{requestId}/messages/{messageId}
 *
 * Responsabilidad:
 *
 * - validar el mensaje creado
 * - obtener el servicio padre
 * - identificar al remitente
 * - identificar a la contraparte
 * - enviar Push solamente a la contraparte
 *
 * El cliente nunca decide el destinatario.
 * El backend lo obtiene desde serviceRequests.
 */

export const onChatMessageCreated =
  onDocumentCreated(
    {
      document:
        'serviceRequests/{requestId}/messages/{messageId}',

      region:
        'southamerica-west1'
    },

    async event => {


      /*
       * =====================================
       * SNAPSHOT
       * =====================================
       */

      const snapshot =
        event.data;


      if (
        !snapshot
      ) {

        logger.warn(
          'Mensaje de chat sin snapshot.'
        );


        return;
      }


      const message =
        snapshot.data();


      /*
       * =====================================
       * PARÁMETROS
       * =====================================
       */

      const requestId =
        event.params[
          'requestId'
        ];


      const messageId =
        event.params[
          'messageId'
        ];


      const senderId =
        typeof message[
          'senderId'
        ] ===
          'string'
          ? message[
              'senderId'
            ].trim()
          : '';


      const senderName =
        typeof message[
          'senderName'
        ] ===
          'string'
          ? message[
              'senderName'
            ].trim()
          : 'Usuario ServiGo';


      const text =
        typeof message[
          'text'
        ] ===
          'string'
          ? message[
              'text'
            ].trim()
          : '';


      /*
       * =====================================
       * VALIDACIÓN BÁSICA
       * =====================================
       */

      if (
        !requestId
        ||
        !senderId
        ||
        !text
      ) {

        logger.warn(
          'Push de chat omitido: mensaje incompleto.',
          {
            requestId,
            messageId,
            senderId
          }
        );


        return;
      }


      /*
       * =====================================
       * SERVICIO PADRE
       * =====================================
       */

      const requestSnapshot =
        await db
          .collection(
            'serviceRequests'
          )
          .doc(
            requestId
          )
          .get();


      if (
        !requestSnapshot.exists
      ) {

        logger.warn(
          'Push de chat omitido: servicio no encontrado.',
          {
            requestId,
            messageId
          }
        );


        return;
      }


      const serviceRequest =
        requestSnapshot.data()
        ?? {};


      const clientId =
        typeof serviceRequest[
          'clientId'
        ] ===
          'string'
          ? serviceRequest[
              'clientId'
            ]
          : '';


      const technicianId =
        typeof serviceRequest[
          'assignedTechnicianId'
        ] ===
          'string'
          ? serviceRequest[
              'assignedTechnicianId'
            ]
          : '';


      const category =
        typeof serviceRequest[
          'category'
        ] ===
          'string'
          ? serviceRequest[
              'category'
            ]
          : 'servicio';


      /*
       * =====================================
       * IDENTIFICAR DESTINATARIO
       * =====================================
       *
       * Cliente escribió:
       *
       * → Push al técnico.
       *
       * Técnico escribió:
       *
       * → Push al cliente.
       */

      let recipientId =
        '';


      let pushType:
        ServiGoPushData[
          'type'
        ];


      if (
        senderId ===
          clientId
      ) {

        if (
          !technicianId
        ) {

          logger.info(
            'Push de chat omitido: servicio sin técnico asignado.',
            {
              requestId,
              messageId
            }
          );


          return;
        }


        recipientId =
          technicianId;


        pushType =
          'technician_new_message';


      } else if (
        senderId ===
          technicianId
      ) {

        if (
          !clientId
        ) {

          logger.warn(
            'Push de chat omitido: servicio sin cliente.',
            {
              requestId,
              messageId
            }
          );


          return;
        }


        recipientId =
          clientId;


        pushType =
          'client_new_message';


      } else {

        /*
         * Protección adicional.
         *
         * Firestore Rules ya impide que un
         * tercero cree el mensaje desde la app,
         * pero el trigger también valida la
         * relación de participantes.
         */

        logger.warn(
          'Push de chat omitido: remitente no participa del servicio.',
          {
            requestId,
            messageId,
            senderId
          }
        );


        return;
      }


      /*
       * =====================================
       * PREVIEW
       * =====================================
       *
       * Evitamos colocar mensajes demasiado
       * extensos en la notificación.
       */

      const maxPreviewLength =
        120;


      const preview =
        text.length >
          maxPreviewLength
          ? `${text.substring(
              0,
              maxPreviewLength
            )}…`
          : text;


      /*
       * =====================================
       * PUSH
       * =====================================
       */

      await sendPushToUser(

        recipientId,

        `Nuevo mensaje de ${senderName}`,

        preview,

        {
          requestId,

          type:
            pushType,

          category
        }
      );


      logger.info(
        'Push de nuevo mensaje procesado.',
        {
          requestId,
          messageId,
          senderId,
          recipientId,
          type:
            pushType
        }
      );
    }
  );