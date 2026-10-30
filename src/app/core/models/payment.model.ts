export type PaymentStatus =
  | 'pending'
  | 'approved'
  | 'rejected';


export type PaymentMethod =
  | 'simulated';


export interface Payment {

  id: string;

  requestId: string;
  quoteId: string;

  clientId: string;
  technicianId: string;

  amount: number;

  currency:
    'CLP';

  method:
    PaymentMethod;

  status:
    PaymentStatus;

  transactionId: string;

  authorizationCode: string;

  createdAt: Date | null;
  paidAt: Date | null;
}