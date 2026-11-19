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
  constructOutline,
  locationOutline,
  timeOutline,
  chevronForwardOutline,
  documentTextOutline,
  addOutline,
  checkmarkCircleOutline
} from 'ionicons/icons';

import {
  AuthService
} from '../../core/services/auth.service';

import {
  QuoteService
} from '../../core/services/quote.service';

import {
  ServiceRequestService
} from '../../core/services/service-request.service';

import {
  Quote
} from '../../core/models/quote.model';

import {
  ServiceRequest
} from '../../core/models/service-request.model';


export interface ClientServiceItem {

  request:
    ServiceRequest;

  quotes:
    Quote[];
}


type ServiceView =
  'active'
  | 'history';


@Component({
  selector:
    'app-services',

  templateUrl:
    './services.page.html',

  styleUrls: [
    './services.page.scss'
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
export class ServicesPage {


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


  private readonly quoteService =
    inject(
      QuoteService
    );


  private readonly cdr =
    inject(
      ChangeDetectorRef
    );


  loading =
    true;


  errorMessage =
    '';


  services:
    ClientServiceItem[] = [];


  activeServices:
    ClientServiceItem[] = [];


  historyServices:
    ClientServiceItem[] = [];


  selectedView:
    ServiceView =
      'active';


  constructor() {

    addIcons({

      constructOutline,

      locationOutline,

      timeOutline,

      chevronForwardOutline,

      documentTextOutline,

      addOutline,

      checkmarkCircleOutline
    });
  }


  /*
   * =========================================
   * REFRESCAR AL ENTRAR
   * =========================================
   */

  async ionViewWillEnter():
    Promise<void> {

    await this.loadServices();
  }


  /*
   * =========================================
   * CARGA
   * =========================================
   */

  async loadServices():
    Promise<void> {


    this.loading =
      true;


    this.errorMessage =
      '';


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
        requests,
        quotes
      ] =
        await Promise.all([

          this.requestService
            .getRequestsForClient(
              user.uid
            ),

          this.quoteService
            .getQuotesForClient(
              user.uid
            )
        ]);


      this.services =
        requests.map(
          request => ({

            request,

            quotes:
              quotes.filter(
                quote =>
                  quote.requestId ===
                  request.id
              )
          })
        );


      /*
       * =====================================
       * ACTIVOS
       * =====================================
       */

      this.activeServices =
        this.services.filter(
          item =>
            item.request.status !==
              'completed'
            &&
            item.request.status !==
              'cancelled'
        );


      /*
       * =====================================
       * HISTORIAL
       * =====================================
       */

      this.historyServices =
        this.services.filter(
          item =>
            item.request.status ===
              'completed'
            ||
            item.request.status ===
              'cancelled'
        );


      console.log(
        '[ServiGo] Servicios activos cliente:',
        this.activeServices
      );


      console.log(
        '[ServiGo] Historial cliente:',
        this.historyServices
      );


    } catch (error) {

      console.error(
        '[ServiGo] Error cargando servicios:',
        error
      );


      this.errorMessage =
        'No pudimos cargar tus servicios.';


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
    view: ServiceView
  ): void {

    this.selectedView =
      view;
  }


  /*
   * =========================================
   * NUEVA SOLICITUD
   * =========================================
   */

  async newRequest():
    Promise<void> {

    await this.router
      .navigateByUrl(
        '/app/services/new'
      );
  }


  /*
   * =========================================
   * ABRIR SERVICIO
   * =========================================
   */

  async openService(
    item:
      ClientServiceItem
  ): Promise<void> {

    await this.router.navigate(
      [
        '/app/services',
        item.request.id
      ]
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

      case 'published':
        return 'Publicado';

      case 'matched':
        return 'Con técnicos';

      case 'quoted':
        return 'Con presupuestos';

      case 'accepted':
        return 'Aceptado';

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
   * LISTA ACTUAL
   * =========================================
   */

  get visibleServices():
    ClientServiceItem[] {

    return this.selectedView ===
      'active'
        ? this.activeServices
        : this.historyServices;
  }
}