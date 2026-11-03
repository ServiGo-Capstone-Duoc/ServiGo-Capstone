export type ServiceRequestStatus =
  | 'published'
  | 'matched'
  | 'quoted'
  | 'accepted'
  | 'en_route'
  | 'arrived'
  | 'in_progress'
  | 'completed'
  | 'cancelled';


export type ServiceUrgency =
  | 'normal'
  | 'soon'
  | 'urgent';


export type PaymentStatus =
  | 'pending'
  | 'paid';


export interface ServiceRequest {

  id: string;

  clientId: string;
  clientName: string;

  category: string;
  description: string;

  address: string;
  commune: string;

  latitude: number | null;
  longitude: number | null;

  preferredDate: Date | null;

  timeSlot: string;

  urgency: ServiceUrgency;

  photoUrls: string[];

  status: ServiceRequestStatus;

  assignedTechnicianId: string | null;

  /*
   * Presupuesto elegido por el cliente.
   */
  acceptedQuoteId: string | null;


  /*
   * =========================================
   * ESTADO ECONÓMICO
   * =========================================
   *
   * Independiente del estado operacional
   * del servicio.
   */

  paymentStatus:
    PaymentStatus;

  paymentId:
    string | null;


  createdAt: Date | null;
  updatedAt: Date | null;
}