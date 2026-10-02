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
  documentTextOutline,
  personOutline,
  chevronForwardOutline
} from 'ionicons/icons';

import {
  AuthService
} from '../../../core/services/auth.service';

import {
  QuoteService
} from '../../../core/services/quote.service';

import {
  ServiceRequestService
} from '../../../core/services/service-request.service';

import {
  Quote
} from '../../../core/models/quote.model';

import {
  ServiceRequest
} from '../../../core/models/service-request.model';


@Component({
  selector: 'app-service-detail',

  templateUrl:
    './service-detail.page.html',

  styleUrls: [
    './service-detail.page.scss'
  ],

  standalone: true,

  imports: [
    CommonModule,
    IonContent,
    IonIcon,
    IonSpinner
  ]
})
export class ServiceDetailPage
  implements OnInit {


  private readonly router =
    inject(Router);

  private readonly route =
    inject(ActivatedRoute);

  private readonly authService =
    inject(AuthService);

  private readonly requestService =
    inject(ServiceRequestService);

  private readonly quoteService =
    inject(QuoteService);

  private readonly cdr =
    inject(ChangeDetectorRef);


  request:
    ServiceRequest | null = null;


  quotes:
    Quote[] = [];


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
      documentTextOutline,
      personOutline,
      chevronForwardOutline
    });
  }


  async ngOnInit():
    Promise<void> {

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
        'No pudimos cargar el servicio.';

      return;
    }


    try {

      const requests =
        await this.requestService
          .getRequestsForClient(
            user.uid
          );


      this.request =
        requests.find(
          item =>
            item.id ===
            requestId
        )
        ?? null;


      if (
        !this.request
      ) {

        this.errorMessage =
          'No encontramos esta solicitud.';

        return;
      }


      this.quotes =
        await this.quoteService
          .getQuotesForRequest(
            requestId,
            user.uid
          );


    } catch (error) {

      console.error(
        '[ServiGo] Error cargando servicio:',
        error
      );


      this.errorMessage =
        'No pudimos cargar el servicio.';


    } finally {

      this.loading =
        false;

      this.cdr.detectChanges();
    }
  }


  async back():
    Promise<void> {

    await this.router.navigateByUrl(
      '/app/services'
    );
  }


  async openQuote(
    quote: Quote
  ): Promise<void> {

    await this.router.navigate(
      [
        '/app/services',
        quote.requestId,
        'quote',
        quote.id
      ],
      {
        state: {
          quote,
          request:
            this.request
        }
      }
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