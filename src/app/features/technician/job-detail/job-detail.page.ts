import {
  CommonModule
} from '@angular/common';

import {
  FormsModule
} from '@angular/forms';

import {
  ChangeDetectorRef,
  Component,
  inject
} from '@angular/core';

import {
  ActivatedRoute,
  Router
} from '@angular/router';

import {
  IonButton,
  IonContent,
  IonIcon,
  IonSpinner
} from '@ionic/angular';

import {
  addIcons
} from 'ionicons';

import {
  arrowBackOutline,
  constructOutline,
  locationOutline,
  timeOutline,
  calendarOutline,
  personOutline,
  playCircleOutline,
  checkmarkCircleOutline,
  navigateOutline,
  flagOutline,
  closeCircleOutline
} from 'ionicons/icons';

import {
  AuthService
} from '../../../core/services/auth.service';

import {
  ServiceRequestService
} from '../../../core/services/service-request.service';

import {
  ResolvedTechnicianLocation,
  TechnicianLocationService
} from '../../../core/services/technician-location.service';

import {
  ServiceRequest
} from '../../../core/models/service-request.model';


@Component({
  selector:
    'app-technician-job-detail',

  templateUrl:
    './job-detail.page.html',

  styleUrls: [
    './job-detail.page.scss'
  ],

  standalone:
    true,

  imports: [
    CommonModule,
    FormsModule,
    IonButton,
    IonContent,
    IonIcon,
    IonSpinner
  ]
})
export class JobDetailPage {


  private readonly router =
    inject(
      Router
    );


  private readonly route =
    inject(
      ActivatedRoute
    );


  private readonly authService =
    inject(
      AuthService
    );


  private readonly requestService =
    inject(
      ServiceRequestService
    );


  private readonly locationService =
    inject(
      TechnicianLocationService
    );


  private readonly cdr =
    inject(
      ChangeDetectorRef
    );


  job:
    ServiceRequest | null =
      null;


  loading =
    true;


  loadingAction =
    false;


  errorMessage =
    '';


  actionError =
    '';


  locationNotice =
    '';


  /*
   * =========================================
   * CANCELACIÓN
   * =========================================
   */

  showCancellationForm =
    false;


  cancellationReason =
    '';


  cancellingJob =
    false;


  cancellationError =
    '';


  constructor() {

    addIcons({
      arrowBackOutline,
      constructOutline,
      locationOutline,
      timeOutline,
      calendarOutline,
      personOutline,
      playCircleOutline,
      checkmarkCircleOutline,
      navigateOutline,
      flagOutline,
      closeCircleOutline
    });
  }


  /*
   * =========================================
   * ENTRAR A LA PANTALLA
   * =========================================
   */

  async ionViewWillEnter():
    Promise<void> {


    await this.loadJob();


    /*
     * Si el trabajo ya estaba en camino,
     * por ejemplo porque:
     *
     * - el técnico cerró ServiGo
     * - navegó a otra pantalla
     * - Android cerró la actividad
     * - estamos probando un trabajo en_route
     *
     * reanudamos automáticamente el tracking.
     */

    if (
      this.job?.status ===
      'en_route'
    ) {

      await this.resumeLocationTracking();
    }
  }


  /*
   * =========================================
   * CARGAR TRABAJO
   * =========================================
   */

  async loadJob():
    Promise<void> {


    this.loading =
      true;


    this.errorMessage =
      '';


    this.actionError =
      '';


    const requestId =
      this.route.snapshot
        .paramMap
        .get(
          'requestId'
        );


    const user =
      await this.authService
        .waitForAuthReady();


    if (
      !requestId
      ||
      !user
    ) {

      this.loading =
        false;


      this.errorMessage =
        'No pudimos cargar el trabajo.';


      this.cdr
        .detectChanges();


      return;
    }


    try {

      this.job =
        await this.requestService
          .getRequestForTechnician(
            requestId,
            user.uid
          );


      if (
        !this.job
      ) {

        this.errorMessage =
          'Este trabajo no está asignado a tu cuenta.';
      }


    } catch (error) {

      console.error(
        '[ServiGo] Error cargando detalle del trabajo:',
        error
      );


      this.errorMessage =
        'No pudimos cargar el trabajo.';


    } finally {

      this.loading =
        false;


      this.cdr
        .detectChanges();
    }
  }


  /*
   * =========================================
   * REANUDAR TRACKING GPS
   * =========================================
   *
   * Se utiliza cuando abrimos un trabajo
   * que YA está en estado en_route.
   *
   * NO vuelve a ejecutar start_trip.
   *
   * Solamente:
   *
   * - comprueba GPS
   * - obtiene usuario
   * - reinicia watchPosition
   * - vuelve a publicar technicianLocations
   */

