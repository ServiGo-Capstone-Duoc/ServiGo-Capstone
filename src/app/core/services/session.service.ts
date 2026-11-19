import {
  Injectable,
  inject
} from '@angular/core';

import {
  User
} from 'firebase/auth';

import {
  AuthService
} from './auth.service';

import {
  NotificationService
} from './notification.service';

import {
  ProfileService
} from './profile.service';


@Injectable({
  providedIn:
    'root'
})
export class SessionService {


  private initialized =
    false;


  private unsubscribeAuth:
    (() => void) | null =
      null;


  private readonly authService =
    inject(AuthService);


  private readonly profileService =
    inject(ProfileService);


  private readonly notificationService =
    inject(NotificationService);


  async initialize():
    Promise<void> {


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
          currentUser => {

            this.handleUser(
              currentUser
            );
          }
        );
  }


  private handleUser(
    user: User | null
  ): void {


    if (
      !user
    ) {

      this.profileService
        .clearProfile();


      this.notificationService
        .clearNotifications();


      return;
    }


    this.profileService
      .watchProfile(
        user.uid
      );


    this.notificationService
      .watchNotifications(
        user.uid
      );
  }
}
