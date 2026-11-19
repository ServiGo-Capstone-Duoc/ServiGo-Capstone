import {
  CommonModule
} from '@angular/common';

import {
  ChangeDetectorRef,
  Component,
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
  arrowBackOutline,
  constructOutline,
  locationOutline,
  timeOutline,
  calendarOutline,
  chevronForwardOutline,
  checkmarkCircleOutline
} from 'ionicons/icons';

import {
  AuthService
} from '../../../core/services/auth.service';

import {
  ServiceRequestService
} from '../../../core/services/service-request.service';

import {
  ServiceRequest
} from '../../../core/models/service-request.model';


type JobsView =
  'active'
  | 'history';


@Component({
  selector:
    'app-technician-jobs',

  templateUrl:
    './jobs.page.html',

  styleUrls: [
    './jobs.page.scss'
  ],

  standalone:
    true,

  imports: [
    CommonModule,
    IonContent,
    IonIcon,
    IonSpinner
  ]
})
export class JobsPage {


  private readonly router =
    inject(
      Router
    );


  private readonly authService =
    inject(
      AuthService
    );


  private readonly requestService =
    inject(
      ServiceRequestService
    );


  private readonly cdr =
    inject(
      ChangeDetectorRef
    );


  activeJobs:
    ServiceRequest[] = [];


  historyJobs:
    ServiceRequest[] = [];


  selectedView:
    JobsView =
      'active';


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

      chevronForwardOutline,

      checkmarkCircleOutline
    });
  }


  /*
   * =========================================
   * REFRESCAR
   * =========================================
   */

  async ionViewWillEnter():
    Promise<void> {

    await this.loadJobs();
  }


  /*
   * =========================================
   * CARGAR
   * =========================================
   */

  async loadJobs():
    Promise<void> {


    this.loading =
      true;


    this.errorMessage =
      '';


    this.activeJobs =
      [];


    this.historyJobs =
      [];


    const user =
      await this.authService
        .waitForAuthReady();


    if (
      !user
    ) {

      this.loading =
        false;


      this.errorMessage =
        'No pudimos validar tu sesión.';


      this.cdr
        .detectChanges();


      return;
    }


    try {

      const [
        activeJobs,
        historyJobs
      ] =
        await Promise.all([

          this.requestService
            .getAssignedRequestsForTechnician(
              user.uid
            ),

          this.requestService
            .getHistoryForTechnician(
              user.uid
            )
        ]);


      this.activeJobs =
        activeJobs;


      this.historyJobs =
        historyJobs;


      console.log(
        '[ServiGo] Trabajos activos:',
        this.activeJobs
      );


      console.log(
        '[ServiGo] Historial técnico:',
        this.historyJobs
      );


    } catch (error) {

      console.error(
        '[ServiGo] Error cargando trabajos:',
        error
      );


      this.errorMessage =
        'No pudimos cargar tus trabajos.';


    } finally {

      this.loading =
        false;


      this.cdr
        .detectChanges();
    }
  }


  /*
   * =========================================
   * SELECTOR
   * =========================================
   */

  selectView(
    view: JobsView
  ): void {

    this.selectedView =
      view;
  }


  /*
   * =========================================
   * LISTA VISIBLE
   * =========================================
   */

  get visibleJobs():
    ServiceRequest[] {

    return this.selectedView ===
      'active'
        ? this.activeJobs
        : this.historyJobs;
  }


  /*
   * =========================================
   * ABRIR
   * =========================================
   */

  async openJob(
    job: ServiceRequest
  ): Promise<void> {

    await this.router.navigate(
      [
        '/app/technician/jobs',
        job.id
      ]
    );
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
        '/app/technician/home'
      );
  }


  /*
   * =========================================
   * ESTADO
   * =========================================
   */

  getStatusLabel(
    status: string
  ): string {


    switch (
      status
    ) {

      case 'accepted':
        return 'Asignado';

      case 'in_progress':
        return 'En curso';

      case 'completed':
        return 'Finalizado';

      case 'cancelled':
        return 'Cancelado';

      default:
        return status;
    }
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
}