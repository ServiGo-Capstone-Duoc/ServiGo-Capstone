import {
  Injectable
} from '@angular/core';

import {
  collection,
  DocumentData,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where
} from 'firebase/firestore';

import {
  httpsCallable
} from 'firebase/functions';

import {
  firebaseFunctions,
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


interface UpdateJobStatusResponse {

  ok: boolean;

  requestId: string;

  status:
    | 'en_route'
    | 'arrived'
    | 'in_progress'
    | 'completed';

  previousStatus:
    | 'accepted'
    | 'en_route'
    | 'arrived'
    | 'in_progress';
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
   * TRABAJOS ACTIVOS DEL TÉCNICO
   * =========================================
   *
   * Solo aparecen trabajos que todavía
   * requieren gestión del técnico.
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
    request.status ===
      'accepted'
    ||
    request.status ===
      'en_route'
    ||
    request.status ===
      'arrived'
    ||
    request.status ===
      'in_progress'
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
 * HISTORIAL DEL TÉCNICO
 * =========================================
 *
 * Recupera trabajos que ya terminaron
 * su ciclo operativo.
 *
 * Por ahora:
 *
 * completed
 * cancelled
 *
 * Se mantiene separado de trabajos activos
 * para no alterar el comportamiento actual
 * del Home técnico.
 */



async getHistoryForTechnician(
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
        request.status ===
          'completed'
        ||
        request.status ===
          'cancelled'
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
   * DETALLE DE TRABAJO DEL TÉCNICO
   * =========================================
   *
   * Permite recuperar también un trabajo
   * completed, por ejemplo al refrescar
   * la pantalla después de finalizarlo.
   */

  async getRequestForTechnician(
    requestId: string,
    technicianId: string
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


    const request =
      this.mapRequest(
        snapshot.data()
      );


    if (
      request.assignedTechnicianId !==
      technicianId
    ) {

      return null;
    }


    return request;
  }

/*
 * =========================================
 * IR AL DOMICILIO
 * =========================================
 *
 * accepted -> en_route
 */

async startTrip(
  requestId: string
): Promise<void> {

  await this.updateJobStatus(
    requestId,
    'start_trip'
  );
}


/*
 * =========================================
 * MARCAR LLEGADA
 * =========================================
 *
 * en_route -> arrived
 */

async markArrived(
  requestId: string
): Promise<void> {

  await this.updateJobStatus(
    requestId,
    'arrive'
  );
}


/*
 * =========================================
 * INICIAR TRABAJO
 * =========================================
 *
 * arrived -> in_progress
 */

async startJob(
  requestId: string
): Promise<void> {

  await this.updateJobStatus(
    requestId,
    'start'
  );
}


/*
 * =========================================
 * FINALIZAR TRABAJO
 * =========================================
 *
 * in_progress -> completed
 */

async completeJob(
  requestId: string
): Promise<void> {

  await this.updateJobStatus(
    requestId,
    'complete'
  );
}

/*
 * =========================================
 * CANCELAR SERVICIO
 * =========================================
 *
 * La cancelación se ejecuta exclusivamente
 * mediante la Callable cancelService.
 *
 * El frontend solamente entrega:
 *
 * - requestId
 * - reason
 *
 * El backend determina de forma autoritativa:
 *
 * - usuario autenticado
 * - cliente o técnico
 * - permisos
 * - estado actual
 * - si puede cancelar
 * - auditoría
 * - limpieza GPS
 * - notificaciones Push
 */

async cancelService(
  requestId: string,
  reason: string
): Promise<void> {


  /*
   * =====================================
   * NORMALIZAR DATOS
   * =====================================
   */

  const normalizedRequestId =
    requestId.trim();


  const normalizedReason =
    reason.trim();


  /*
   * =====================================
   * VALIDACIÓN LOCAL BÁSICA
   * =====================================
   *
   * Estas validaciones mejoran UX.
   *
   * La seguridad real sigue estando
   * en backend.
   */

  if (
    !normalizedRequestId
  ) {

    throw new Error(
      'cancel-service-request-id-required'
    );
  }


  if (
    normalizedReason.length <
    5
  ) {

    throw new Error(
      'cancel-service-reason-required'
    );
  }


  /*
   * =====================================
   * CALLABLE
   * =====================================
   */

  const cancelServiceFunction =
    httpsCallable<
      {
        requestId: string;
        reason: string;
      },
      {
        ok: boolean;

        requestId: string;

        status:
          'cancelled';

        previousStatus:
          ServiceRequestStatus;

        cancelledBy:
          | 'client'
          | 'technician';
      }
    >(
      firebaseFunctions,
      'cancelService'
    );


  /*
   * =====================================
   * EJECUTAR
   * =====================================
   */

  const response =
    await cancelServiceFunction({

      requestId:
        normalizedRequestId,

      reason:
        normalizedReason
    });


  /*
   * =====================================
   * VALIDAR RESPUESTA
   * =====================================
   */

  if (
    !response.data.ok
    ||
    response.data.status !==
    'cancelled'
  ) {

    throw new Error(
      'cancel-service-failed'
    );
  }


  console.log(
    '[ServiGo] Servicio cancelado por backend:',
    response.data
  );
}
/*
 * =========================================
 * CALLABLE - ESTADO DEL TRABAJO
 * =========================================
 */

private async updateJobStatus(
  requestId: string,

  action:
    | 'start_trip'
    | 'arrive'
    | 'start'
    | 'complete'
): Promise<void> {


  const updateJobStatusFunction =
    httpsCallable<
      {
        requestId: string;

        action:
          | 'start_trip'
          | 'arrive'
          | 'start'
          | 'complete';
      },
      {
        ok: boolean;

        requestId: string;

        status:
          | 'en_route'
          | 'arrived'
          | 'in_progress'
          | 'completed';

        previousStatus:
          | 'accepted'
          | 'en_route'
          | 'arrived'
          | 'in_progress';
      }
    >(
      firebaseFunctions,
      'updateJobStatus'
    );


  const response =
    await updateJobStatusFunction({
      requestId,
      action
    });


  if (
    !response.data.ok
  ) {

    throw new Error(
      'update-job-status-failed'
    );
  }


  console.log(
    '[ServiGo] Estado de trabajo actualizado por backend:',
    response.data
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

/*
 * =====================================
 * ESTADO ECONÓMICO
 * =====================================
 */

paymentStatus:
  'pending',

paymentId:
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


  private parseDate(
    value: string
  ): Timestamp | null {

    if (
      !value
    ) {

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
