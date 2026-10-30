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


    /*
     * =========================================
     * SIN SESIÓN
     * =========================================
     */

    if (
      !user
    ) {

      console.warn(
        '[ServiGo Guard] Usuario no autenticado.'
      );


      return router
        .createUrlTree(
          [
            '/login'
          ]
        );
    }


    /*
     * =========================================
     * PERFIL
     * =========================================
     */

    const profile =
      await profileService
        .getProfile(
          user.uid
        );


    console.log(
      '[ServiGo Guard] Evaluando acceso:',
      {
        uid:
          user.uid,

        profile,

        requiredRoles:
          route.data?.[
            'roles'
          ]
          ?? []
      }
    );


    /*
     * =========================================
     * PERFIL INVÁLIDO
     * =========================================
     */

    if (
      !profile
    ) {

      console.warn(
        '[ServiGo Guard] Perfil no encontrado.'
      );


      return router
        .createUrlTree(
          [
            '/app/home'
          ]
        );
    }


    if (
      profile.status !==
      'active'
    ) {

      console.warn(
        '[ServiGo Guard] Perfil no activo:',
        profile.status
      );


      return router
        .createUrlTree(
          [
            '/app/home'
          ]
        );
    }


    /*
     * =========================================
     * ROLES REQUERIDOS
     * =========================================
     */

    const requiredRoles =
      (
        route.data?.[
          'roles'
        ]
        ??
        []
      ) as UserRole[];


    if (
      requiredRoles.length ===
      0
    ) {

      return true;
    }


    /*
     * =========================================
     * VALIDAR ROL
     * =========================================
     */

    const authorized =
      requiredRoles
        .some(
          role =>
            profile.roles
              .includes(
                role
              )
        );


    console.log(
      '[ServiGo Guard] Resultado:',
      {
        rolesUsuario:
          profile.roles,

        rolesRequeridos:
          requiredRoles,

        authorized
      }
    );


    if (
      authorized
    ) {

      return true;
    }


    /*
     * =========================================
     * ACCESO DENEGADO
     * =========================================
     */

    console.warn(
      '[ServiGo Guard] Acceso denegado por rol.'
    );


    return router
      .createUrlTree(
        [
          '/app/home'
        ]
      );
  };