  private async resumeLocationTracking():
    Promise<void> {

    if (
      !this.job
      || this.job.status !==
        'en_route'
    ) {
      return;
    }

    try {
      const user =
        await this.authService
          .waitForAuthReady();

      if (
        !user
      ) {
        throw new Error(
          'location-user-not-authenticated'
        );
      }

      const resolvedLocation =
        await this.locationService
          .startTracking(
            user.uid,
            this.job.id
          );

      this.setLocationNotice(
        resolvedLocation
      );

    } catch (error: any) {
      console.error(
        '[ServiGo Location] No fue posible reanudar tracking:',
        error
      );

      this.actionError =
        this.getLocationErrorMessage(
          error,
          'El trabajo continúa en camino, pero no pudimos publicar la ubicación.'
        );

      this.cdr.detectChanges();
    }
  }

  /*
   * =========================================
   * IR AL DOMICILIO
   * =========================================
   *
   * accepted -> en_route
   */

  async startTrip():
    Promise<void> {

    if (
      !this.job
      || this.job.status !==
        'accepted'
      || this.loadingAction
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        '¿Confirmas que vas en camino al domicilio del cliente?'
      );

    if (
      !confirmed
    ) {
      return;
    }

    this.loadingAction =
      true;

    this.actionError =
      '';

    this.locationNotice =
      '';

    this.cdr.detectChanges();

    try {
      /*
       * Resolvemos una posición antes del cambio de estado. La resolución
       * siempre devuelve GPS real o una ubicación de continuidad, por lo
       * que una limitación del dispositivo no bloquea la operación.
       */
      const initialLocation =
        await this.locationService
          .ensureLocationAvailable();

      await this.requestService
        .startTrip(
          this.job.id
        );

      this.job = {
        ...this.job,
        status: 'en_route'
      };

      const user =
        await this.authService
          .waitForAuthReady();

      if (
        !user
      ) {
        throw new Error(
          'location-user-not-authenticated'
        );
      }

      try {
        const publishedLocation =
          await this.locationService
            .startTracking(
              user.uid,
              this.job.id,
              initialLocation
            );

        this.setLocationNotice(
          publishedLocation
        );

      } catch (locationError) {
        console.error(
          '[ServiGo Location] El viaje comenzó, pero no se pudo publicar la ubicación:',
          locationError
        );

        this.locationNotice =
          'El viaje fue iniciado. El seguimiento se reintentará automáticamente cuando exista conexión.';
      }

    } catch (error: any) {
      console.error(
        '[ServiGo] Error iniciando desplazamiento:',
        error
      );

      this.actionError =
        this.getActionErrorMessage(
          error,
          'No pudimos iniciar el desplazamiento.'
        );

    } finally {
      this.loadingAction =
        false;

      this.cdr.detectChanges();
    }
  }

  /*
   * =========================================
   * MARCAR LLEGADA
   * =========================================
   *
   * en_route -> arrived
   */

  async markArrived():
    Promise<void> {


    if (
      !this.job
      ||
      this.job.status !==
        'en_route'
      ||
      this.loadingAction
    ) {

      return;
    }


    const confirmed =
      window.confirm(
        '¿Confirmas que llegaste al domicilio del cliente?'
      );


    if (
      !confirmed
    ) {

      return;
    }


    this.loadingAction =
      true;


    this.actionError =
      '';


    this.cdr
      .detectChanges();


    try {


      /*
       * =====================================
       * 1. BACKEND
       * =====================================
       *
       * en_route -> arrived
       */

      await this.requestService
        .markArrived(
          this.job.id
        );


      this.job = {

        ...this.job,

        status:
          'arrived'
      };


      /*
       * =====================================
       * 2. DETENER TRACKING
       * =====================================
       *
       * Privacidad:
       *
       * - clearWatch()
       * - eliminar technicianLocations
       */

      try {
        await this.locationService
          .stopTracking();
      } catch (locationError) {
        console.warn(
          '[ServiGo Location] La llegada fue registrada, pero no fue posible limpiar inmediatamente la ubicación compartida:',
          locationError
        );

        this.locationNotice =
          'La llegada fue registrada. ServiGo volverá a limpiar la ubicación compartida por privacidad.';
      }


    } catch (error: any) {

      console.error(
        '[ServiGo] Error marcando llegada:',
        error
      );


      this.actionError =
        this.getActionErrorMessage(
          error,
          'No pudimos registrar tu llegada.'
        );


    } finally {

      this.loadingAction =
        false;


      this.cdr
        .detectChanges();
    }
  }


  /*
   * =========================================
   * INICIAR TRABAJO
   * =========================================
   *
   * arrived -> in_progress
   */

