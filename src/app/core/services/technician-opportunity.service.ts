import {
  Injectable
} from '@angular/core';

import {
  collection,
  doc,
  DocumentData,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where
} from 'firebase/firestore';

import {
  firestore
} from '../firebase/firebase';

import {
  TechnicianOpportunityRecord,
  TechnicianOpportunityStatus,
  OpportunityNotificationPriority
} from '../models/technician-opportunity.model';

import {
  ServiceRequest,
  ServiceRequestStatus,
  ServiceUrgency
} from '../models/service-request.model';


/*
 * =========================================
 * MODELO PARA LA INTERFAZ
 * =========================================
 *
 * technicianOpportunities:
 * contiene los datos del matching.
 *
 * serviceRequests:
 * contiene los datos reales del servicio.
 *
 * De esta manera evitamos duplicar
 * información de la solicitud.
 */

export interface TechnicianOpportunityView {

  opportunity:
    TechnicianOpportunityRecord;

  request:
    ServiceRequest;
}


@Injectable({
  providedIn: 'root'
})
export class TechnicianOpportunityService {


  /*
   * =========================================
   * OPORTUNIDADES DISPONIBLES
   * =========================================
   */

  async getAvailableOpportunities(
    technicianId: string
  ): Promise<
    TechnicianOpportunityView[]
  > {


    /*
     * Recuperamos exclusivamente las
     * oportunidades pertenecientes
     * al técnico autenticado.
     */

    const opportunitiesQuery =
      query(
        collection(
          firestore,
          'technicianOpportunities'
        ),

        where(
          'technicianId',
          '==',
          technicianId
        )
      );


    const opportunitySnapshot =
      await getDocs(
        opportunitiesQuery
      );


    /*
     * Una oportunidad continúa visible
     * mientras esté:
     *
     * - available
     * - viewed
     */

    const opportunities =
      opportunitySnapshot.docs

        .map(
          snapshot =>
            this.mapOpportunity(
              snapshot.data()
            )
        )

        .filter(
          opportunity =>
            opportunity.status ===
              'available'
            ||
            opportunity.status ===
              'viewed'
        );


    /*
     * =========================================
     * ENRIQUECER CON SERVICE REQUEST
     * =========================================
     */

    const enriched =
      await Promise.all(

        opportunities.map(
          async opportunity => {


            const requestRef =
              doc(
                firestore,
                'serviceRequests',
                opportunity.requestId
              );


            const requestSnapshot =
              await getDoc(
                requestRef
              );


            /*
             * Si la solicitud ya no existe,
             * no podemos mostrar una
             * oportunidad válida.
             */

            if (
              !requestSnapshot.exists()
            ) {

              return null;
            }


            const request =
              this.mapRequest(
                requestSnapshot.data()
              );


            /*
             * La solicitud solamente puede
             * continuar como oportunidad
             * mientras permanezca publicada.
             */

            if (
              request.status !==
              'published'
            ) {

              return null;
            }


            return {

              opportunity,

              request

            } satisfies
              TechnicianOpportunityView;
          }
        )
      );


    /*
     * =========================================
     * ORDEN
     * =========================================
     *
     * 1. Mayor compatibilidad.
     * 2. Más reciente.
     */

    return enriched
      .filter(
        (
          item
        ): item is TechnicianOpportunityView =>
          item !== null
      )
      .sort(
        (
          a,
          b
        ) => {


          if (
            b.opportunity.matchScore !==
            a.opportunity.matchScore
          ) {

            return (
              b.opportunity.matchScore -
              a.opportunity.matchScore
            );
          }


          const dateA =
            a.opportunity.createdAt
              ?.getTime()
            ?? 0;


          const dateB =
            b.opportunity.createdAt
              ?.getTime()
            ?? 0;


          return (
            dateB -
            dateA
          );
        }
      );
  }


