import {
  Injectable
} from '@angular/core';

import {
  Capacitor
} from '@capacitor/core';

import {
  Geolocation,
  Position
} from '@capacitor/geolocation';

import {
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc
} from 'firebase/firestore';

import {
  firestore
} from '../firebase/firebase';


@Injectable({
  providedIn: 'root'
})
export class TechnicianLocationService {


  private watchId:
    string | null =
      null;


  private technicianId:
    string | null =
      null;


  private requestId:
    string | null =
      null;


  /*
   * =========================================
   * COMPROBAR DISPONIBILIDAD GPS
   * =========================================
   *
   * Se ejecuta ANTES de cambiar el trabajo
   * desde accepted hacia en_route.
   *
   * Objetivo:
   *
   * - comprobar plataforma nativa
   * - comprobar permisos
   * - solicitar permisos si corresponde
   * - verificar que exista una posición GPS
   *
   * IMPORTANTE:
   *
   * Este método NO publica la ubicación
   * en Firestore.
   */

  async ensureLocationAvailable():
    Promise<void> {


    if (
      !Capacitor.isNativePlatform()
    ) {

      console.warn(
        '[ServiGo Location] GPS nativo no disponible en web.'
      );

      return;
    }


    /*
     * =====================================
     * PERMISOS
     * =====================================
     */

    let permission =
      await Geolocation
        .checkPermissions();


    if (
      permission.location ===
        'prompt'
      ||
      permission.coarseLocation ===
        'prompt'
    ) {

      permission =
        await Geolocation
          .requestPermissions();
    }


    if (
      permission.location !==
        'granted'
      &&
      permission.coarseLocation !==
        'granted'
    ) {

      throw new Error(
        'location-permission-denied'
      );
    }


    /*
     * =====================================
     * COMPROBAR POSICIÓN
     * =====================================
     *
     * Antes de cambiar el trabajo a en_route
     * comprobamos que el dispositivo realmente
     * pueda entregar una ubicación.
     */

    const position =
      await Geolocation
        .getCurrentPosition({
          enableHighAccuracy:
            true,

          timeout:
            15000,

          maximumAge:
            5000
        });


    console.log(
      '[ServiGo Location] GPS disponible.',
      {
        latitude:
          position.coords.latitude,

        longitude:
          position.coords.longitude,

        accuracy:
          position.coords.accuracy
      }
    );
  }


  /*
   * =========================================
   * INICIAR TRACKING
   * =========================================
   *
   * Este método debe ejecutarse DESPUÉS
   * de que Functions cambie:
   *
   * accepted -> en_route
   *
   * De esa forma Firestore Rules permite
   * publicar technicianLocations.
   */

  async startTracking(
    technicianId: string,
    requestId: string
  ): Promise<void> {


    if (
      !Capacitor.isNativePlatform()
    ) {

      console.warn(
        '[ServiGo Location] Tracking GPS nativo omitido en web.'
      );

      return;
    }


    /*
     * Evita crear dos watchers simultáneos.
     */

    if (
      this.watchId
    ) {

      await this.stopTracking();
    }


    this.technicianId =
      technicianId;


    this.requestId =
      requestId;


    /*
     * =====================================
     * PERMISOS
     * =====================================
     *
     * Aunque ensureLocationAvailable()
     * normalmente ya los comprobó,
     * startTracking también se protege
     * para poder funcionar de forma segura
     * si se invoca independientemente.
     */

    let permission =
      await Geolocation
        .checkPermissions();


    if (
      permission.location ===
        'prompt'
      ||
      permission.coarseLocation ===
        'prompt'
    ) {

      permission =
        await Geolocation
          .requestPermissions();
    }


    if (
      permission.location !==
        'granted'
      &&
      permission.coarseLocation !==
        'granted'
    ) {

      this.technicianId =
        null;

      this.requestId =
        null;


      throw new Error(
        'location-permission-denied'
      );
    }


    /*
     * =====================================
     * POSICIÓN INICIAL
     * =====================================
     *
     * Esta posición SÍ se publica porque
     * para este momento el servicio ya debe
     * encontrarse en estado en_route.
     */

    const initialPosition =
      await Geolocation
        .getCurrentPosition({
          enableHighAccuracy:
            true,

          timeout:
            15000,

          maximumAge:
            5000
        });


    await this.publishPosition(
      initialPosition
    );


    console.log(
      '[ServiGo Location] Posición inicial publicada.',
      {
        latitude:
          initialPosition.coords.latitude,

        longitude:
          initialPosition.coords.longitude,

        accuracy:
          initialPosition.coords.accuracy
      }
    );


    /*
     * =====================================
     * WATCH GPS
     * =====================================
     */

    this.watchId =
      await Geolocation
        .watchPosition(
          {
            enableHighAccuracy:
              true,

            timeout:
              15000,

            maximumAge:
              5000
          },

          async (
            position,
            error
          ) => {


            /*
             * =================================
             * ERROR GPS
             * =================================
             */

            if (
              error
            ) {

              console.error(
                '[ServiGo Location] Error GPS:',
                error
              );

              return;
            }


            /*
             * =================================
             * SIN POSICIÓN
             * =================================
             */

            if (
              !position
            ) {

              return;
            }


            /*
             * =================================
             * PUBLICAR POSICIÓN
             * =================================
             */

            try {

              await this.publishPosition(
                position
              );


              console.log(
                '[ServiGo Location] Ubicación actualizada.',
                {
                  latitude:
                    position.coords.latitude,

                  longitude:
                    position.coords.longitude,

                  accuracy:
                    position.coords.accuracy
                }
              );


            } catch (publishError) {

              console.error(
                '[ServiGo Location] Error publicando ubicación:',
                publishError
              );
            }
          }
        );


    console.log(
      '[ServiGo Location] Tracking iniciado.',
      {
        technicianId,
        requestId,
        watchId:
          this.watchId
      }
    );
  }


