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

export const authGuard: CanActivateFn =
  async (
    _route,
    state
  ) => {

    const authService =
      inject(
        AuthService
      );

    const router =
      inject(
        Router
      );

    const user =
      await authService
        .waitForAuthReady();

    if (user) {

      return true;
    }

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
  };