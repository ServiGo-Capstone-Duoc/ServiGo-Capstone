import {
  UserStatus
} from './user.model';

export type TechnicianProfileStatus =
  | 'active'
  | 'inactive'
  | 'suspended';

export interface TechnicianProfile {
  userId: string;

  displayName: string;
  photoUrl: string | null;

  specialties: string[];

  experienceYears: number;
  experienceDescription: string;

  baseCommune: string;
  serviceRadiusKm: number;

  hasCertifications: boolean;
  publicDescription: string;

  status: TechnicianProfileStatus;
  accountStatus: UserStatus;

  createdAt: Date | null;
  updatedAt: Date | null;
  createdBy: string | null;
  updatedBy: string | null;
  sourceApplicationId: string | null;
}

export interface TechnicianProfileInput {
  displayName: string;
  photoUrl: string | null;
  specialties: string[];
  experienceYears: number;
  experienceDescription: string;
  baseCommune: string;
  serviceRadiusKm: number;
  hasCertifications: boolean;
  publicDescription: string;
  status: TechnicianProfileStatus;
}
