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

import {
  ServiGoLocationSource,
  TECHNICIAN_FALLBACK_LOCATION
} from '../config/location-fallback.config';

export interface ResolvedTechnicianLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  heading: number | null;
  speed: number | null;
  source: Extract<ServiGoLocationSource, 'gps' | 'fallback'>;
  fallbackReason: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class TechnicianLocationService {

  private watchId:
    string | null = null;

  private recoveryTimer:
    ReturnType<typeof setInterval> | null = null;

  private technicianId:
    string | null = null;

  private requestId:
    string | null = null;

  private validatedLocation:
    ResolvedTechnicianLocation | null = null;

  private readonly recoveryIntervalMs =
    30000;

  private readonly positionOptions:
    PositionOptions = {
      enableHighAccuracy:
        Capacitor.isNativePlatform(),
      timeout: 8000,
      maximumAge: 5000
    };

  /*
   * Intenta obtener la ubicación real. Si el sistema, el navegador o el
   * usuario no la permiten, devuelve una ubicación de continuidad. No se
   * bloquea el cambio a "en camino" por una limitación del dispositivo.
   */
  async ensureLocationAvailable():
    Promise<ResolvedTechnicianLocation> {

    const resolved =
      await this.resolveBestLocation();

    this.validatedLocation =
      resolved;

    return resolved;
  }

  async startTracking(
    technicianId: string,
    requestId: string,
    initialLocation?: ResolvedTechnicianLocation
  ): Promise<ResolvedTechnicianLocation> {

    if (
      this.watchId
      || this.recoveryTimer
      || this.requestId
    ) {
      await this.stopTracking(
        false
      );
    }

    this.technicianId =
      technicianId;

    this.requestId =
      requestId;

    const firstLocation =
      initialLocation
      ?? this.validatedLocation
      ?? await this.resolveBestLocation();

    this.validatedLocation =
      null;

    try {
      await this.publishLocation(
        firstLocation
      );

      await this.startWatchSafely();

      if (
        firstLocation.source ===
        'fallback'
      ) {
        this.startRecoveryLoop();
      }

      return firstLocation;

    } catch (error) {
      await this.clearRuntimeState(
        false
      );

      throw error;
    }
  }

  async stopTracking(
    deleteSharedLocation = true
  ): Promise<void> {

    const requestId =
      this.requestId;

    await this.clearRuntimeState(
      false
    );

    if (
      deleteSharedLocation
      && requestId
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

  private async resolveBestLocation():
    Promise<ResolvedTechnicianLocation> {

    try {
      const position =
        await this.getRealPosition();

      return this.fromPosition(
        position
      );

    } catch (error) {
      const normalized =
        this.normaliseLocationError(
          error
        );

      console.warn(
        '[ServiGo Location] GPS no disponible; se utilizará la ubicación de respaldo:',
        normalized.message
      );

      return this.fallbackLocation(
        normalized.message
      );
    }
  }

  private async getRealPosition():
    Promise<Position> {

    this.ensureBrowserSupport();

    await this.ensurePermission();

    return Geolocation
      .getCurrentPosition(
        this.positionOptions
      );
  }

  private async startWatchSafely():
    Promise<void> {

    if (
      this.watchId
      || !this.technicianId
      || !this.requestId
    ) {
      return;
    }

    try {
      await this.ensurePermission();

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
                const normalized =
                  this.normaliseLocationError(
                    error
                  );

                console.warn(
                  '[ServiGo Location] No fue posible actualizar el GPS:',
                  normalized.message
                );

                this.startRecoveryLoop();
                return;
              }

              if (
                !position
              ) {
                return;
              }

              this.stopRecoveryLoop();

              void this.publishLocation(
                this.fromPosition(
                  position
                )
              ).catch(
                publishError => {
                  console.error(
                    '[ServiGo Location] Error publicando ubicación real:',
                    publishError
                  );
                }
              );
            }
          );

    } catch (error) {
      console.warn(
        '[ServiGo Location] watchPosition no disponible; se mantendrá el respaldo y se reintentará:',
        this.normaliseLocationError(
          error
        ).message
      );

      this.startRecoveryLoop();
    }
  }

  private startRecoveryLoop():
    void {

    if (
      this.recoveryTimer
      || !this.technicianId
      || !this.requestId
    ) {
      return;
    }

    this.recoveryTimer =
      setInterval(
        () => {
          void this.tryRecoverRealLocation();
        },
        this.recoveryIntervalMs
      );
  }

  private stopRecoveryLoop():
    void {

    if (
      this.recoveryTimer
    ) {
      clearInterval(
        this.recoveryTimer
      );

      this.recoveryTimer =
        null;
    }
  }

  private async tryRecoverRealLocation():
    Promise<void> {

    if (
      !this.technicianId
      || !this.requestId
    ) {
      this.stopRecoveryLoop();
      return;
    }

    try {
      const position =
        await this.getRealPosition();

      await this.publishLocation(
        this.fromPosition(
          position
        )
      );

      this.stopRecoveryLoop();

      if (
        !this.watchId
      ) {
        await this.startWatchSafely();
      }

    } catch {
      // Se mantiene la ubicación de respaldo y se intenta nuevamente.
    }
  }

  private async clearRuntimeState(
    keepIdentity: boolean
  ): Promise<void> {

    if (
      this.watchId
    ) {
      try {
        await Geolocation
          .clearWatch({
            id: this.watchId
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

    this.stopRecoveryLoop();

    this.validatedLocation =
      null;

    if (
      !keepIdentity
    ) {
      this.technicianId =
        null;

      this.requestId =
        null;
    }
  }

  private async publishLocation(
    location: ResolvedTechnicianLocation
  ): Promise<void> {

    if (
      !this.technicianId
      || !this.requestId
    ) {
      throw new Error(
        'location-tracking-not-initialized'
      );
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
        latitude:
          location.latitude,
        longitude:
          location.longitude,
        accuracy:
          location.accuracy,
        heading:
          location.heading,
        speed:
          location.speed,
        source:
          location.source,
        fallbackReason:
          location.fallbackReason,
        active: true,
        updatedAt:
          serverTimestamp()
      },
      {
        merge: true
      }
    );
  }

  private fromPosition(
    position: Position
  ): ResolvedTechnicianLocation {

    return {
      latitude:
        position.coords.latitude,
      longitude:
        position.coords.longitude,
      accuracy:
        Number.isFinite(
          position.coords.accuracy
        )
          ? position.coords.accuracy
          : 0,
      heading:
        typeof position.coords.heading === 'number'
        && Number.isFinite(position.coords.heading)
          ? position.coords.heading
          : null,
      speed:
        typeof position.coords.speed === 'number'
        && Number.isFinite(position.coords.speed)
          ? position.coords.speed
          : null,
      source: 'gps',
      fallbackReason: null
    };
  }

  private fallbackLocation(
    reason: string
  ): ResolvedTechnicianLocation {

    return {
      latitude:
        TECHNICIAN_FALLBACK_LOCATION.latitude,
      longitude:
        TECHNICIAN_FALLBACK_LOCATION.longitude,
      accuracy:
        TECHNICIAN_FALLBACK_LOCATION.accuracy,
      heading: null,
      speed: null,
      source: 'fallback',
      fallbackReason:
        reason
    };
  }

  private async ensurePermission():
    Promise<void> {

    let permission:
      PermissionStatus | null = null;

    try {
      permission =
        await Geolocation
          .checkPermissions();
    } catch (error) {
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
      && permission.coarseLocation === 'denied'
    ) {
      throw new Error(
        'location-permission-denied'
      );
    }

    if (
      Capacitor.isNativePlatform()
      && (
        permission.location === 'prompt'
        || permission.location === 'prompt-with-rationale'
        || permission.coarseLocation === 'prompt'
        || permission.coarseLocation === 'prompt-with-rationale'
      )
    ) {
      const requestedPermission =
        await Geolocation
          .requestPermissions();

      if (
        requestedPermission.location !== 'granted'
        && requestedPermission.coarseLocation !== 'granted'
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
      || !navigator.geolocation
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
      && [
        'location-permission-denied',
        'location-unavailable',
        'location-timeout',
        'location-not-supported'
      ].includes(
        error.message
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
      || code === '1'
      || code === 'OS-PLUG-GLOC-0003'
      || message.includes(
        'permission'
      )
      || message.includes(
        'denied'
      )
    ) {
      return new Error(
        'location-permission-denied'
      );
    }

    if (
      code === 3
      || code === '3'
      || code === 'OS-PLUG-GLOC-0010'
      || message.includes(
        'timeout'
      )
      || message.includes(
        'timed out'
      )
    ) {
      return new Error(
        'location-timeout'
      );
    }

    if (
      code === 2
      || code === '2'
      || code === 'OS-PLUG-GLOC-0002'
      || code === 'OS-PLUG-GLOC-0007'
      || code === 'OS-PLUG-GLOC-0008'
      || code === 'OS-PLUG-GLOC-0009'
      || message.includes(
        'unavailable'
      )
      || message.includes(
        'location services'
      )
      || message.includes(
        'disabled'
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
}