  async startJob():
    Promise<void> {


    if (
      !this.job
      ||
      this.job.status !==
        'arrived'
      ||
      this.loadingAction
    ) {

      return;
    }


    const confirmed =
      window.confirm(
        '¿Confirmas que deseas iniciar el trabajo en el domicilio?'
      );


    if (
      !confirmed
    ) {

      return;
    }


    this.loadingAction =
      true;


    this.actionError =
      '';


    this.cdr
      .detectChanges();


    try {

      await this.requestService
        .startJob(
          this.job.id
        );


      this.job = {

        ...this.job,

        status:
          'in_progress'
      };


    } catch (error: any) {

      console.error(
        '[ServiGo] Error iniciando trabajo:',
        error
      );


      this.actionError =
        this.getActionErrorMessage(
          error,
          'No pudimos iniciar el trabajo.'
        );


    } finally {

      this.loadingAction =
        false;


      this.cdr
        .detectChanges();
    }
  }


  /*
   * =========================================
   * FINALIZAR TRABAJO
   * =========================================
   *
   * in_progress -> completed
   */

  async completeJob():
    Promise<void> {


    if (
      !this.job
      ||
      this.job.status !==
        'in_progress'
      ||
      this.loadingAction
    ) {

      return;
    }


    const confirmed =
      window.confirm(
        '¿Confirmas que el trabajo fue finalizado?'
      );


    if (
      !confirmed
    ) {

      return;
    }


    this.loadingAction =
      true;


    this.actionError =
      '';


    this.cdr
      .detectChanges();


    try {

      await this.requestService
        .completeJob(
          this.job.id
        );


      this.job = {

        ...this.job,

        status:
          'completed'
      };


    } catch (error: any) {

      console.error(
        '[ServiGo] Error finalizando trabajo:',
        error
      );


      this.actionError =
        this.getActionErrorMessage(
          error,
          'No pudimos finalizar el trabajo.'
        );


    } finally {

      this.loadingAction =
        false;


      this.cdr
        .detectChanges();
    }
  }


  /*
   * =========================================
   * CANCELAR TRABAJO
   * =========================================
   *
   * El técnico puede cancelar únicamente:
   *
   * accepted
   * en_route
   * arrived
   *
   * El backend vuelve a validar todo de forma
   * autoritativa mediante cancelService.
   */

  get canCancelJob():
    boolean {

    return (
      this.job?.status ===
        'accepted'
      ||
      this.job?.status ===
        'en_route'
      ||
      this.job?.status ===
        'arrived'
    );
  }


  openCancellationForm():
    void {

    if (
      !this.canCancelJob
      ||
      this.loadingAction
      ||
      this.cancellingJob
    ) {

      return;
    }


    this.cancellationError =
      '';


    this.showCancellationForm =
      true;


    this.cdr.detectChanges();
  }


  closeCancellationForm():
    void {

    if (
      this.cancellingJob
    ) {

      return;
    }


    this.showCancellationForm =
      false;


    this.cancellationReason =
      '';


    this.cancellationError =
      '';


    this.cdr.detectChanges();
  }


  async confirmCancellation():
    Promise<void> {

    if (
      !this.job
      ||
      !this.canCancelJob
      ||
      this.loadingAction
      ||
      this.cancellingJob
    ) {

      return;
    }


    const reason =
      this.cancellationReason
        .trim();


    if (
      reason.length < 5
    ) {

      this.cancellationError =
        'Indica el motivo de la cancelación con al menos 5 caracteres.';


      return;
    }


    const wasEnRoute =
      this.job.status ===
        'en_route';


    this.cancellingJob =
      true;


    this.cancellationError =
      '';


    this.actionError =
      '';


    this.cdr.detectChanges();


    try {

      /*
       * 1. Backend autoritativo.
       */

      await this.requestService
        .cancelService(
          this.job.id,
          reason
        );


      /*
       * 2. Si el teléfono estaba publicando GPS,
       * detener también el watch local.
       *
       * El backend ya elimina technicianLocations,
       * por lo que existen dos capas de privacidad.
       */

      if (
        wasEnRoute
      ) {

        try {

          await this.locationService
            .stopTracking();


        } catch (locationError) {

          console.warn(
            '[ServiGo Location] El backend canceló el trabajo, pero hubo un problema deteniendo el tracking local:',
            locationError
          );
        }
      }


      /*
       * 3. Reflejo inmediato en UI.
       */

      this.job = {
        ...this.job,
        status:
          'cancelled'
      };


      this.showCancellationForm =
        false;


      this.cancellationReason =
        '';


      


    } catch (error: any) {

      console.error(
        '[ServiGo] Error cancelando trabajo:',
        error
      );


      if (
        error?.code ===
          'functions/failed-precondition'
      ) {

        this.cancellationError =
          'Este trabajo ya no puede ser cancelado.';


      } else if (
        error?.code ===
          'functions/permission-denied'
      ) {

        this.cancellationError =
          'No tienes permisos para cancelar este trabajo.';


      } else if (
        error?.code ===
          'functions/invalid-argument'
      ) {

        this.cancellationError =
          'Revisa el motivo de cancelación.';


      } else {

        this.cancellationError =
          'No pudimos cancelar el trabajo. Intenta nuevamente.';
      }


    } finally {

      this.cancellingJob =
        false;


      this.cdr.detectChanges();
    }
  }


