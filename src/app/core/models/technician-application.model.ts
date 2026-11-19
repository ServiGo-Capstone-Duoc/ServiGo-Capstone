export type TechnicianApplicationStatus =
  | 'pending'
  | 'approved'
  | 'rejected';

export type TechnicianApplicationDocumentCategory =
  | 'identity'
  | 'professional'
  | 'additional';

export interface TechnicianApplicationDocument {
  id: string;
  applicationId: string;
  userId: string;
  category: TechnicianApplicationDocumentCategory;
  originalName: string;
  storagePath: string;
  contentType: string;
  size: number;
  uploadedAt: Date | null;
}

export interface TechnicianApplicationDocumentSummary {
  identificationDocumentCount: number;
  professionalDocumentCount: number;
  additionalDocumentCount: number;
}

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

  documentsSubmitted: boolean;
  documentsSubmittedAt: Date | null;
  documentVersion: number;
  identificationDocumentCount: number;
  professionalDocumentCount: number;
  additionalDocumentCount: number;

  termsAccepted: boolean;

  status: TechnicianApplicationStatus;

  rejectionReason: string | null;

  createdAt: Date | null;
  updatedAt: Date | null;
  reviewedAt: Date | null;
  reviewedBy: string | null;
}
