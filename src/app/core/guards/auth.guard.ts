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

export const authGuard: CanActivateFn =
  async (
    _route,
    state
  ) => {

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
      return router.createUrlTree(
        [
          '/login'
        ],
        {
          queryParams: {
            returnUrl:
              state.url
          }
        }
      );
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
        return true;
      }

      await authService
        .logout();

      return router.createUrlTree(
        [
          '/login'
        ],
        {
          queryParams: {
            accountStatus:
              profile?.status
              ?? 'profile-missing'
          }
        }
      );

    } catch (error) {

      console.error(
        '[ServiGo Guard] No fue posible validar el perfil:',
        error
      );

      /*
       * Una falla temporal de red no debe destruir la sesión.
       * Firestore mantendrá protegidas las operaciones sensibles.
       */
      return true;
    }
  };
