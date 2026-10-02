import {
  onDocumentCreated
} from 'firebase-functions/v2/firestore';

import {
  logger
} from 'firebase-functions';

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
function normalizeText(
  value: unknown
): string {

  if (
    typeof value !== 'string'
  ) {

    return '';
  }

  return value
    .normalize('NFD')
    .replace(
      /[\u0300-\u036f]/g,
      ''
    )
    .trim()
    .toLowerCase();
}


function buildOpportunityId(
  technicianId: string,
  requestId: string
): string {

  return `${technicianId}_${requestId}`;
}


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

      if (!snapshot) {

        logger.warn(
          'Solicitud creada sin snapshot.'
        );

        return;
      }


      const request =
        snapshot.data();

      const requestId =
        event.params.requestId;


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


      const clientId =
        request['clientId'] ?? '';

      const category =
        request['category'] ?? '';

      const commune =
        request['commune'] ?? '';

      const urgency =
        request['urgency'] ?? 'normal';


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


      for (
        const applicationDoc
        of applicationsSnapshot.docs
      ) {

        const application =
          applicationDoc.data();


        const technicianId =
          application['userId'] ?? '';


        if (
          !technicianId
          ||
          technicianId === clientId
        ) {

          continue;
        }


        const specialties =
          Array.isArray(
            application['specialties']
          )
            ? application['specialties']
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
          ] === 'number'
            ? user[
              'averageRating'
            ]
            : null;


        const technicianRatingCount =
          typeof user[
            'ratingCount'
          ] === 'number'
            ? user[
              'ratingCount'
            ]
            : 0;


        const eligibleForPush =
          technicianRatingCount === 0
          ||
          (
            technicianRating !== null
            &&
            technicianRating >= 4
          );


        const notificationPriority =
          eligibleForPush
            ? 'priority'
            : 'standard';


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
 * DEV/TEST:
 * creamos la oportunidad pero no
 * enviamos FCM real.
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
          tokenData['token'];

        const active =
          tokenData['active'];


        if (
          typeof token !== 'string'
          ||
          !token
          ||
          active !== true
        ) {

          continue;
        }


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