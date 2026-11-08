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


export interface AcceptedQuoteSnapshot {

  quoteId: string;

  requestId: string;

  clientId: string;

  technicianId: string;
  technicianName: string;

  laborAmount: number;
  materialsAmount: number;
  otherAmount: number;
  totalAmount: number;

  availableDate: Date | null;

  comment: string;

  acceptedAt: Date | null;
}


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

  photoPaths: string[];

  status: ServiceRequestStatus;

  assignedTechnicianId: string | null;

  /*
   * Presupuesto elegido por el cliente.
   */
  acceptedQuoteId: string | null;

  /*
   * Copia inmutable de los datos económicos
   * aceptados. Se genera autoritativamente
   * en Cloud Functions para conservar el
   * monto y las condiciones durante todo el
   * ciclo del servicio.
   */
  acceptedQuoteSnapshot?:
    AcceptedQuoteSnapshot | null;


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