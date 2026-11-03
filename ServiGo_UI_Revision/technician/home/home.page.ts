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
  QuoteService
} from '../../../core/services/quote.service';

import {
  ServiceRequestService
} from '../../../core/services/service-request.service';

import {
  DemandAnalyticsService
} from '../../../core/services/demand-analytics.service';

import {
  TechnicianOpportunityService,
  TechnicianOpportunityView
} from '../../../core/services/technician-opportunity.service';

import {
  Quote
} from '../../../core/models/quote.model';

import {
  ServiceRequest
} from '../../../core/models/service-request.model';

import {
  DemandAnalytics,
  DemandRecommendation
} from '../../../core/models/demand-analytics.model';

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
    inject(
      Router
    );


  private readonly modeService =
    inject(
      AppModeService
    );


  private readonly authService =
    inject(
      AuthService
    );


  private readonly requestService =
    inject(
      ServiceRequestService
    );


  private readonly demandAnalyticsService =
    inject(
      DemandAnalyticsService
    );


  private readonly opportunityService =
    inject(
      TechnicianOpportunityService
    );


  private readonly quoteService =
    inject(
      QuoteService
    );


  private readonly profileService =
    inject(
      ProfileService
    );


  private readonly pushNotificationService =
    inject(
      PushNotificationService
    );


  private readonly cdr =
    inject(
      ChangeDetectorRef
    );


  /*
   * =========================================
   * OBSERVABLES
   * =========================================
   */

  readonly profile$ =
    this.profileService
      .profile$;


  readonly mode$ =
    this.modeService
      .mode$;


  /*
   * =========================================
   * OPORTUNIDADES
   * =========================================
   */

  opportunities:
    TechnicianOpportunityView[] =
      [];


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
    ServiceRequest[] =
      [];


  loadingActiveJobs =
    true;


  /*
   * =========================================
   * PRESUPUESTOS
   * =========================================
   */

  quotes:
    Quote[] =
      [];


  loadingQuotes =
    true;


  /*
   * =========================================
   * DEMANDA RECOMENDADA
   * =========================================
   */

  demandPredictions:
    DemandAnalytics[] =
      [];


  demandAnalytics:
    DemandAnalytics | null =
      null;


  demandCategories:
    string[] =
      [];


  demandTimeBands:
    string[] =
      [];


  selectedDemandCategory =
    '';


  selectedDemandTimeBand =
    '';


  loadingDemandAnalytics =
    true;


  demandAnalyticsError =
    '';


  /*
   * =========================================
   * PUSH
   * =========================================
   */

  private pushInitialized =
    false;


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


    this.modeService
      .setMode(
        'tecnico'
      );


    /*
     * =====================================
     * PUSH
     * =====================================
     */

    if (
      !this.pushInitialized
    ) {

      try {

        await this
          .pushNotificationService
          .initialize();


        this.pushInitialized =
          true;


      } catch (error) {

        console.error(
          '[ServiGo] Error inicializando notificaciones:',
          error
        );
      }
    }
  }


  /*
   * =========================================
   * ION VIEW WILL ENTER
   * =========================================
   */

  async ionViewWillEnter():
    Promise<void> {


    this.modeService
      .setMode(
        'tecnico'
      );


    console.log(
      '[ServiGo] Home técnico activo. Recargando dashboard...'
    );


    await this.loadDashboard();
  }


  /*
   * =========================================
   * DASHBOARD
   * =========================================
   */

  async loadDashboard():
    Promise<void> {


    /*
     * =====================================
     * ESTADO DE CARGA
     * =====================================
     */

    this.loadingOpportunities =
      true;


    this.loadingActiveJobs =
      true;


    this.loadingQuotes =
      true;


    this.loadingDemandAnalytics =
      true;


    this.opportunitiesError =
      '';


    this.demandAnalyticsError =
      '';


    /*
     * =====================================
     * LIMPIAR DATOS ANTERIORES
     * =====================================
     */

    this.opportunities =
      [];


    this.activeJobs =
      [];


    this.quotes =
      [];


    this.demandPredictions =
      [];


    this.demandAnalytics =
      null;


    this.demandCategories =
      [];


    this.demandTimeBands =
      [];


    this.selectedDemandCategory =
      '';


    this.selectedDemandTimeBand =
      '';


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

      this.loadingOpportunities =
        false;


      this.loadingActiveJobs =
        false;


      this.loadingQuotes =
        false;


      this.loadingDemandAnalytics =
        false;


      this.opportunitiesError =
        'No pudimos validar tu sesión.';


      this.demandAnalyticsError =
        'No pudimos validar tu sesión.';


      this.cdr
        .detectChanges();


      return;
    }


    /*
     * =====================================
     * CARGA DEL DASHBOARD
     * =====================================
     */

    try {

      const [
        opportunities,
        activeJobs,
        quotes,
        demandPredictions
      ] =
        await Promise.all([


          /*
           * Oportunidades disponibles.
           */

          this.opportunityService
            .getAvailableOpportunities(
              user.uid
            ),


          /*
           * Servicios asignados.
           */

          this.requestService
            .getAssignedRequestsForTechnician(
              user.uid
            ),


          /*
           * Presupuestos enviados.
           */

          this.quoteService
            .getQuotesForTechnician(
              user.uid
            ),


          /*
           * Todas las combinaciones de
           * demanda disponibles.
           */

          this.demandAnalyticsService
            .getPredictions()
        ]);


      /*
       * =====================================
       * ASIGNACIÓN
       * =====================================
       */

      this.opportunities =
        opportunities;


      this.activeJobs =
        activeJobs;


      this.quotes =
        quotes;


      this.demandPredictions =
        demandPredictions;


      /*
       * Inicializamos categoría,
       * franja y predicción visible.
       */

      this.initializeDemandSelection();


      /*
       * =====================================
       * LOGS
       * =====================================
       */

      console.log(
        '[ServiGo] Oportunidades backend:',
        this.opportunities
      );


      console.log(
        '[ServiGo] Trabajos activos:',
        this.activeJobs
      );


      console.log(
        '[ServiGo] Presupuestos enviados:',
        this.quotes
      );


      console.log(
        '[ServiGo] Predicciones de demanda cargadas:',
        this.demandPredictions.length
      );


      console.log(
        '[ServiGo] Demanda seleccionada:',
        this.demandAnalytics
      );


      if (
        this.opportunities.length ===
          0
      ) {

        console.log(
          '[ServiGo] No existen oportunidades disponibles.'
        );
      }


      if (
        this.demandPredictions.length ===
          0
      ) {

        console.log(
          '[ServiGo] No existen recomendaciones de demanda disponibles.'
        );
      }


    } catch (error) {

      console.error(
        '[ServiGo] Error cargando dashboard técnico:',
        error
      );


      this.opportunities =
        [];


      this.activeJobs =
        [];


      this.quotes =
        [];


      this.demandPredictions =
        [];


      this.demandAnalytics =
        null;


      this.demandCategories =
        [];


      this.demandTimeBands =
        [];


      this.selectedDemandCategory =
        '';


      this.selectedDemandTimeBand =
        '';


      this.opportunitiesError =
        'No pudimos cargar la información profesional.';


      this.demandAnalyticsError =
        'No pudimos cargar la recomendación de demanda.';


    } finally {

      this.loadingOpportunities =
        false;


      this.loadingActiveJobs =
        false;


      this.loadingQuotes =
        false;


      this.loadingDemandAnalytics =
        false;


      this.cdr
        .detectChanges();
    }
  }


  /*
   * =========================================
   * INICIALIZAR SELECTORES DE DEMANDA
   * =========================================
   */

  private initializeDemandSelection():
    void {


    this.demandCategories =
      this.demandAnalyticsService
        .getCategories(
          this.demandPredictions
        );


    if (
      this.demandCategories.length ===
        0
    ) {

      this.demandAnalytics =
        null;


      return;
    }


    /*
     * Electricidad como categoría inicial
     * cuando esté disponible.
     */

    this.selectedDemandCategory =
      this.demandCategories.includes(
        'Electricidad'
      )
        ? 'Electricidad'
        : (
            this.demandCategories[
              0
            ]
            ??
            ''
          );


    this.refreshDemandTimeBands();


    /*
     * Mañana como franja inicial
     * cuando esté disponible.
     */

    this.selectedDemandTimeBand =
      this.demandTimeBands.includes(
        'Mañana'
      )
        ? 'Mañana'
        : (
            this.demandTimeBands[
              0
            ]
            ??
            ''
          );


    this.refreshDemandPrediction();
  }


  /*
   * =========================================
   * CAMBIO DE CATEGORÍA
   * =========================================
   */

  onDemandCategoryChange(
    value:
      string
  ): void {


    this.selectedDemandCategory =
      value;


    this.refreshDemandTimeBands();


    /*
     * Si la franja anterior no existe para
     * la nueva categoría seleccionamos
     * nuevamente una válida.
     */

    if (
      !this.demandTimeBands.includes(
        this.selectedDemandTimeBand
      )
    ) {

      this.selectedDemandTimeBand =
        this.demandTimeBands.includes(
          'Mañana'
        )
          ? 'Mañana'
          : (
              this.demandTimeBands[
                0
              ]
              ??
              ''
            );
    }


    this.refreshDemandPrediction();
  }


  /*
   * =========================================
   * CAMBIO DE FRANJA
   * =========================================
   */

  onDemandTimeBandChange(
    value:
      string
  ): void {


    this.selectedDemandTimeBand =
      value;


    this.refreshDemandPrediction();
  }


  /*
   * =========================================
   * FRANJAS DISPONIBLES
   * =========================================
   */

  private refreshDemandTimeBands():
    void {


    this.demandTimeBands =
      this.demandAnalyticsService
        .getTimeBands(
          this.demandPredictions,
          this.selectedDemandCategory
        );
  }


  /*
   * =========================================
   * ACTUALIZAR PREDICCIÓN
   * =========================================
   */

  private refreshDemandPrediction():
    void {


    if (
      !this.selectedDemandCategory
      ||
      !this.selectedDemandTimeBand
    ) {

      this.demandAnalytics =
        null;


      return;
    }


    this.demandAnalytics =
      this.demandAnalyticsService
        .findPrediction(
          this.demandPredictions,
          this.selectedDemandCategory,
          this.selectedDemandTimeBand
        );


    console.log(
      '[ServiGo] Predicción seleccionada:',
      {
        category:
          this.selectedDemandCategory,

        timeBand:
          this.selectedDemandTimeBand,

        prediction:
          this.demandAnalytics
      }
    );
  }


  /*
   * =========================================
   * TOP DEMANDA
   * =========================================
   */

  get topDemandRecommendations():
    DemandRecommendation[] {


    return (
      this.demandAnalytics
        ?.recommendations
        ?.slice(
          0,
          3
        )
      ??
      []
    );
  }


  /*
   * =========================================
   * FECHA DE PREDICCIÓN
   * =========================================
   */

  get demandPredictionDateLabel():
    string {


    const value =
      this.demandAnalytics
        ?.predictionDate;


    if (
      !value
    ) {

      return '';
    }


    const parts =
      value.split(
        '-'
      );


    if (
      parts.length !==
        3
    ) {

      return value;
    }


    return (
      `${parts[2]}/${parts[1]}`
    );
  }


  /*
   * =========================================
   * CLASE VISUAL NIVEL DEMANDA
   * =========================================
   */

  getDemandLevelClass(
    level:
      DemandRecommendation[
        'level'
      ]
  ): string {


    switch (
      level
    ) {

      case 'Alta':

        return 'high';


      case 'Media':

        return 'medium';


      case 'Baja':

        return 'low';


      default:

        return '';
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


    await this.router
      .navigate(
        [
          '/app/technician/opportunity',
          item.request.id
        ]
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

  async openActiveJobs():
    Promise<void> {


    await this.router
      .navigateByUrl(
        '/app/technician/jobs'
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
      '[ServiGo] Presupuestos enviados:',
      this.quotes
    );
  }
}