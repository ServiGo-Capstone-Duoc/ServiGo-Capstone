export type TechnicianApplicationStatus =
  | 'pending'
  | 'approved'
  | 'rejected';

export interface TechnicianApplication {
  id: string;
  userId: string;

  fullName: string;
  rut: string;
  phone: string;

  specialties: string[];

  experienceYears: number;
  experienceDescription: string;

  baseCommune: string;
  serviceRadiusKm: number;

  hasIdentification: boolean;
  hasCertifications: boolean;

  termsAccepted: boolean;

  status: TechnicianApplicationStatus;

  rejectionReason: string | null;

  createdAt: Date | null;
  updatedAt: Date | null;
  reviewedAt: Date | null;
  reviewedBy: string | null;
}