  /*
   * =========================================
   * DETENER TRACKING
   * =========================================
   *
   * Se utiliza cuando el técnico registra
   * su llegada al domicilio.
   *
   * Además de detener watchPosition(),
   * eliminamos technicianLocations/{uid}
   * para que el cliente deje inmediatamente
   * de tener acceso a la posición.
   */

  async stopTracking():
    Promise<void> {


    const technicianId =
      this.technicianId;


    /*
     * =====================================
     * DETENER WATCH
     * =====================================
     */

    if (
      this.watchId
    ) {

      try {

        await Geolocation
          .clearWatch({
            id:
              this.watchId
          });


      } catch (error) {

        console.warn(
          '[ServiGo Location] No fue posible detener watchPosition:',
          error
        );
      }
    }


    /*
     * Limpiamos estado local.
     */

    this.watchId =
      null;

    this.technicianId =
      null;

    this.requestId =
      null;


    /*
     * =====================================
     * ELIMINAR UBICACIÓN COMPARTIDA
     * =====================================
     */

    if (
      technicianId
    ) {

      const locationRef =
        doc(
          firestore,
          'technicianLocations',
          technicianId
        );


      try {

        await deleteDoc(
          locationRef
        );


        console.log(
          '[ServiGo Location] Ubicación compartida eliminada.'
        );


      } catch (error) {

        console.error(
          '[ServiGo Location] Error eliminando ubicación compartida:',
          error
        );


        throw error;
      }
    }
  }


  /*
   * =========================================
   * PUBLICAR POSICIÓN
   * =========================================
   *
   * Solo mantiene la última posición.
   *
   * NO generamos historial GPS.
   */

  private async publishPosition(
    position: Position
  ): Promise<void> {


    if (
      !this.technicianId
      ||
      !this.requestId
    ) {

      return;
    }


    /*
     * =====================================
     * VALIDACIÓN LOCAL
     * =====================================
     */

    const latitude =
      position.coords.latitude;


    const longitude =
      position.coords.longitude;


    if (
      !Number.isFinite(
        latitude
      )
      ||
      !Number.isFinite(
        longitude
      )
      ||
      latitude < -90
      ||
      latitude > 90
      ||
      longitude < -180
      ||
      longitude > 180
    ) {

      console.warn(
        '[ServiGo Location] Coordenadas inválidas ignoradas.',
        {
          latitude,
          longitude
        }
      );

      return;
    }


    /*
     * =====================================
     * DOCUMENTO FIRESTORE
     * =====================================
     */

    const locationRef =
      doc(
        firestore,
        'technicianLocations',
        this.technicianId
      );


    /*
     * =====================================
     * PUBLICAR
     * =====================================
     */

    await setDoc(
      locationRef,
      {

        technicianId:
          this.technicianId,

        requestId:
          this.requestId,

        latitude,

        longitude,

        accuracy:
          position.coords.accuracy,

        heading:
          position.coords.heading
          ?? null,

        speed:
          position.coords.speed
          ?? null,

        active:
          true,

        updatedAt:
          serverTimestamp()
      },
      {
        merge:
          true
      }
    );
  }
}