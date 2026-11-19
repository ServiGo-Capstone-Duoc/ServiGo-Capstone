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

export type PreferredContactChannel =
  | 'chat'
  | 'phone'
  | 'email';

export interface ServiGoUser {
  uid: string;
  email: string;
  displayName: string;

  phone: string | null;
  photoUrl: string | null;

  commune: string | null;
  address: string | null;
  preferredContact: PreferredContactChannel;

  roles: UserRole[];
  status: UserStatus;

  averageRating: number | null;
  ratingCount: number;

  profileVersion: number;

  createdAt: Date | null;
  updatedAt: Date | null;
  lastLoginAt: Date | null;
}

export interface ClientProfileInput {
  displayName: string;
  phone: string | null;
  photoUrl: string | null;
  commune: string | null;
  address: string | null;
  preferredContact: PreferredContactChannel;
}
