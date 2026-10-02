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

export const guestGuard: CanActivateFn =
  async () => {

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

    if (!user) {

      return true;
    }

return router.createUrlTree(
  ['/app/home']
);
  };