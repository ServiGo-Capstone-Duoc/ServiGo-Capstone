import {
  inject
} from '@angular/core';

import {
  CanActivateFn,
  Router
} from '@angular/router';

import {
  UserRole
} from '../models/user.model';

import {
  AuthService
} from '../services/auth.service';

import {
  ProfileService
} from '../services/profile.service';

export const roleGuard: CanActivateFn =
  async route => {

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
        ]
      );
    }

    try {

      const profile =
        await profileService
          .getProfile(
            user.uid
          );

      if (
        !profile
        || profile.status !== 'active'
      ) {
        return router.createUrlTree(
          [
            '/app/home'
          ]
        );
      }

      const requiredRoles =
        (
          route.data?.['roles']
          ?? []
        ) as UserRole[];

      if (
        requiredRoles.length === 0
        || requiredRoles.some(
          role =>
            profile.roles.includes(
              role
            )
        )
      ) {
        return true;
      }

      console.warn(
        '[ServiGo Guard] Acceso denegado por rol.'
      );

      return router.createUrlTree(
        [
          '/app/home'
        ]
      );

    } catch (error) {

      console.error(
        '[ServiGo Guard] No fue posible validar el rol:',
        error
      );

      return router.createUrlTree(
        [
          '/app/home'
        ]
      );
    }
  };
