import {
  Injectable
} from '@angular/core';

import {
  BehaviorSubject,
  Observable
} from 'rxjs';

import {
  DocumentData,
  Timestamp,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  updateDoc
} from 'firebase/firestore';

import {
  httpsCallable
} from 'firebase/functions';

import {
  updateProfile
} from 'firebase/auth';

import {
  firebaseAuth,
  firebaseFunctions,
  firestore
} from '../firebase/firebase';

import {
  ClientProfileInput,
  PreferredContactChannel,
  ServiGoUser,
  UserRole,
  UserStatus
} from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class ProfileService {

  private readonly profileSubject =
    new BehaviorSubject<ServiGoUser | null>(
      null
    );

  readonly profile$:
    Observable<ServiGoUser | null> =
      this.profileSubject.asObservable();

  private unsubscribeProfile:
    (() => void) | null = null;

  get currentProfile():
    ServiGoUser | null {

    return this.profileSubject.value;
  }

  async getProfile(
    uid: string
  ): Promise<ServiGoUser | null> {

    const snapshot =
      await getDoc(
        doc(
          firestore,
          'users',
          uid
        )
      );

    if (
      !snapshot.exists()
    ) {
      return null;
    }

    return this.mapProfile(
      snapshot.data()
    );
  }

  watchProfile(
    uid: string
  ): void {

    this.stopWatching();

    this.unsubscribeProfile =
      onSnapshot(
        doc(
          firestore,
          'users',
          uid
        ),
        snapshot => {

          if (
            !snapshot.exists()
          ) {

            this.profileSubject.next(
              null
            );

            return;
          }

          this.profileSubject.next(
            this.mapProfile(
              snapshot.data()
            )
          );
        },
        error => {

          console.error(
            '[ServiGo] Error escuchando el perfil:',
            error
          );

          this.profileSubject.next(
            null
          );
        }
      );
  }

  async updateOwnProfile(
    uid: string,
    input: ClientProfileInput
  ): Promise<void> {

    const currentUser =
      firebaseAuth.currentUser;

    if (
      !currentUser
      || currentUser.uid !== uid
    ) {
      throw new Error(
        'profile/session-mismatch'
      );
    }

    const displayName =
      input.displayName
        .trim()
        .replace(
          /\s+/g,
          ' '
        );

    if (
      displayName.length < 2
      || displayName.length > 80
    ) {
      throw new Error(
        'profile/invalid-display-name'
      );
    }

    const phone =
      this.normalizeNullableText(
        input.phone,
        24
      );

    const commune =
      this.normalizeNullableText(
        input.commune,
        80
      );

    const address =
      this.normalizeNullableText(
        input.address,
        160
      );

    const photoUrl =
      this.normalizeNullableText(
        input.photoUrl,
        2048
      );

    const preferredContact =
      this.normalizePreferredContact(
        input.preferredContact
      );

    await updateDoc(
      doc(
        firestore,
        'users',
        uid
      ),
      {
        displayName,
        phone,
        photoUrl,
        commune,
        address,
        preferredContact,
        profileVersion: 2,
        updatedAt:
          serverTimestamp()
      }
    );

    try {

      await updateProfile(
        currentUser,
        {
          displayName,
          photoURL:
            photoUrl
        }
      );

    } catch (error) {

      console.warn(
        '[ServiGo] El perfil se guardó, pero Auth no pudo sincronizarse:',
        error
      );
    }
  }

  async deleteOwnAccount(
    emailConfirmation: string,
    confirmationText: string
  ): Promise<void> {

    const callable =
      httpsCallable<
        {
          email: string;
          confirmation: string;
        },
        {
          deleted: boolean;
        }
      >(
        firebaseFunctions,
        'deleteMyAccount'
      );

    await callable({
      email:
        emailConfirmation
          .trim()
          .toLowerCase(),
      confirmation:
        confirmationText
          .trim()
          .toUpperCase()
    });
  }

  clearProfile(): void {

    this.stopWatching();

    this.profileSubject.next(
      null
    );
  }

  private stopWatching(): void {

    if (
      this.unsubscribeProfile
    ) {

      this.unsubscribeProfile();

      this.unsubscribeProfile =
        null;
    }
  }

  private normalizeNullableText(
    value: string | null,
    maxLength: number
  ): string | null {

    const normalized =
      value
        ?.trim()
        .replace(
          /\s+/g,
          ' '
        )
      ?? '';

    if (
      !normalized
    ) {
      return null;
    }

    return normalized.slice(
      0,
      maxLength
    );
  }

  private normalizePreferredContact(
    value: PreferredContactChannel
  ): PreferredContactChannel {

    if (
      value === 'phone'
      || value === 'email'
    ) {
      return value;
    }

    return 'chat';
  }

  private mapProfile(
    data: DocumentData
  ): ServiGoUser {

    return {
      uid:
        data['uid'] ?? '',
      email:
        data['email'] ?? '',
      displayName:
        data['displayName'] ?? '',
      phone:
        data['phone'] ?? null,
      photoUrl:
        data['photoUrl'] ?? null,
      commune:
        data['commune'] ?? null,
      address:
        data['address'] ?? null,
      preferredContact:
        this.normalizePreferredContact(
          data['preferredContact']
        ),
      roles:
        Array.isArray(
          data['roles']
        )
          ? data['roles'] as UserRole[]
          : [],
      status:
        this.mapStatus(
          data['status']
        ),
      averageRating:
        typeof data['averageRating'] ===
          'number'
          ? data['averageRating']
          : null,
      ratingCount:
        Number(
          data['ratingCount'] ?? 0
        ),
      profileVersion:
        Number(
          data['profileVersion'] ?? 1
        ),
      createdAt:
        this.toDate(
          data['createdAt']
        ),
      updatedAt:
        this.toDate(
          data['updatedAt']
        ),
      lastLoginAt:
        this.toDate(
          data['lastLoginAt']
        )
    };
  }

  private mapStatus(
    value: unknown
  ): UserStatus {

    if (
      value === 'active'
      || value === 'pending'
      || value === 'suspended'
      || value === 'blocked'
    ) {
      return value;
    }

    return 'blocked';
  }

  private toDate(
    value: unknown
  ): Date | null {

    if (
      value instanceof Timestamp
    ) {
      return value.toDate();
    }

    if (
      value instanceof Date
    ) {
      return value;
    }

    return null;
  }
}
