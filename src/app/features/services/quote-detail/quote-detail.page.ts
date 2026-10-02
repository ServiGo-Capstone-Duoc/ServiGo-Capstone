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
  selector: 'app-quote-detail',

  templateUrl:
    './quote-detail.page.html',

  styleUrls: [
    './quote-detail.page.scss'
  ],

  standalone: true,

  imports: [
    CommonModule,

    IonButton,
    IonContent,
    IonIcon,
    IonSpinner
  ]
})
export class QuoteDetailPage
  implements OnInit {


  private readonly router =
    inject(Router);

  private readonly route =
    inject(ActivatedRoute);

  private readonly authService =
    inject(AuthService);

  private readonly quoteService =
    inject(QuoteService);

  private readonly cdr =
    inject(ChangeDetectorRef);


  quote:
    Quote | null = null;


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


  async ngOnInit():
    Promise<void> {

    const stateQuote =
      history.state?.[
        'quote'
      ] as
        Quote
        | undefined;


    if (
      stateQuote
    ) {

      this.quote =
        stateQuote;

      return;
    }


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

      this.errorMessage =
        'No pudimos cargar el presupuesto.';

      return;
    }


    try {

      const quotes =
        await this.quoteService
          .getQuotesForRequest(
            requestId,
            user.uid
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
      }


    } catch (error) {

      console.error(
        '[ServiGo] Error cargando presupuesto:',
        error
      );


      this.errorMessage =
        'No pudimos cargar el presupuesto.';
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


    /*
     * Confirmación simple por ahora.
     *
     * Más adelante podemos reemplazarla
     * por IonAlert.
     */
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


    if (!user) {

      this.errorMessage =
        'No pudimos validar tu sesión.';

      return;
    }


    this.loadingAction =
      true;

    this.errorMessage =
      '';

    this.cdr.detectChanges();


    try {

      await this.quoteService
        .acceptQuote(
          user.uid,
          this.quote
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


      if (
        error?.code ===
        'permission-denied'
      ) {

        this.errorMessage =
          'Firestore rechazó la operación por permisos.';

      } else if (
        error?.message ===
        'quote-not-available'
      ) {

        this.errorMessage =
          'Este presupuesto ya no está disponible.';

      } else {

        this.errorMessage =
          'No pudimos aceptar el presupuesto.';
      }


    } finally {

      this.loadingAction =
        false;

      this.cdr.detectChanges();
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


    if (!user) {

      this.errorMessage =
        'No pudimos validar tu sesión.';

      return;
    }


    this.loadingAction =
      true;

    this.errorMessage =
      '';

    this.cdr.detectChanges();


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
        'permission-denied'
      ) {

        this.errorMessage =
          'Firestore rechazó la operación por permisos.';

      } else {

        this.errorMessage =
          'No pudimos rechazar el presupuesto.';
      }


    } finally {

      this.loadingAction =
        false;

      this.cdr.detectChanges();
    }
  }


  /*
   * =========================================
   * NAVEGACIÓN
   * =========================================
   */

  async back():
    Promise<void> {

    if (
      this.quote
    ) {

      await this.router.navigateByUrl(
        `/app/services/${this.quote.requestId}`
      );

      return;
    }


    await this.router.navigateByUrl(
      '/app/services'
    );
  }


  async goToService():
    Promise<void> {

    if (
      !this.quote
    ) {

      await this.router.navigateByUrl(
        '/app/services'
      );

      return;
    }


    await this.router.navigateByUrl(
      `/app/services/${this.quote.requestId}`
    );
  }


  formatDate(
    date: Date | null
  ): string {

    if (!date) {
      return 'Flexible';
    }


    return date.toLocaleDateString(
      'es-CL'
    );
  }
}