import {
  Injectable
} from '@angular/core';

import {
  Capacitor
} from '@capacitor/core';

import {
  Geolocation,
  PermissionStatus,
  Position,
  PositionOptions
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


  private validatedPosition:
    Position | null =
      null;


  private readonly positionOptions:
    PositionOptions = {
      enableHighAccuracy:
        Capacitor.isNativePlatform(),

      timeout:
        20000,

      maximumAge:
        5000
    };


  /*
   * =========================================
   * COMPROBAR DISPONIBILIDAD DE UBICACIÓN
   * =========================================
   *
   * Funciona tanto en navegador como en la
   * aplicación nativa:
   *
   * - En Android/iOS revisa y solicita permisos.
   * - En web, getCurrentPosition() activa el
   *   diálogo de permisos del navegador.
   * - Si la ubicación del equipo está apagada,
   *   devuelve un error explícito y NO permite
   *   cambiar el trabajo a en_route.
   *
   * Este método todavía no publica datos.
   */

  async ensureLocationAvailable():
    Promise<void> {


    this.ensureBrowserSupport();


    try {

      await this.ensurePermission();


      this.validatedPosition =
        await Geolocation
          .getCurrentPosition(
            this.positionOptions
          );


    } catch (error) {

      throw this.normaliseLocationError(
        error
      );
    }
  }


  /*
   * =========================================
   * INICIAR TRACKING
   * =========================================
   *
   * Debe invocarse después de que Functions
   * haya cambiado el estado a en_route.
   */

  async startTracking(
    technicianId: string,
    requestId: string
  ): Promise<void> {


    this.ensureBrowserSupport();


    if (
      this.watchId
    ) {

      await this.stopTracking();
    }


    try {

      await this.ensurePermission();


      const initialPosition =
        this.validatedPosition
        ?? await Geolocation
          .getCurrentPosition(
            this.positionOptions
          );


      this.technicianId =
        technicianId;


      this.requestId =
        requestId;


      this.validatedPosition =
        null;


      await this.publishPosition(
        initialPosition
      );


      this.watchId =
        await Geolocation
          .watchPosition(
            this.positionOptions,

            (
              position,
              error
            ) => {


              if (
                error
              ) {

                console.warn(
                  '[ServiGo Location] No fue posible actualizar la ubicación:',
                  this.normaliseLocationError(
                    error
                  ).message
                );

                return;
              }


              if (
                !position
              ) {

                return;
              }


              void this.publishPosition(
                position
              ).catch(
                publishError => {

                  console.error(
                    '[ServiGo Location] Error publicando ubicación:',
                    publishError
                  );
                }
              );
            }
          );


    } catch (error) {

      this.watchId =
        null;

      this.technicianId =
        null;

      this.requestId =
        null;

      this.validatedPosition =
        null;


      throw this.normaliseLocationError(
        error
      );
    }
  }


  /*
   * =========================================
   * DETENER TRACKING
   * =========================================
   */

  async stopTracking():
    Promise<void> {


    const requestId =
      this.requestId;


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


    this.watchId =
      null;

    this.technicianId =
      null;

    this.requestId =
      null;

    this.validatedPosition =
      null;


    if (
      requestId
    ) {

      const locationRef =
        doc(
          firestore,
          'technicianLocations',
          requestId
        );


      try {

        await deleteDoc(
          locationRef
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
   * PERMISOS
   * =========================================
   */

  private async ensurePermission():
    Promise<void> {


    let permission:
      PermissionStatus | null =
        null;


    try {

      permission =
        await Geolocation
          .checkPermissions();


    } catch (error) {

      /*
       * Algunos navegadores no implementan la
       * Permissions API, pero sí Geolocation.
       * En web continuamos y dejamos que
       * getCurrentPosition() solicite el permiso.
       */

      if (
        Capacitor.isNativePlatform()
      ) {

        throw error;
      }
    }


    if (
      !permission
    ) {

      return;
    }


    if (
      permission.location === 'denied'
      &&
      permission.coarseLocation === 'denied'
    ) {

      throw new Error(
        'location-permission-denied'
      );
    }


    if (
      Capacitor.isNativePlatform()
      &&
      (
        permission.location === 'prompt'
        ||
        permission.location === 'prompt-with-rationale'
        ||
        permission.coarseLocation === 'prompt'
        ||
        permission.coarseLocation === 'prompt-with-rationale'
      )
    ) {

      const requestedPermission =
        await Geolocation
          .requestPermissions();


      if (
        requestedPermission.location !== 'granted'
        &&
        requestedPermission.coarseLocation !== 'granted'
      ) {

        throw new Error(
          'location-permission-denied'
        );
      }
    }
  }


  private ensureBrowserSupport():
    void {


    if (
      Capacitor.isNativePlatform()
    ) {

      return;
    }


    if (
      typeof navigator === 'undefined'
      ||
      !navigator.geolocation
    ) {

      throw new Error(
        'location-not-supported'
      );
    }
  }


  private normaliseLocationError(
    error: unknown
  ): Error {


    if (
      error instanceof Error
      &&
      (
        error.message === 'location-permission-denied'
        ||
        error.message === 'location-unavailable'
        ||
        error.message === 'location-timeout'
        ||
        error.message === 'location-not-supported'
      )
    ) {

      return error;
    }


    const candidate =
      error as {
        code?: string | number;
        message?: string;
      };


    const code =
      candidate?.code;


    const message =
      candidate?.message
        ?.toLowerCase()
      ?? '';


    if (
      code === 1
      ||
      code === '1'
      ||
      code === 'OS-PLUG-GLOC-0003'
      ||
      message.includes(
        'permission'
      )
      ||
      message.includes(
        'denied'
      )
    ) {

      return new Error(
        'location-permission-denied'
      );
    }


    if (
      code === 3
      ||
      code === '3'
      ||
      code === 'OS-PLUG-GLOC-0010'
      ||
      message.includes(
        'timeout'
      )
      ||
      message.includes(
        'timed out'
      )
    ) {

      return new Error(
        'location-timeout'
      );
    }


    if (
      code === 2
      ||
      code === '2'
      ||
      code === 'OS-PLUG-GLOC-0007'
      ||
      code === 'OS-PLUG-GLOC-0009'
      ||
      code === 'OS-PLUG-GLOC-0017'
      ||
      message.includes(
        'unavailable'
      )
      ||
      message.includes(
        'disabled'
      )
      ||
      message.includes(
        'location services'
      )
    ) {

      return new Error(
        'location-unavailable'
      );
    }


    return new Error(
      'location-unavailable'
    );
  }


  /*
   * =========================================
   * PUBLICAR POSICIÓN
   * =========================================
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


    const locationRef =
      doc(
        firestore,
        'technicianLocations',
        this.requestId
      );


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
