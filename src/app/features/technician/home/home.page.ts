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
  Router
} from '@angular/router';

import {
  IonContent,
  IonIcon,
  IonSpinner
} from '@ionic/angular';

import {
  addIcons
} from 'ionicons';

import {
  constructOutline,
  timeOutline,
  documentTextOutline,
  star,
  locationOutline,
  chevronForwardOutline
} from 'ionicons/icons';

import {
  AppModeService
} from '../../../core/services/app-mode.service';

import {
  AuthService
} from '../../../core/services/auth.service';

import {
  ProfileService
} from '../../../core/services/profile.service';

import {
  PushNotificationService
} from '../../../core/services/push-notification.service';

import {
  ServiceRequestService
} from '../../../core/services/service-request.service';

import {
  TechnicianOpportunityService,
  TechnicianOpportunityView
} from '../../../core/services/technician-opportunity.service';

import {
  ServiceRequest
} from '../../../core/models/service-request.model';



import {
  ModeSwitcherComponent
} from '../../../shared/components/mode-switcher/mode-switcher.component';


@Component({
  selector:
    'app-technician-home',

  templateUrl:
    './home.page.html',

  styleUrls: [
    './home.page.scss'
  ],

  standalone:
    true,

  imports: [
    CommonModule,

    IonContent,
    IonIcon,
    IonSpinner,

    ModeSwitcherComponent
  ]
})
export class HomePage
  implements OnInit {


  /*
   * =========================================
   * SERVICIOS
   * =========================================
   */

  private readonly router =
    inject(Router);


  private readonly modeService =
    inject(AppModeService);


  private readonly authService =
    inject(AuthService);


  private readonly requestService =
    inject(ServiceRequestService);


  private readonly opportunityService =
    inject(
      TechnicianOpportunityService
    );


  private readonly profileService =
    inject(ProfileService);


  private readonly pushNotificationService =
    inject(
      PushNotificationService
    );


  private readonly cdr =
    inject(ChangeDetectorRef);


  /*
   * =========================================
   * OBSERVABLES
   * =========================================
   */

  readonly profile$ =
    this.profileService.profile$;


  readonly mode$ =
    this.modeService.mode$;


  /*
   * =========================================
   * OPORTUNIDADES
   * =========================================
   *
   * Estas oportunidades YA EXISTEN
   * en Firestore.
   *
   * El Home técnico:
   *
   * - NO hace matching
   * - NO calcula score
   * - NO calcula prioridad
   * - NO decide push
   * - NO crea oportunidades
   *
   * Todo eso pertenece al backend.
   * =========================================
   */

opportunities:
  TechnicianOpportunityView[] = [];


  loadingOpportunities =
    true;


  opportunitiesError =
    '';


  /*
   * =========================================
   * TRABAJOS ACTIVOS
   * =========================================
   */

  activeJobs:
    ServiceRequest[] = [];


  loadingActiveJobs =
    true;


  constructor() {

    addIcons({

      constructOutline,

      timeOutline,

      documentTextOutline,

      star,

      locationOutline,

      chevronForwardOutline
    });
  }


  /*
   * =========================================
   * INIT
   * =========================================
   */

  async ngOnInit():
    Promise<void> {


    this.modeService.setMode(
      'tecnico'
    );


    /*
     * Registro FCM del dispositivo.
     *
     * Esto sigue perteneciendo al cliente
     * porque cada dispositivo debe registrar
     * su propio token.
     */

    await this.pushNotificationService
      .initialize();


    await this.loadDashboard();
  }


  /*
   * =========================================
   * DASHBOARD
   * =========================================
   */

  async loadDashboard():
    Promise<void> {


    this.loadingOpportunities =
      true;


    this.loadingActiveJobs =
      true;


    this.opportunitiesError =
      '';


    const user =
      await this.authService
        .waitForAuthReady();


    if (!user) {

      this.loadingOpportunities =
        false;


      this.loadingActiveJobs =
        false;


      this.opportunitiesError =
        'No pudimos validar tu sesión.';


      this.cdr.detectChanges();

      return;
    }


    try {

      /*
       * =====================================
       * CARGA PARALELA
       * =====================================
       *
       * Oportunidades:
       * generadas previamente por backend.
       *
       * Trabajos:
       * solicitudes ya asignadas al técnico.
       */

      const [
        opportunities,
        activeJobs
      ] =
        await Promise.all([

          this.opportunityService
            .getAvailableOpportunities(
              user.uid
            ),

          this.requestService
            .getAssignedRequestsForTechnician(
              user.uid
            )
        ]);


      this.opportunities =
        opportunities;


      this.activeJobs =
        activeJobs;


      console.log(
        '[ServiGo] Oportunidades backend:',
        this.opportunities
      );


      console.log(
        '[ServiGo] Trabajos activos:',
        this.activeJobs
      );


      if (
        this.opportunities.length ===
        0
      ) {

        console.log(
          '[ServiGo] No existen oportunidades disponibles.'
        );
      }


    } catch (error) {

      console.error(
        '[ServiGo] Error cargando dashboard técnico:',
        error
      );


      this.opportunitiesError =
        'No pudimos cargar la información profesional.';


    } finally {

      this.loadingOpportunities =
        false;


      this.loadingActiveJobs =
        false;


      this.cdr.detectChanges();
    }
  }


  /*
   * =========================================
   * ABRIR OPORTUNIDAD
   * =========================================
   */

  async openOpportunity(
  item:
    TechnicianOpportunityView
): Promise<void> {


  /*
   * Registramos que el técnico abrió
   * la oportunidad.
   */

  try {

    if (
      item.opportunity.status ===
      'available'
    ) {

      await this.opportunityService
        .markAsViewed(
          item.opportunity.id
        );


      item.opportunity.status =
        'viewed';
    }


  } catch (error) {

    /*
     * Una falla registrando viewedAt
     * no debe impedir abrir el servicio.
     */

    console.error(
      '[ServiGo] Error marcando oportunidad como vista:',
      error
    );
  }


  await this.router.navigate(
    [
      '/app/technician/opportunity',
      item.request.id
    ],
    {
      state: {

        /*
         * Mantenemos temporalmente una estructura
         * compatible con OpportunityDetailPage.
         */

        opportunity: {

          request:
            item.request,

          matchScore:
            item.opportunity.matchScore,

          matchReasons:
            item.opportunity.matchReasons,

          opportunityId:
            item.opportunity.id
        }
      }
    }
  );
}


  /*
   * =========================================
   * VER TODAS LAS OPORTUNIDADES
   * =========================================
   */

  openOpportunities():
    void {


    console.log(
      '[ServiGo] Ver oportunidades:',
      this.opportunities
    );
  }


  /*
   * =========================================
   * TRABAJOS ACTIVOS
   * =========================================
   */

  openActiveJobs():
    void {


    console.log(
      '[ServiGo] Trabajos activos:',
      this.activeJobs
    );
  }


  /*
   * =========================================
   * PRESUPUESTOS
   * =========================================
   */

  openQuotes():
    void {


    console.log(
      '[ServiGo] Presupuestos'
    );
  }
}