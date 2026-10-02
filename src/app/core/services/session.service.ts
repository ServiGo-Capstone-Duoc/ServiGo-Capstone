import {
  Injectable
} from '@angular/core';

import {
  User
} from 'firebase/auth';

import {
  AuthService
} from './auth.service';

import {
  ProfileService
} from './profile.service';

@Injectable({
  providedIn: 'root'
})
export class SessionService {

  private initialized =
    false;

  private unsubscribeAuth:
    (() => void) | null = null;

  constructor(
    private readonly authService:
      AuthService,

    private readonly profileService:
      ProfileService
  ) {}

  async initialize(): Promise<void> {

    if (
      this.initialized
    ) {

      return;
    }

    this.initialized =
      true;

    const user =
      await this.authService
        .waitForAuthReady();

    this.handleUser(
      user
    );

    this.unsubscribeAuth =
      this.authService
        .onAuthStateChanged(
          (currentUser) => {

            this.handleUser(
              currentUser
            );
          }
        );
  }

  private handleUser(
    user: User | null
  ): void {

    if (!user) {

      this.profileService
        .clearProfile();

      return;
    }

    this.profileService
      .watchProfile(
        user.uid
      );
  }
}