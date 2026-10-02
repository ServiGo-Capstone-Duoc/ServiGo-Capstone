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

import {
  UserRole
} from '../models/user.model';

export const roleGuard: CanActivateFn =
  async (
    route
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

    if (!user) {

      return router
        .createUrlTree(
          [
            '/login'
          ]
        );
    }

    const profile =
      await profileService
        .getProfile(
          user.uid
        );

    if (
      !profile ||
      profile.status !==
        'active'
    ) {

      return router
        .createUrlTree(
          [
            '/home'
          ]
        );
    }

    const requiredRoles =
      (
        route.data?.[
          'roles'
        ] ??
        []
      ) as UserRole[];

    if (
      requiredRoles.length === 0
    ) {

      return true;
    }

    const authorized =
      requiredRoles.some(
        (role) =>
          profile.roles
            .includes(
              role
            )
      );

    if (
      authorized
    ) {

      return true;
    }

    return router
      .createUrlTree(
        [
          '/home'
        ]
      );
  };