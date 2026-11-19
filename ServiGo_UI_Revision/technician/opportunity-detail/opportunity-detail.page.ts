import {
  CommonModule
} from '@angular/common';

import {
  ChangeDetectorRef,
  Component,
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
  flashOutline
} from 'ionicons/icons';

import {
  AuthService
} from '../../../core/services/auth.service';

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
  implements OnInit {


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


  constructor() {

    addIcons({

      arrowBackOutline,

      constructOutline,

      locationOutline,

      timeOutline,

      calendarOutline,

      flashOutline
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