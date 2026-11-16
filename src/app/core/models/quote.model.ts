export type QuoteStatus =
  | 'sent'
  | 'accepted'
  | 'rejected'
  | 'withdrawn';


export interface Quote {

  id: string;

  requestId: string;

  clientId: string;

  technicianId: string;
  technicianName: string;

  visitFeeAmount: number;
  laborAmount: number;
  materialsAmount: number;
  otherAmount: number;

  totalAmount: number;

  availableDate: Date | null;

  scheduleAccepted: boolean;

  comment: string;

  status: QuoteStatus;

  createdAt: Date | null;
  updatedAt: Date | null;
}