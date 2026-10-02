import { Injectable } from '@angular/core';

import {
  BehaviorSubject,
  Observable
} from 'rxjs';

import {
  DocumentData,
  Timestamp,
  doc,
  getDoc,
  onSnapshot
} from 'firebase/firestore';

import {
  firestore
} from '../firebase/firebase';

import {
  ServiGoUser
} from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class ProfileService {

  private readonly profileSubject =
    new BehaviorSubject<ServiGoUser | null>(
      null
    );

  readonly profile$: Observable<ServiGoUser | null> =
    this.profileSubject.asObservable();

  private unsubscribeProfile:
    (() => void) | null = null;

  get currentProfile(): ServiGoUser | null {

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

    if (!snapshot.exists()) {

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
        (snapshot) => {

          if (!snapshot.exists()) {

            this.profileSubject.next(
              null
            );

            return;
          }

          const profile =
            this.mapProfile(
              snapshot.data()
            );

          this.profileSubject.next(
            profile
          );
        },
        (error) => {

          console.error(
            'Error escuchando perfil ServiGo:',
            error
          );

          this.profileSubject.next(
            null
          );
        }
      );
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

      roles:
        Array.isArray(
          data['roles']
        )
          ? data['roles']
          : [],

      status:
        data['status'] ??
        'blocked',

      averageRating:
        data['averageRating'] ??
        null,

      ratingCount:
        Number(
          data['ratingCount'] ??
          0
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