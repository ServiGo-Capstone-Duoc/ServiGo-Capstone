import {
  inject
} from '@angular/core';

import {
  CanActivateFn,
  Router
} from '@angular/router';

import {
  AuthService
} from '../services/auth.service';

import {
  ProfileService
} from '../services/profile.service';

export const guestGuard: CanActivateFn =
  async () => {

    const authService =
      inject(
        AuthService
      );

    const profileService =
      inject(
        ProfileService
      );

    const router =
      inject(
        Router
      );

    const user =
      await authService
        .waitForAuthReady();

    if (
      !user
    ) {
      return true;
    }

    try {

      const profile =
        await profileService
          .getProfile(
            user.uid
          );

      if (
        profile?.status === 'active'
      ) {
        return router.createUrlTree(
          [
            '/app/home'
          ]
        );
      }

      await authService
        .logout();

      return true;

    } catch (error) {

      console.error(
        '[ServiGo Guard] No fue posible validar la sesión invitada:',
        error
      );

      return router.createUrlTree(
        [
          '/app/home'
        ]
      );
    }
  };
