import {
  Injectable
} from '@angular/core';

import {
  collection,
  DocumentData,
  getDocs,
  query,
  Timestamp,
  where
} from 'firebase/firestore';

import {
  firestore
} from '../firebase/firebase';

import {
  TechnicianApplicationService
} from './technician-application.service';

import {
  ServiceRequest,
  ServiceRequestStatus,
  ServiceUrgency
} from '../models/service-request.model';


export interface TechnicianOpportunity {

  request:
    ServiceRequest;

  matchScore:
    number;

  matchReasons:
    string[];
}


@Injectable({
  providedIn: 'root'
})
export class MatchingService {


  constructor(
    private readonly technicianApplicationService:
      TechnicianApplicationService
  ) {}


  async getOpportunitiesForTechnician(
    technicianUserId: string
  ): Promise<TechnicianOpportunity[]> {

    /*
     * Recuperamos la postulación profesional
     * más reciente del usuario.
     */
    const technicianApplication =
      await this.technicianApplicationService
        .getLatestApplication(
          technicianUserId
        );


    /*
     * Solo técnicos aprobados
     * reciben oportunidades.
     */
    if (
      !technicianApplication
      ||
      technicianApplication.status
        !== 'approved'
    ) {

      return [];
    }


    /*
     * Traemos solicitudes actualmente
     * publicadas.
     */
    const requestsQuery =
      query(
        collection(
          firestore,
          'serviceRequests'
        ),

        where(
          'status',
          '==',
          'published'
        )
      );


    const result =
      await getDocs(
        requestsQuery
      );


    const publishedRequests =
      result.docs
        .map(
          snapshot =>
            this.mapRequest(
              snapshot.data()
            )
        );


    const technicianSpecialties =
      technicianApplication
        .specialties
        .map(
          specialty =>
            this.normalizeText(
              specialty
            )
        );


    const technicianCommune =
      this.normalizeText(
        technicianApplication
          .baseCommune
      );


    const opportunities:
      TechnicianOpportunity[] = [];


    for (
      const request
      of publishedRequests
    ) {

      /*
       * Un técnico no debe recibir
       * solicitudes creadas por él mismo.
       */
      if (
        request.clientId ===
        technicianUserId
      ) {

        continue;
      }


      const requestCategory =
        this.normalizeText(
          request.category
        );


      const requestCommune =
        this.normalizeText(
          request.commune
        );


      /*
       * Regla 1:
       * especialidad compatible.
       */
      const specialtyMatch =
        technicianSpecialties
          .includes(
            requestCategory
          );


      if (
        !specialtyMatch
      ) {

        continue;
      }


      /*
       * Regla 2 de esta primera versión:
       * misma comuna.
       */
      const communeMatch =
        technicianCommune ===
        requestCommune;


      if (
        !communeMatch
      ) {

        continue;
      }


      const matchReasons:
        string[] = [
          'Especialidad compatible',
          'Misma comuna'
        ];


      let matchScore = 80;


      /*
       * Priorizamos ligeramente
       * las solicitudes urgentes.
       */
      if (
        request.urgency ===
        'urgent'
      ) {

        matchScore += 15;

        matchReasons.push(
          'Solicitud urgente'
        );

      } else if (
        request.urgency ===
        'soon'
      ) {

        matchScore += 5;

        matchReasons.push(
          'Solicitud prioritaria'
        );
      }


      opportunities.push({

        request,

        matchScore,

        matchReasons
      });
    }


    /*
     * Mayor score primero.
     * Si empatan, solicitud más antigua primero.
     */
    return opportunities
      .sort(
        (
          a,
          b
        ) => {

          if (
            b.matchScore !==
            a.matchScore
          ) {

            return (
              b.matchScore -
              a.matchScore
            );
          }


          const dateA =
            a.request
              .createdAt
              ?.getTime()
            ?? 0;


          const dateB =
            b.request
              .createdAt
              ?.getTime()
            ?? 0;


          return (
            dateA -
            dateB
          );
        }
      );
  }


  private normalizeText(
    value: string
  ): string {

    return value
      .normalize('NFD')
      .replace(
        /[\u0300-\u036f]/g,
        ''
      )
      .trim()
      .toLowerCase();
  }


  private mapRequest(
    data: DocumentData
  ): ServiceRequest {

    return {

      id:
        data['id'] ?? '',

      clientId:
        data['clientId'] ?? '',

      clientName:
        data['clientName'] ?? '',

      category:
        data['category'] ?? '',

      description:
        data['description'] ?? '',

      address:
        data['address'] ?? '',

      commune:
        data['commune'] ?? '',

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
        data['timeSlot'] ?? '',

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


/*
 * =====================================
 * ESTADO ECONÓMICO
 * =====================================
 *
 * Compatibilidad con solicitudes
 * creadas antes del módulo de pagos.
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