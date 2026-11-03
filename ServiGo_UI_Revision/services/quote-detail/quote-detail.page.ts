import {
  CommonModule
} from '@angular/common';

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
  personOutline,
  calendarOutline,
  checkmarkCircleOutline,
  closeCircleOutline
} from 'ionicons/icons';

import {
  QuoteService
} from '../../../core/services/quote.service';

import {
  AuthService
} from '../../../core/services/auth.service';

import {
  Quote
} from '../../../core/models/quote.model';


@Component({
  selector:
    'app-quote-detail',

  templateUrl:
    './quote-detail.page.html',

  styleUrls: [
    './quote-detail.page.scss'
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
export class QuoteDetailPage {


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


  private readonly quoteService =
    inject(
      QuoteService
    );


  private readonly cdr =
    inject(
      ChangeDetectorRef
    );


  quote:
    Quote | null =
      null;


  loading =
    true;


  loadingAction =
    false;


  errorMessage =
    '';


  actionResult:
    'accepted'
    | 'rejected'
    | null =
      null;


  constructor() {

    addIcons({

      arrowBackOutline,

      personOutline,

      calendarOutline,

      checkmarkCircleOutline,

      closeCircleOutline
    });
  }


  /*
   * =========================================
   * RECARGAR CADA VEZ QUE ENTRA
   * =========================================
   */

  async ionViewWillEnter():
    Promise<void> {

    await this.loadQuote();
  }


  /*
   * =========================================
   * CARGAR PRESUPUESTO
   * =========================================
   *
   * No dependemos de history.state.
   *
   * requestId y quoteId se obtienen siempre
   * desde la URL.
   *
   * Esto permite:
   *
   * - navegación normal
   * - refresh F5
   * - deep links
   * - futuras notificaciones Push
   */

  async loadQuote():
    Promise<void> {


    this.loading =
      true;


    this.errorMessage =
      '';


    this.actionResult =
      null;


    this.quote =
      null;


    this.cdr
      .detectChanges();


    const requestId =
      this.route.snapshot
        .paramMap
        .get(
          'requestId'
        );


    const quoteId =
      this.route.snapshot
        .paramMap
        .get(
          'quoteId'
        );


    console.log(
      '[ServiGo] Cargando presupuesto:',
      {
        requestId,
        quoteId
      }
    );


    const user =
      await this.authService
        .waitForAuthReady();


    if (
      !requestId
      ||
      !quoteId
      ||
      !user
    ) {

      this.loading =
        false;


      this.errorMessage =
        'No pudimos cargar el presupuesto.';


      this.cdr
        .detectChanges();


      return;
    }


    try {

      const quotes =
        await this.quoteService
          .getQuotesForRequest(
            requestId,
            user.uid
          );


      console.log(
        '[ServiGo] Presupuestos recuperados:',
        quotes
      );


      this.quote =
        quotes.find(
          item =>
            item.id ===
            quoteId
        )
        ?? null;


      if (
        !this.quote
      ) {

        this.errorMessage =
          'No encontramos este presupuesto.';


        console.warn(
          '[ServiGo] Quote no encontrada:',
          {
            requestId,
            quoteId,
            quotes
          }
        );
      }


    } catch (error) {

      console.error(
        '[ServiGo] Error cargando presupuesto:',
        error
      );


      this.errorMessage =
        'No pudimos cargar el presupuesto.';


    } finally {

      this.loading =
        false;


      this.cdr
        .detectChanges();
    }
  }


  /*
   * =========================================
   * ACEPTAR
   * =========================================
   */

  async accept():
    Promise<void> {


    if (
      !this.quote
      ||
      this.loadingAction
    ) {

      return;
    }


    const confirmed =
      window.confirm(
        '¿Confirmas que quieres contratar a este técnico por este presupuesto?'
      );


    if (
      !confirmed
    ) {

      return;
    }


    const user =
      await this.authService
        .waitForAuthReady();


    if (
      !user
    ) {

      this.errorMessage =
        'No pudimos validar tu sesión.';


      return;
    }


    this.loadingAction =
      true;


    this.errorMessage =
      '';


    this.cdr
      .detectChanges();


    try {

      const result =
        await this.quoteService
          .acceptQuote(
            user.uid,
            this.quote
          );


      console.log(
        '[ServiGo] Presupuesto aceptado:',
        result
      );


      this.quote = {

        ...this.quote,

        status:
          'accepted'
      };


      this.actionResult =
        'accepted';


    } catch (error: any) {

      console.error(
        '[ServiGo] Error aceptando presupuesto:',
        error
      );


      /*
       * Callable Functions devuelve normalmente
       * códigos con prefijo "functions/".
       */

      if (
        error?.code ===
          'functions/permission-denied'
        ||
        error?.code ===
          'permission-denied'
      ) {

        this.errorMessage =
          'No tienes permisos para aceptar este presupuesto.';


      } else if (
        error?.code ===
          'functions/failed-precondition'
        ||
        error?.message ===
          'quote-not-available'
      ) {

        this.errorMessage =
          'Este presupuesto ya no está disponible.';


      } else if (
        error?.code ===
          'functions/not-found'
      ) {

        this.errorMessage =
          'No encontramos este presupuesto.';


      } else {

        this.errorMessage =
          'No pudimos aceptar el presupuesto.';
      }


    } finally {

      this.loadingAction =
        false;


      this.cdr
        .detectChanges();
    }
  }


  /*
   * =========================================
   * RECHAZAR
   * =========================================
   */

  async reject():
    Promise<void> {


    if (
      !this.quote
      ||
      this.loadingAction
    ) {

      return;
    }


    const confirmed =
      window.confirm(
        '¿Quieres rechazar este presupuesto?'
      );


    if (
      !confirmed
    ) {

      return;
    }


    const user =
      await this.authService
        .waitForAuthReady();


    if (
      !user
    ) {

      this.errorMessage =
        'No pudimos validar tu sesión.';


      return;
    }


    this.loadingAction =
      true;


    this.errorMessage =
      '';


    this.cdr
      .detectChanges();


    try {

      await this.quoteService
        .rejectQuote(
          user.uid,
          this.quote
        );


      this.quote = {

        ...this.quote,

        status:
          'rejected'
      };


      this.actionResult =
        'rejected';


    } catch (error: any) {

      console.error(
        '[ServiGo] Error rechazando presupuesto:',
        error
      );


      if (
        error?.code ===
          'functions/permission-denied'
        ||
        error?.code ===
          'permission-denied'
      ) {

        this.errorMessage =
          'No tienes permisos para rechazar este presupuesto.';


      } else {

        this.errorMessage =
          'No pudimos rechazar el presupuesto.';
      }


    } finally {

      this.loadingAction =
        false;


      this.cdr
        .detectChanges();
    }
  }


  /*
   * =========================================
   * NAVEGACIÓN
   * =========================================
   */

  async back():
    Promise<void> {


    const requestId =
      this.route.snapshot
        .paramMap
        .get(
          'requestId'
        );


    if (
      requestId
    ) {

      await this.router
        .navigateByUrl(
          `/app/services/${requestId}`
        );


      return;
    }


    await this.router
      .navigateByUrl(
        '/app/services'
      );
  }


  async goToService():
    Promise<void> {


    const requestId =
      this.route.snapshot
        .paramMap
        .get(
          'requestId'
        );


    if (
      requestId
    ) {

      await this.router
        .navigateByUrl(
          `/app/services/${requestId}`
        );


      return;
    }


    await this.router
      .navigateByUrl(
        '/app/services'
      );
  }


  /*
   * =========================================
   * FECHA
   * =========================================
   */

  formatDate(
    date:
      Date | null
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