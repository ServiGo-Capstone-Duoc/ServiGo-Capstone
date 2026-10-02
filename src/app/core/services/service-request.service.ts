import {
  Injectable
} from '@angular/core';

import {
  collection,
  DocumentData,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where
} from 'firebase/firestore';

import {
  firestore
} from '../firebase/firebase';

import {
  ServiceRequest,
  ServiceRequestStatus,
  ServiceUrgency
} from '../models/service-request.model';


export interface CreateServiceRequest {

  category: string;

  description: string;

  address: string;

  commune: string;

  latitude: number | null;

  longitude: number | null;

  preferredDate: string;

  timeSlot: string;

  urgency: ServiceUrgency;
}


@Injectable({
  providedIn: 'root'
})
export class ServiceRequestService {


  /*
   * =========================================
   * SOLICITUDES DEL CLIENTE
   * =========================================
   */

  async getRequestsForClient(
    clientId: string
  ): Promise<ServiceRequest[]> {

    const requestsQuery =
      query(
        collection(
          firestore,
          'serviceRequests'
        ),

        where(
          'clientId',
          '==',
          clientId
        )
      );


    const result =
      await getDocs(
        requestsQuery
      );


    return result.docs
      .map(
        snapshot =>
          this.mapRequest(
            snapshot.data()
          )
      )
      .sort(
        (
          a,
          b
        ) => {

          const dateA =
            a.createdAt
              ?.getTime()
            ?? 0;

          const dateB =
            b.createdAt
              ?.getTime()
            ?? 0;


          return dateB - dateA;
        }
      );
  }


  /*
   * =========================================
   * TRABAJOS ASIGNADOS AL TÉCNICO
   * =========================================
   */

  async getAssignedRequestsForTechnician(
    technicianId: string
  ): Promise<ServiceRequest[]> {

    const requestsQuery =
      query(
        collection(
          firestore,
          'serviceRequests'
        ),

        where(
          'assignedTechnicianId',
          '==',
          technicianId
        )
      );


    const result =
      await getDocs(
        requestsQuery
      );


    return result.docs
      .map(
        snapshot =>
          this.mapRequest(
            snapshot.data()
          )
      )
      .filter(
        request =>
          request.status === 'accepted'
          ||
          request.status === 'in_progress'
      )
      .sort(
        (
          a,
          b
        ) => {

          const dateA =
            a.updatedAt
              ?.getTime()
            ?? 0;

          const dateB =
            b.updatedAt
              ?.getTime()
            ?? 0;


          return dateB - dateA;
        }
      );
  }


  /*
   * =========================================
   * CREAR SOLICITUD
   * =========================================
   */

  async createRequest(
    clientId: string,
    clientName: string,
    data: CreateServiceRequest
  ): Promise<string> {

    const requestRef =
      doc(
        collection(
          firestore,
          'serviceRequests'
        )
      );


    const preferredDate =
      this.parseDate(
        data.preferredDate
      );


    await setDoc(
      requestRef,
      {

        id:
          requestRef.id,

        clientId,

        clientName:
          clientName.trim(),

        category:
          data.category,

        description:
          data.description.trim(),

        address:
          data.address.trim(),

        commune:
          data.commune.trim(),

        latitude:
          data.latitude,

        longitude:
          data.longitude,

        preferredDate,

        timeSlot:
          data.timeSlot,

        urgency:
          data.urgency,

        photoUrls: [],

        status:
          'published',

        assignedTechnicianId:
          null,

        acceptedQuoteId:
          null,

        createdAt:
          serverTimestamp(),

        updatedAt:
          serverTimestamp()
      }
    );


    return requestRef.id;
  }


  /*
   * =========================================
   * MAPEO
   * =========================================
   */

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


  private parseDate(
    value: string
  ): Timestamp | null {

    if (!value) {
      return null;
    }


    const [
      year,
      month,
      day
    ] =
      value
        .split('-')
        .map(Number);


    if (
      !year
      ||
      !month
      ||
      !day
    ) {

      return null;
    }


    return Timestamp.fromDate(
      new Date(
        year,
        month - 1,
        day,
        12,
        0,
        0
      )
    );
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