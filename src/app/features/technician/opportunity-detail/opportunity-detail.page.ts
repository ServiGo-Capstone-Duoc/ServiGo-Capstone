import {
  CommonModule
} from '@angular/common';

import {
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
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
  flashOutline,
  imagesOutline,
  closeOutline,
  chevronBackOutline,
  chevronForwardOutline
} from 'ionicons/icons';

import {
  AuthService
} from '../../../core/services/auth.service';

import {
  MediaStorageService
} from '../../../core/services/media-storage.service';

import {
  TechnicianOpportunityService,
  TechnicianOpportunityView
} from '../../../core/services/technician-opportunity.service';


@Component({
  selector:
    'app-opportunity-detail',

  templateUrl:
    './opportunity-detail.page.html',

  styleUrls: [
    './opportunity-detail.page.scss'
  ],

  standalone:
    true,

  imports: [
    CommonModule,

    IonButton,
    IonContent,
    IonIcon,
    IonSpinner
  ]
})
export class OpportunityDetailPage
  implements OnInit, OnDestroy {


  /*
   * =========================================
   * SERVICIOS
   * =========================================
   */

  private readonly router =
    inject(Router);


  private readonly route =
    inject(ActivatedRoute);


  private readonly authService =
    inject(AuthService);


  private readonly opportunityService =
    inject(
      TechnicianOpportunityService
    );


  private readonly cdr =
    inject(ChangeDetectorRef);


  private readonly mediaStorage =
    inject(MediaStorageService);


  /*
   * =========================================
   * ESTADO
   * =========================================
   */

  opportunity:
    TechnicianOpportunityView | null =
      null;


  loading =
    true;


  errorMessage =
    '';


  photoUrls: string[] = [];

  photosLoading = false;

  photosError = '';

  viewerOpen = false;

  viewerIndex = 0;


  constructor() {

    addIcons({

      arrowBackOutline,

      constructOutline,

      locationOutline,

      timeOutline,

      calendarOutline,

      flashOutline,
      imagesOutline,
      closeOutline,
      chevronBackOutline,
      chevronForwardOutline
    });
  }


  /*
   * =========================================
   * INICIALIZACIÓN
   * =========================================
   */

  async ngOnInit():
    Promise<void> {


    this.loading =
      true;


    this.errorMessage =
      '';


    /*
     * =====================================
     * REQUEST ID DESDE LA URL
     * =====================================
     *
     * Ejemplo:
     *
     * /app/technician/opportunity/ABC123
     *
     * Ya no dependemos de router.state.
     */

    const requestId =
      this.route.snapshot
        .paramMap
        .get(
          'requestId'
        );


    if (
      !requestId
    ) {

      this.errorMessage =
        'No pudimos identificar la solicitud.';


      this.loading =
        false;


      this.cdr.detectChanges();

      return;
    }


    /*
     * =====================================
     * SESIÓN
     * =====================================
     */

    const user =
      await this.authService
        .waitForAuthReady();


    if (
      !user
    ) {

      this.errorMessage =
        'No existe una sesión válida.';


      this.loading =
        false;


      this.cdr.detectChanges();

      return;
    }


    /*
     * =====================================
     * CARGAR OPORTUNIDAD
     * =====================================
     */

    try {

      const result =
        await this.opportunityService
          .getOpportunityByRequestId(
            user.uid,
            requestId
          );


      /*
       * Puede ocurrir si:
       *
       * - no existe la oportunidad
       * - pertenece a otro técnico
       * - solicitud ya no está publicada
       * - oportunidad ya expiró
       */

      if (
        !result
      ) {

        this.errorMessage =
          'Esta oportunidad ya no está disponible.';

        return;
      }


      this.opportunity =
        result;


      await this.loadRequestPhotos(
        result.request.photoPaths
      );


      /*
       * =====================================
       * MARCAR COMO VISTA
       * =====================================
       *
       * Solo:
       *
       * available -> viewed
       *
       * Las nuevas Firestore Rules
       * permiten exactamente esta transición.
       */

      if (
        result.opportunity.status ===
        'available'
      ) {

        try {

          await this.opportunityService
            .markAsViewed(
              result.opportunity.id
            );


          /*
           * Actualización local.
           */

          result.opportunity.status =
            'viewed';


        } catch (error) {

          /*
           * Si falla viewedAt no impedimos
           * que el técnico vea el servicio.
           */

          console.error(
            '[ServiGo] Error marcando oportunidad como vista:',
            error
          );
        }
      }


      console.log(
        '[ServiGo] Oportunidad cargada:',
        result
      );


    } catch (error) {

      console.error(
        '[ServiGo] Error cargando detalle de oportunidad:',
        error
      );


      this.errorMessage =
        'No pudimos cargar la oportunidad.';


    } finally {

      this.loading =
        false;


      this.cdr.detectChanges();
    }
  }


  ngOnDestroy(): void {
    this.releasePhotoUrls();
  }


  private async loadRequestPhotos(
    paths: string[]
  ): Promise<void> {

    this.releasePhotoUrls();
    this.photosError = '';

    if (!Array.isArray(paths) || paths.length === 0) {
      return;
    }

    this.photosLoading = true;
    this.cdr.detectChanges();

    try {
      const results = await Promise.allSettled(
        paths.map(path => this.mediaStorage.loadImageObjectUrl(path))
      );

      this.photoUrls = results
        .filter((result): result is PromiseFulfilledResult<string> => result.status === 'fulfilled')
        .map(result => result.value);

      if (this.photoUrls.length !== paths.length) {
        this.photosError = 'Algunas imágenes no pudieron cargarse.';
      }
    } catch (error) {
      console.error('[ServiGo] Error cargando fotos de la oportunidad:', error);
      this.photosError = 'No pudimos cargar las fotos del problema.';
    } finally {
      this.photosLoading = false;
      this.cdr.detectChanges();
    }
  }


  private releasePhotoUrls(): void {
    for (const url of this.photoUrls) {
      this.mediaStorage.revokeObjectUrl(url);
    }
    this.photoUrls = [];
  }


  openPhoto(index: number): void {
    if (!this.photoUrls[index]) return;
    this.viewerIndex = index;
    this.viewerOpen = true;
  }


  closePhotoViewer(): void {
    this.viewerOpen = false;
  }


  previousPhoto(): void {
    if (this.photoUrls.length <= 1) return;
    this.viewerIndex = (this.viewerIndex - 1 + this.photoUrls.length) % this.photoUrls.length;
  }


  nextPhoto(): void {
    if (this.photoUrls.length <= 1) return;
    this.viewerIndex = (this.viewerIndex + 1) % this.photoUrls.length;
  }


  /*
   * =========================================
   * VOLVER
   * =========================================
   */

  async back():
    Promise<void> {


    await this.router.navigateByUrl(
      '/app/technician/home'
    );
  }


  /*
   * =========================================
   * COTIZAR
   * =========================================
   */

  async quote():
    Promise<void> {


    if (
      !this.opportunity
    ) {

      return;
    }


    /*
     * QuotePage recibirá únicamente
     * requestId desde la URL.
     *
     * Más adelante también la dejaremos
     * completamente autónoma.
     */

    await this.router.navigate(
      [
        '/app/technician/quote',
        this.opportunity.request.id
      ]
    );
  }


  /*
   * =========================================
   * URGENCIA
   * =========================================
   */

  getUrgencyLabel():
    string {


    const urgency =
      this.opportunity
        ?.request
        .urgency;


    if (
      urgency ===
      'urgent'
    ) {

      return 'Urgente';
    }


    if (
      urgency ===
      'soon'
    ) {

      return 'Pronto';
    }


    return 'Normal';
  }


  /*
   * =========================================
   * FECHA PREFERIDA
   * =========================================
   */

  getPreferredDate():
    string {


    const date =
      this.opportunity
        ?.request
        .preferredDate;


    if (
      !date
    ) {

      return 'Flexible';
    }


    return date.toLocaleDateString(
      'es-CL'
    );
  }
}