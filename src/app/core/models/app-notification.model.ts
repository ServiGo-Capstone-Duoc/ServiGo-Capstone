export type AppNotificationType =
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
  | 'technician_new_message'
  | 'unknown';


export interface AppNotification {

  id: string;

  userId: string;

  type: AppNotificationType;

  title: string;

  body: string;

  requestId: string;

  messageId: string | null;

  opportunityId: string | null;

  quoteId: string | null;

  category: string | null;

  commune: string | null;

  matchScore: string | null;

  read: boolean;

  createdAt: Date | null;

  updatedAt: Date | null;

  readAt: Date | null;
}
