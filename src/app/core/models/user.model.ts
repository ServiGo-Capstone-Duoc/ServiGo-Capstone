export type UserRole =
  | 'cliente'
  | 'tecnico'
  | 'administrador'
  | 'superadmin';

export type UserStatus =
  | 'active'
  | 'pending'
  | 'suspended'
  | 'blocked';

export interface ServiGoUser {
  uid: string;
  email: string;
  displayName: string;

  phone: string | null;
  photoUrl: string | null;

  roles: UserRole[];
  status: UserStatus;

  averageRating: number | null;
  ratingCount: number;

  createdAt: Date | null;
  updatedAt: Date | null;
  lastLoginAt: Date | null;
}