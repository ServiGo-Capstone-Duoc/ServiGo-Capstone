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
  providedIn: 'root'
})
export class PushNotificationService {


  private readonly authService =
    inject(AuthService);


  private readonly router =
    inject(Router);


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
     *
     * ionic serve corre como web,
     * por lo que no intentamos registrar
     * PushNotifications ahí.
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
     * Registramos listeners ANTES
     * de llamar register().
     */

    await this.registerListeners();


    /*
     * Consultamos permiso actual.
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
     * Solicita el token de registro.
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
     * Firebase/Android entrega el token.
     */

    await PushNotifications.addListener(
      'registration',

      async (
        token: Token
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
     * Error durante registro.
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
     * Notificación recibida mientras
     * ServiGo está abierta.
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
     * Usuario toca la notificación.
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


        const requestId =
          action.notification
            .data?.['requestId'];


        if (
          typeof requestId !==
          'string'
          ||
          !requestId
        ) {

          return;
        }


        /*
         * La notificación abre directamente
         * la oportunidad correspondiente.
         */

        await this.router.navigate(
          [
            '/app/technician/opportunity',
            requestId
          ]
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
    token: string
  ): Promise<void> {


    const user =
      await this.authService
        .waitForAuthReady();


    if (!user) {

      throw new Error(
        'push-user-not-authenticated'
      );
    }


    /*
     * No usamos el token directamente
     * como ID porque puede contener
     * caracteres poco convenientes.
     *
     * Para este MVP utilizamos UID_android.
     *
     * Un usuario tendrá un registro Android.
     *
     * Más adelante soportaremos varios
     * dispositivos por usuario.
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