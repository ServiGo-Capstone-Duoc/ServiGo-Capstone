import {
  Injectable,
  inject
} from '@angular/core';

import {
  Router
} from '@angular/router';

import {
  Capacitor
} from '@capacitor/core';

import {
  ActionPerformed,
  PushNotifications,
  PushNotificationSchema,
  Token
} from '@capacitor/push-notifications';

import {
  doc,
  serverTimestamp,
  setDoc
} from 'firebase/firestore';

import {
  firestore
} from '../firebase/firebase';

import {
  AuthService
} from './auth.service';


@Injectable({
  providedIn:
    'root'
})
export class PushNotificationService {


  private readonly authService =
    inject(
      AuthService
    );


  private readonly router =
    inject(
      Router
    );


  private initialized =
    false;


  /*
   * =========================================
   * INICIALIZAR PUSH
   * =========================================
   */

  async initialize():
    Promise<void> {


    /*
     * Push nativo solamente.
     */

    if (
      !Capacitor.isNativePlatform()
    ) {

      console.log(
        '[ServiGo Push] Entorno web. Push nativo omitido.'
      );

      return;
    }


    if (
      this.initialized
    ) {

      return;
    }


    this.initialized =
      true;


    /*
     * =====================================
     * LISTENERS
     * =====================================
     *
     * Se registran antes de solicitar
     * registro FCM.
     */

    await this.registerListeners();


    /*
     * =====================================
     * CANAL ANDROID
     * =====================================
     *
     * Debe coincidir EXACTAMENTE con
     * Functions:
     *
     * channelId: servigo_general
     */

    await PushNotifications.createChannel({

      id:
        'servigo_general',

      name:
        'ServiGo',

      description:
        'Notificaciones de servicios, trabajos y oportunidades.',

      importance:
        5,

      visibility:
        1,

      vibration:
        true
    });


    console.log(
      '[ServiGo Push] Canal Android servigo_general creado.'
    );


    /*
     * =====================================
     * PERMISOS
     * =====================================
     */

    let permissionStatus =
      await PushNotifications
        .checkPermissions();


    /*
     * Android 13+ puede solicitar
     * permiso explícito.
     */

    if (
      permissionStatus.receive ===
        'prompt'
    ) {

      permissionStatus =
        await PushNotifications
          .requestPermissions();
    }


    if (
      permissionStatus.receive !==
        'granted'
    ) {

      console.warn(
        '[ServiGo Push] Permiso de notificaciones no concedido.'
      );

      return;
    }


    /*
     * =====================================
     * REGISTRO FCM
     * =====================================
     */

    await PushNotifications
      .register();


    console.log(
      '[ServiGo Push] Registro solicitado.'
    );
  }


  /*
   * =========================================
   * LISTENERS
   * =========================================
   */