  /*
   * =========================================
   * MARCAR OPORTUNIDAD COMO VISTA
   * =========================================
   */

async getOpportunityByRequestId(
  technicianId: string,
  requestId: string
): Promise<
  TechnicianOpportunityView | null
> {

  const opportunityId =
    `${technicianId}_${requestId}`;


  const opportunityRef =
    doc(
      firestore,
      'technicianOpportunities',
      opportunityId
    );


  const opportunitySnapshot =
    await getDoc(
      opportunityRef
    );


  if (
    !opportunitySnapshot.exists()
  ) {

    return null;
  }


  const opportunity =
    this.mapOpportunity(
      opportunitySnapshot.data()
    );


  if (
    opportunity.technicianId !==
    technicianId
  ) {

    return null;
  }


  if (
    opportunity.status !==
      'available'
    &&
    opportunity.status !==
      'viewed'
  ) {

    return null;
  }


  const requestRef =
    doc(
      firestore,
      'serviceRequests',
      requestId
    );


  const requestSnapshot =
    await getDoc(
      requestRef
    );


  if (
    !requestSnapshot.exists()
  ) {

    return null;
  }


  const request =
    this.mapRequest(
      requestSnapshot.data()
    );


  if (
    request.status !==
    'published'
  ) {

    return null;
  }


  return {

    opportunity,

    request
  };
}

  async markAsViewed(
    opportunityId: string
  ): Promise<void> {


    const opportunityRef =
      doc(
        firestore,
        'technicianOpportunities',
        opportunityId
      );


    await updateDoc(
      opportunityRef,
      {

        status:
          'viewed',

        viewedAt:
          serverTimestamp(),

        updatedAt:
          serverTimestamp()
      }
    );
  }


  /*
   * =========================================
   * MAP OPPORTUNITY
   * =========================================
   */

  private mapOpportunity(
    data: DocumentData
  ): TechnicianOpportunityRecord {


    return {

      id:
        data['id']
        ?? '',

      technicianId:
        data['technicianId']
        ?? '',

      requestId:
        data['requestId']
        ?? '',

      clientId:
        data['clientId']
        ?? '',

      category:
        data['category']
        ?? '',

      commune:
        data['commune']
        ?? '',

      matchScore:
        typeof data['matchScore']
          === 'number'
          ? data['matchScore']
          : 0,

      matchReasons:
        Array.isArray(
          data['matchReasons']
        )
          ? data['matchReasons']
          : [],

      status:
        (
          data['status']
          ?? 'available'
        ) as TechnicianOpportunityStatus,

      notificationPriority:
        (
          data[
            'notificationPriority'
          ]
          ?? 'standard'
        ) as OpportunityNotificationPriority,

      eligibleForPush:
        data['eligibleForPush']
        === true,

      technicianRating:
        typeof data[
          'technicianRating'
        ] === 'number'
          ? data[
            'technicianRating'
          ]
          : null,

      technicianRatingCount:
        typeof data[
          'technicianRatingCount'
        ] === 'number'
          ? data[
            'technicianRatingCount'
          ]
          : 0,

      createdAt:
        this.toDate(
          data['createdAt']
        ),

      updatedAt:
        this.toDate(
          data['updatedAt']
        ),

      notifiedAt:
        this.toDate(
          data['notifiedAt']
        ),

      viewedAt:
        this.toDate(
          data['viewedAt']
        )
    };
  }


  /*
   * =========================================
   * MAP SERVICE REQUEST
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
        typeof data['latitude']
          === 'number'
          ? data['latitude']
          : null,

      longitude:
        typeof data['longitude']
          === 'number'
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
        (
          data['urgency']
          ?? 'normal'
        ) as ServiceUrgency,

      photoUrls:
        Array.isArray(
          data['photoUrls']
        )
          ? data['photoUrls']
          : [],

      status:
        (
          data['status']
          ?? 'published'
        ) as ServiceRequestStatus,

      assignedTechnicianId:
        data['assignedTechnicianId']
        ?? null,

      acceptedQuoteId:
        data['acceptedQuoteId']
        ?? null,

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
   * FIRESTORE TIMESTAMP → DATE
   * =========================================
   */

  private toDate(
    value: unknown
  ): Date | null {


    if (
      value instanceof Timestamp
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