  /*
   * =========================================
   * VOLVER
   * =========================================
   */

  async back():
    Promise<void> {

    await this.router
      .navigateByUrl(
        '/app/technician/jobs'
      );
  }




  /*
   * =========================================
   * RESUMEN ECONÓMICO
   * =========================================
   */

  get paymentAmount(): number | null {

    if (
      typeof this.job?.paidAmount === 'number'
      && this.job.paidAmount > 0
    ) {
      return this.job.paidAmount;
    }

    const snapshotAmount =
      this.job?.acceptedQuoteSnapshot?.totalAmount;

    return typeof snapshotAmount === 'number'
      && snapshotAmount > 0
        ? snapshotAmount
        : null;
  }


  get paymentLabel(): string {

    return this.job?.paymentStatus === 'paid'
      ? 'Pagado'
      : 'Pendiente de pago';
  }


  formatCurrency(
    amount: number | null | undefined
  ): string {

    if (
      typeof amount !== 'number'
      || amount <= 0
    ) {
      return '—';
    }

    return new Intl.NumberFormat(
      'es-CL',
      {
        style: 'currency',
        currency: 'CLP',
        maximumFractionDigits: 0
      }
    ).format(amount);
  }


  formatDateTime(
    date: Date | null | undefined
  ): string {

    if (!date) {
      return '';
    }

    return date.toLocaleString(
      'es-CL',
      {
        dateStyle: 'medium',
        timeStyle: 'short'
      }
    );
  }


  /*
   * =========================================
   * FECHA
   * =========================================
   */

  formatDate(
    date: Date | null
  ): string {


    if (
      !date
    ) {

      return 'Flexible';
    }


    return date
      .toLocaleDateString(
        'es-CL'
      );
  }


  /*
   * =========================================
   * ETIQUETA DE ESTADO
   * =========================================
   */

  getStatusLabel():
    string {


    switch (
      this.job?.status
    ) {

      case 'accepted':

        return 'Trabajo asignado';


      case 'en_route':

        return 'En camino';


      case 'arrived':

        return 'En el domicilio';


      case 'in_progress':

        return 'Trabajo en curso';


      case 'completed':

        return 'Trabajo finalizado';


      case 'cancelled':

        return 'Trabajo cancelado';


      default:

        return 'Trabajo';
    }
  }


  private setLocationNotice(
    location: ResolvedTechnicianLocation
  ): void {

    this.locationNotice =
      location.source === 'fallback'
        ? 'GPS no disponible. ServiGo comparte temporalmente una ubicación de respaldo en Santiago y reemplazará el punto por tu ubicación real cuando esté disponible.'
        : 'Ubicación real activa. El cliente puede seguir tu desplazamiento.';
  }


  /*
   * =========================================
   * ERRORES DE ACCIÓN
   * =========================================
   */

  private getLocationErrorMessage(
    error: any,
    fallback: string
  ): string {


    const message =
      error?.message
      ?? '';


    switch (
      message
    ) {

      case 'location-permission-denied':

        return 'Debes permitir el acceso a tu ubicación para compartir el viaje con el cliente.';


      case 'location-unavailable':

        return 'Activa la ubicación de tu equipo o dispositivo e inténtalo nuevamente.';


      case 'location-timeout':

        return 'No pudimos obtener tu ubicación a tiempo. Revisa la señal y vuelve a intentarlo.';


      case 'location-not-supported':

        return 'Este navegador o dispositivo no permite compartir la ubicación.';


      default:

        return fallback;
    }
  }


  private getActionErrorMessage(
    error: any,
    fallback: string
  ): string {


    const code =
      error?.code
      ?? '';


    if (
      code ===
      'functions/permission-denied'
    ) {

      return 'Este trabajo no está asignado a tu cuenta.';
    }


    if (
      code ===
      'functions/failed-precondition'
    ) {

      return 'El estado del trabajo cambió y esta acción ya no está disponible.';
    }


    if (
      code ===
      'functions/unauthenticated'
    ) {

      return 'Tu sesión ya no es válida.';
    }


    return fallback;
  }
}