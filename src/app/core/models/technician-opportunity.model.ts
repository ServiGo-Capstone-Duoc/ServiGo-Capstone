export type TechnicianOpportunityStatus =
  | 'available'
  | 'viewed'
  | 'quoted'
  | 'expired'
  | 'assigned_elsewhere';


export type OpportunityNotificationPriority =
  | 'priority'
  | 'standard';


export interface TechnicianOpportunityRecord {

  id: string;

  technicianId: string;

  requestId: string;

  clientId: string;

  category: string;
  commune: string;

  matchScore: number;

  matchReasons: string[];

  status:
    TechnicianOpportunityStatus;

  notificationPriority:
    OpportunityNotificationPriority;

  eligibleForPush: boolean;

  technicianRating:
    number | null;

  technicianRatingCount:
    number;

  createdAt:
    Date | null;

  updatedAt:
    Date | null;

  notifiedAt:
    Date | null;

  viewedAt:
    Date | null;
}