  private async registerListeners():
    Promise<void> {


    /*
     * =====================================
     * TOKEN FCM
     * =====================================
     */

    await PushNotifications.addListener(
      'registration',

      async (
        token:
          Token
      ) => {


        console.log(
          '[ServiGo Push] Token recibido:',
          token.value
        );


        try {

          await this.saveToken(
            token.value
          );


        } catch (error) {

          console.error(
            '[ServiGo Push] Error guardando token:',
            error
          );
        }
      }
    );


    /*
     * =====================================
     * ERROR DE REGISTRO
     * =====================================
     */

    await PushNotifications.addListener(
      'registrationError',

      error => {

        console.error(
          '[ServiGo Push] Error de registro:',
          error
        );
      }
    );


    /*
     * =====================================
     * NOTIFICACIÓN RECIBIDA
     * =====================================
     *
     * Se ejecuta cuando ServiGo está
     * abierta y Android entrega el Push.
     */

    await PushNotifications.addListener(
      'pushNotificationReceived',

      (
        notification:
          PushNotificationSchema
      ) => {


        console.log(
          '[ServiGo Push] Notificación recibida:',
          notification
        );
      }
    );


    /*
     * =====================================
     * NOTIFICACIÓN PULSADA
     * =====================================
     */

    await PushNotifications.addListener(
      'pushNotificationActionPerformed',

      async (
        action:
          ActionPerformed
      ) => {


        console.log(
          '[ServiGo Push] Notificación pulsada:',
          action
        );


        const data =
          action.notification
            .data
          ?? {};


        const requestId =
          data[
            'requestId'
          ];


        const type =
          data[
            'type'
          ];


        if (
          typeof requestId !==
            'string'
          ||
          !requestId
        ) {

          console.warn(
            '[ServiGo Push] Notificación sin requestId.'
          );

          return;
        }


        /*
         * =================================
         * NUEVA OPORTUNIDAD
         * =================================
         */

        if (
          type ===
            'technician_opportunity'
        ) {

          await this.router.navigate(
            [
              '/app/technician/opportunity',
              requestId
            ]
          );


          return;
        }


        /*
         * =================================
         * PRESUPUESTO ACEPTADO
         * =================================
         */

        if (
          type ===
            'technician_quote_accepted'
        ) {

          await this.router.navigate(
            [
              '/app/technician/jobs',
              requestId
            ]
          );


          return;
        }


        /*
         * =================================
         * SERVICIO CANCELADO POR CLIENTE
         * =================================
         *
         * El destinatario es el técnico.
         *
         * Abrimos el detalle del trabajo,
         * donde verá el estado cancelado.
         */

        if (
          type ===
            'technician_service_cancelled'
        ) {

          await this.router.navigate(
            [
              '/app/technician/jobs',
              requestId
            ]
          );


          return;
        }
/*
 * =================================
 * NUEVO MENSAJE DE CHAT
 * =================================
 *
 * Tanto cliente como técnico abren
 * directamente la conversación
 * asociada al servicio.
 */

if (
  type ===
    'client_new_message'
  ||
  type ===
    'technician_new_message'
) {

  await this.router.navigate(
    [
      '/app/messages',
      requestId
    ]
  );


  return;
}

        /*
         * =================================
         * EVENTOS CLIENTE
         * =================================
         *
         * Todos estos eventos corresponden
         * a una solicitud propiedad del
         * cliente.
         *
         * Abrimos directamente el detalle
         * del servicio.
         */

        if (
          type ===
            'client_new_quote'
          ||
          type ===
            'client_technician_en_route'
          ||
          type ===
            'client_technician_arrived'
          ||
          type ===
            'client_job_started'
          ||
          type ===
            'client_job_completed'
          ||
          type ===
            'client_service_cancelled'
        ) {

          await this.router.navigate(
            [
              '/app/services',
              requestId
            ]
          );


          return;
        }


        /*
         * =================================
         * FALLBACK
         * =================================
         */

        console.warn(
          '[ServiGo Push] Tipo de notificación desconocido:',
          type
        );


        await this.router
          .navigateByUrl(
            '/app/home'
          );
      }
    );
  }


  /*
   * =========================================
   * GUARDAR TOKEN
   * =========================================
   */

  private async saveToken(
    token:
      string
  ): Promise<void> {


    const user =
      await this.authService
        .waitForAuthReady();


    if (
      !user
    ) {

      throw new Error(
        'push-user-not-authenticated'
      );
    }


    /*
     * Actualmente mantenemos un dispositivo
     * Android activo por usuario.
     */

    const tokenDocumentId =
      `${user.uid}_android`;


    const tokenRef =
      doc(
        firestore,
        'deviceTokens',
        tokenDocumentId
      );


    await setDoc(
      tokenRef,
      {

        id:
          tokenDocumentId,

        userId:
          user.uid,

        token,

        platform:
          'android',

        active:
          true,

        updatedAt:
          serverTimestamp(),

        createdAt:
          serverTimestamp()
      },
      {
        merge:
          true
      }
    );


    console.log(
      '[ServiGo Push] Token guardado en Firestore.'
    );
  }
}