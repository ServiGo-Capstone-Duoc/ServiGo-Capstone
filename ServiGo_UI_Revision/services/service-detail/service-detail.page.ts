import {
  CommonModule
} from '@angular/common';

import {
  ChangeDetectorRef,
  Component,
  OnDestroy,
  inject
} from '@angular/core';

import {
  FormsModule
} from '@angular/forms';

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
  chevronForwardOutline,
  star,
  starOutline,
  checkmarkCircleOutline,
  carOutline,
  navigateOutline,
  closeCircleOutline
} from 'ionicons/icons';

import {
  AuthService
} from '../../../core/services/auth.service';

import {
  QuoteService
} from '../../../core/services/quote.service';

import {
  PaymentService
} from '../../../core/services/payment.service';

import {
  ReviewService,
  ServiceReview
} from '../../../core/services/review.service';

import {
  ServiceRequestService
} from '../../../core/services/service-request.service';

import {
  doc,
  onSnapshot,
  Timestamp,
  Unsubscribe
} from 'firebase/firestore';

import {
  firestore
} from '../../../core/firebase/firebase';

import * as L from 'leaflet';

import {
  Quote
} from '../../../core/models/quote.model';

import {
  ServiceRequest
} from '../../../core/models/service-request.model';


@Component({
  selector:
    'app-service-detail',

  templateUrl:
    './service-detail.page.html',

  styleUrls: [
    './service-detail.page.scss'
  ],

  standalone:
    true,

  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonIcon,
    IonSpinner
  ]
})
export class ServiceDetailPage implements OnDestroy {


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


  private readonly quoteService =
    inject(
      QuoteService
    );

  private readonly paymentService =
    inject(
      PaymentService
    ); 

  private readonly reviewService =
    inject(
      ReviewService
    );


  private readonly cdr =
    inject(
      ChangeDetectorRef
    );


  request:
    ServiceRequest | null =
      null;


  quotes:
    Quote[] =
      [];

/*
 * =========================================
 * PAGO WEBPAY PLUS
 * =========================================
 */

processingPayment =
  false;


paymentError =
  '';

  review:
    ServiceReview | null =
      null;


  readonly ratingValues =
    [
      1,
      2,
      3,
      4,
      5
    ];


  selectedRating =
    0;


  reviewComment =
    '';


  submittingReview =
    false;


  reviewError =
    '';


  reviewSuccess =
    '';


  loading =
    true;


  errorMessage =
    '';


  /* CANCELACION */
  showCancellationForm = false;
  cancellationReason = '';
  cancellingService = false;
  cancellationError = '';


  /*
   * =========================================
   * SEGUIMIENTO EN TIEMPO REAL
   * =========================================
   */

  trackingActive =
    false;


  trackingWaiting =
    false;


  technicianLatitude:
    number | null =
      null;


  technicianLongitude:
    number | null =
      null;


  locationUpdatedAt:
    Date | null =
      null;


  distanceKm:
    number | null =
      null;


  estimatedMinutes:
    number | null =
      null;


  private requestUnsubscribe:
    Unsubscribe | null =
      null;


  private locationUnsubscribe:
    Unsubscribe | null =
      null;


  private trackingMap:
    L.Map | null =
      null;


  private technicianMarker:
    L.Marker | null =
      null;


  private destinationMarker:
    L.Marker | null =
      null;


  private trackingLine:
    L.Polyline | null =
      null;


  constructor() {

    addIcons({

      arrowBackOutline,

      constructOutline,

      locationOutline,

      timeOutline,

      calendarOutline,

      documentTextOutline,

      personOutline,

      chevronForwardOutline,

      star,

      starOutline,

      checkmarkCircleOutline,

      carOutline,

      navigateOutline,

      closeCircleOutline
    });
  }


  /*
   * =========================================
   * REFRESCAR CADA VEZ QUE ENTRA
   * =========================================
   */

  async ionViewWillEnter():
    Promise<void> {

    await this.loadService();


    if (
      this.request
    ) {

      this.startRequestListener(
        this.request.id
      );
    }
  }


  ionViewWillLeave():
    void {

    this.stopRealtimeListeners();
  }


  ngOnDestroy():
    void {

    this.stopRealtimeListeners();
  }


  /*
   * =========================================
   * CARGAR SERVICIO
   * =========================================
   */

  async loadService():
    Promise<void> {


    this.loading =
      true;


    this.errorMessage =
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
        'No pudimos cargar el servicio.';


      this.cdr
        .detectChanges();


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


      /*
       * =====================================
       * COTIZACIONES
       * =====================================
       */

      this.quotes =
        await this.quoteService
          .getQuotesForRequest(
            requestId,
            user.uid
          );


      /*
       * =====================================
       * EVALUACIÓN
       * =====================================
       */

      if (
        this.request.status ===
        'completed'
      ) {

        this.review =
          await this.reviewService
            .getReviewForRequest(
              requestId
            );

      } else {

        this.review =
          null;
      }


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


      this.cdr
        .detectChanges();
    }
  }


  /*
   * =========================================
   * LISTENER DE SOLICITUD
   * =========================================
   */

  private startRequestListener(
    requestId: string
  ): void {


    if (
      this.requestUnsubscribe
    ) {

      this.requestUnsubscribe();
    }


    const requestRef =
      doc(
        firestore,
        'serviceRequests',
        requestId
      );


    this.requestUnsubscribe =
      onSnapshot(
        requestRef,

        snapshot => {

          if (
            !snapshot.exists()
            ||
            !this.request
          ) {

            return;
          }


          const data =
            snapshot.data();


          const previousStatus =
            this.request.status;


          this.request = {
            ...this.request,

            status:
              data['status']
              ?? this.request.status,

            assignedTechnicianId:
              data['assignedTechnicianId']
              ?? null,

            acceptedQuoteId:
              data['acceptedQuoteId']
              ?? null,

            latitude:
              typeof data['latitude'] === 'number'
                ? data['latitude']
                : this.request.latitude,

            longitude:
              typeof data['longitude'] === 'number'
                ? data['longitude']
                : this.request.longitude,

            paymentStatus:
              data['paymentStatus'] === 'paid'
                ? 'paid'
                : 'pending',

            paymentId:
              typeof data['paymentId'] === 'string'
                ? data['paymentId']
                : null
          };


          if (
            this.request.status ===
              'en_route'
          ) {

            this.startLocationListener();


          } else {

            this.stopLocationListener();
          }


          if (
            previousStatus !== 'completed'
            &&
            this.request.status === 'completed'
          ) {

            void this.loadReviewIfNeeded();
          }


          this.cdr.detectChanges();
        },

        error => {

          console.error(
            '[ServiGo Tracking] Error escuchando solicitud:',
            error
          );
        }
      );
  }


  /*
   * =========================================
   * LISTENER UBICACIÓN TÉCNICO
   * =========================================
   */

  private startLocationListener():
    void {


    if (
      !this.request
      ||
      this.request.status !== 'en_route'
      ||
      !this.request.assignedTechnicianId
    ) {

      return;
    }


    if (
      this.locationUnsubscribe
    ) {

      return;
    }


    this.trackingWaiting =
      true;


    const locationRef =
      doc(
        firestore,
        'technicianLocations',
        this.request.assignedTechnicianId
      );


    this.locationUnsubscribe =
      onSnapshot(
        locationRef,

        snapshot => {

          if (
            !snapshot.exists()
          ) {

            this.trackingActive =
              false;

            this.trackingWaiting =
              true;

            this.clearTechnicianPosition();

            this.cdr.detectChanges();

            return;
          }


          const data =
            snapshot.data();


          const latitude =
            data['latitude'];


          const longitude =
            data['longitude'];


          if (
            typeof latitude !== 'number'
            ||
            typeof longitude !== 'number'
          ) {

            return;
          }


          this.technicianLatitude =
            latitude;


          this.technicianLongitude =
            longitude;


          this.locationUpdatedAt =
            data['updatedAt'] instanceof Timestamp
              ? data['updatedAt'].toDate()
              : new Date();


          this.trackingActive =
            true;


          this.trackingWaiting =
            false;


          this.updateDistanceAndEta();


          this.cdr.detectChanges();


          setTimeout(
            () => {
              this.renderTrackingMap();
            },
            0
          );
        },

        error => {

          console.error(
            '[ServiGo Tracking] Error escuchando ubicación:',
            error
          );


          this.trackingActive =
            false;


          this.trackingWaiting =
            false;


          this.cdr.detectChanges();
        }
      );
  }


  /*
   * =========================================
   * MAPA LEAFLET
   * =========================================
   */

  private renderTrackingMap():
    void {


    if (
      this.technicianLatitude === null
      ||
      this.technicianLongitude === null
      ||
      !this.request
      ||
      this.request.latitude === null
      ||
      this.request.longitude === null
    ) {

      return;
    }


    const mapElement =
      document.getElementById(
        'servigo-tracking-map'
      );


    if (
      !mapElement
    ) {

      return;
    }


    const technicianPoint:
      L.LatLngExpression =
        [
          this.technicianLatitude,
          this.technicianLongitude
        ];


    const destinationPoint:
      L.LatLngExpression =
        [
          this.request.latitude,
          this.request.longitude
        ];


    if (
      !this.trackingMap
    ) {

      this.trackingMap =
        L.map(
          mapElement,
          {
            zoomControl:
              true,

            attributionControl:
              true
          }
        );


      L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
          maxZoom:
            19,

          attribution:
            '&copy; OpenStreetMap contributors'
        }
      ).addTo(
        this.trackingMap
      );


      const technicianIcon =
        L.divIcon({
          className:
            '',

          html:
            '<div style="width:42px;height:42px;border-radius:50%;background:#0b73e0;color:#fff;display:grid;place-items:center;font-size:21px;border:3px solid #fff;box-shadow:0 5px 18px rgba(15,23,42,.25)">🚗</div>',

          iconSize:
            [42, 42],

          iconAnchor:
            [21, 21]
        });


      const destinationIcon =
        L.divIcon({
          className:
            '',

          html:
            '<div style="width:42px;height:42px;border-radius:50%;background:#fff;color:#0b73e0;display:grid;place-items:center;font-size:21px;border:3px solid #0b73e0;box-shadow:0 5px 18px rgba(15,23,42,.20)">🏠</div>',

          iconSize:
            [42, 42],

          iconAnchor:
            [21, 21]
        });


      this.technicianMarker =
        L.marker(
          technicianPoint,
          {
            icon:
              technicianIcon
          }
        )
          .addTo(
            this.trackingMap
          )
          .bindTooltip(
            'Técnico',
            {
              direction:
                'top'
            }
          );


      this.destinationMarker =
        L.marker(
          destinationPoint,
          {
            icon:
              destinationIcon
          }
        )
          .addTo(
            this.trackingMap
          )
          .bindTooltip(
            'Tu domicilio',
            {
              direction:
                'top'
            }
          );


      this.trackingLine =
        L.polyline(
          [
            technicianPoint,
            destinationPoint
          ],
          {
            weight:
              4,

            opacity:
              0.7,

            dashArray:
              '8 8'
          }
        ).addTo(
          this.trackingMap
        );


    } else {

      this.technicianMarker
        ?.setLatLng(
          technicianPoint
        );


      this.destinationMarker
        ?.setLatLng(
          destinationPoint
        );


      this.trackingLine
        ?.setLatLngs(
          [
            technicianPoint,
            destinationPoint
          ]
        );
    }


    const bounds =
      L.latLngBounds(
        [
          technicianPoint,
          destinationPoint
        ]
      );


    this.trackingMap.fitBounds(
      bounds,
      {
        padding:
          [40, 40],

        maxZoom:
          16
      }
    );


    setTimeout(
      () => {
        this.trackingMap
          ?.invalidateSize();
      },
      100
    );
  }


  /*
   * =========================================
   * DISTANCIA Y ETA APROXIMADA
   * =========================================
   */

  private updateDistanceAndEta():
    void {


    if (
      this.technicianLatitude === null
      ||
      this.technicianLongitude === null
      ||
      !this.request
      ||
      this.request.latitude === null
      ||
      this.request.longitude === null
    ) {

      this.distanceKm =
        null;

      this.estimatedMinutes =
        null;

      return;
    }


    const distance =
      this.calculateDistanceKm(
        this.technicianLatitude,
        this.technicianLongitude,
        this.request.latitude,
        this.request.longitude
      );


    this.distanceKm =
      distance;


    /*
     * MVP: ETA aproximada usando 30 km/h.
     * No representa tráfico ni ruta vial real.
     */

    this.estimatedMinutes =
      Math.max(
        1,
        Math.round(
          distance / 30 * 60
        )
      );
  }


  private calculateDistanceKm(
    latitudeA: number,
    longitudeA: number,
    latitudeB: number,
    longitudeB: number
  ): number {


    const earthRadiusKm =
      6371;


    const toRadians =
      (degrees: number) =>
        degrees * Math.PI / 180;


    const deltaLatitude =
      toRadians(
        latitudeB - latitudeA
      );


    const deltaLongitude =
      toRadians(
        longitudeB - longitudeA
      );


    const a =
      Math.sin(
        deltaLatitude / 2
      ) ** 2
      +
      Math.cos(
        toRadians(latitudeA)
      )
      *
      Math.cos(
        toRadians(latitudeB)
      )
      *
      Math.sin(
        deltaLongitude / 2
      ) ** 2;


    const c =
      2 * Math.atan2(
        Math.sqrt(a),
        Math.sqrt(1 - a)
      );


    return Math.round(
      earthRadiusKm * c * 10
    ) / 10;
  }


  getLocationUpdatedLabel():
    string {


    if (
      !this.locationUpdatedAt
    ) {

      return 'Esperando ubicación';
    }


    const seconds =
      Math.max(
        0,
        Math.floor(
          (
            Date.now()
            - this.locationUpdatedAt.getTime()
          ) / 1000
        )
      );


    if (
      seconds < 15
    ) {

      return 'Actualizado ahora';
    }


    if (
      seconds < 60
    ) {

      return `Actualizado hace ${seconds} s`;
    }


    const minutes =
      Math.floor(
        seconds / 60
      );


    return `Actualizado hace ${minutes} min`;
  }


  private async loadReviewIfNeeded():
    Promise<void> {


    if (
      !this.request
      ||
      this.review
    ) {

      return;
    }


    try {

      this.review =
        await this.reviewService
          .getReviewForRequest(
            this.request.id
          );


      this.cdr.detectChanges();


    } catch (error) {

      console.warn(
        '[ServiGo] No fue posible refrescar evaluación:',
        error
      );
    }
  }


  private stopLocationListener():
    void {


    if (
      this.locationUnsubscribe
    ) {

      this.locationUnsubscribe();

      this.locationUnsubscribe =
        null;
    }


    this.trackingActive =
      false;


    this.trackingWaiting =
      false;


    this.clearTechnicianPosition();


    this.destroyTrackingMap();
  }


  private clearTechnicianPosition():
    void {

    this.technicianLatitude =
      null;

    this.technicianLongitude =
      null;

    this.locationUpdatedAt =
      null;

    this.distanceKm =
      null;

    this.estimatedMinutes =
      null;
  }


  private destroyTrackingMap():
    void {


    if (
      this.trackingMap
    ) {

      this.trackingMap.remove();
    }


    this.trackingMap =
      null;

    this.technicianMarker =
      null;

    this.destinationMarker =
      null;

    this.trackingLine =
      null;
  }


  private stopRealtimeListeners():
    void {


    if (
      this.requestUnsubscribe
    ) {

      this.requestUnsubscribe();

      this.requestUnsubscribe =
        null;
    }


    this.stopLocationListener();
  }


  /* CANCELACION DEL CLIENTE */
  get canCancelService(): boolean {
    if (!this.request) { return false; }
    return ['published','matched','quoted','accepted','en_route','arrived'].includes(this.request.status);
  }

  openCancellationForm(): void {
    if (!this.canCancelService || this.cancellingService) { return; }
    this.cancellationError = '';
    this.showCancellationForm = true;
    this.cdr.detectChanges();
  }

  closeCancellationForm(): void {
    if (this.cancellingService) { return; }
    this.showCancellationForm = false;
    this.cancellationReason = '';
    this.cancellationError = '';
    this.cdr.detectChanges();
  }

  async confirmCancellation(): Promise<void> {
    if (!this.request || !this.canCancelService || this.cancellingService) { return; }
    const reason = this.cancellationReason.trim();
    if (reason.length < 5) {
      this.cancellationError = 'Indica el motivo de la cancelación con al menos 5 caracteres.';
      return;
    }
    this.cancellingService = true;
    this.cancellationError = '';
    this.cdr.detectChanges();
    try {
      await this.requestService.cancelService(this.request.id, reason);
      this.request = { ...this.request, status: 'cancelled' };
      this.showCancellationForm = false;
      this.cancellationReason = '';
      this.stopLocationListener();
      console.log('[ServiGo] Solicitud cancelada por el cliente.');
    } catch (error: any) {
      console.error('[ServiGo] Error cancelando solicitud:', error);
      if (error?.code === 'functions/failed-precondition') {
        this.cancellationError = 'Esta solicitud ya no puede ser cancelada.';
      } else if (error?.code === 'functions/permission-denied') {
        this.cancellationError = 'No tienes permisos para cancelar esta solicitud.';
      } else if (error?.code === 'functions/invalid-argument') {
        this.cancellationError = 'Revisa el motivo de cancelación.';
      } else {
        this.cancellationError = 'No pudimos cancelar la solicitud. Intenta nuevamente.';
      }
    } finally {
      this.cancellingService = false;
      this.cdr.detectChanges();
    }
  }


  /*
   * =========================================
   * SELECCIONAR ESTRELLAS
   * =========================================
   */

  selectRating(
    rating: number
  ): void {


    if (
      this.review
      ||
      this.submittingReview
    ) {

      return;
    }


    this.selectedRating =
      rating;


    this.reviewError =
      '';
  }

/*
 * =========================================
 * PRESUPUESTO ACEPTADO
 * =========================================
 */

get acceptedQuote():
  Quote | null {


  if (
    !this.request
    ||
    !this.request.acceptedQuoteId
  ) {

    return null;
  }


  return (
    this.quotes.find(
      quote =>
        quote.id ===
        this.request
          ?.acceptedQuoteId
    )
    ?? null
  );
}
/*
 * =========================================
 * PAGAR SERVICIO
 * =========================================
 */

/*
 * =========================================
 * PAGAR SERVICIO - WEBPAY PLUS
 * =========================================
 *
 * Flujo:
 *
 * Servicio completed
 *       ↓
 * createWebpayTransaction
 *       ↓
 * backend obtiene monto real
 *       ↓
 * POST token_ws a Transbank
 *       ↓
 * Webpay
 *
 * IMPORTANTE:
 *
 * Esta página NO marca el servicio como
 * pagado.
 *
 * paymentStatus = paid solamente puede
 * ocurrir después del COMMIT realizado
 * por backend.
 */

async payService():
  Promise<void> {


  if (
    !this.request
    ||
    this.processingPayment
  ) {

    return;
  }


  /*
   * =====================================
   * SERVICIO FINALIZADO
   * =====================================
   */

  if (
    this.request.status !==
    'completed'
  ) {

    this.paymentError =
      'El servicio todavía no puede ser pagado.';


    return;
  }


  /*
   * =====================================
   * YA PAGADO
   * =====================================
   */

  if (
    this.request.paymentStatus ===
    'paid'
  ) {

    return;
  }


  /*
   * =====================================
   * PRESUPUESTO ACEPTADO
   * =====================================
   */

  if (
    !this.acceptedQuote
  ) {

    this.paymentError =
      'No encontramos el presupuesto aceptado para este servicio.';


    return;
  }


  /*
   * =====================================
   * CONFIRMACIÓN USUARIO
   * =====================================
   */

  const confirmed =
    window.confirm(
      `Serás redirigido a Webpay para pagar ${this.formatCurrency(
        this.acceptedQuote.totalAmount
      )}. ¿Deseas continuar?`
    );


  if (
    !confirmed
  ) {

    return;
  }


  this.processingPayment =
    true;


  this.paymentError =
    '';


  this.cdr
    .detectChanges();


  try {


    /*
     * =====================================
     * WEBPAY
     * =====================================
     *
     * startWebpayPayment:
     *
     * 1. llama createWebpayTransaction
     * 2. recibe URL + token_ws
     * 3. construye POST
     * 4. redirige a Transbank
     */

    await this.paymentService
      .startWebpayPayment(
        this.request.id
      );


    /*
     * NO hacemos:
     *
     * this.request.paymentStatus = 'paid'
     *
     * porque CREATE no significa que
     * exista un pago aprobado.
     */


  } catch (error: any) {


    console.error(
      '[ServiGo Webpay] Error iniciando pago:',
      error
    );


    if (
      error?.code ===
      'functions/already-exists'
    ) {

      this.paymentError =
        'Este servicio ya fue pagado.';


    } else if (
      error?.code ===
      'functions/failed-precondition'
    ) {

      this.paymentError =
        'El servicio todavía no cumple las condiciones para ser pagado.';


    } else if (
      error?.code ===
      'functions/permission-denied'
    ) {

      this.paymentError =
        'No tienes permisos para pagar este servicio.';


    } else if (
      error?.code ===
      'functions/unauthenticated'
    ) {

      this.paymentError =
        'Tu sesión expiró. Inicia sesión nuevamente.';


    } else {

      this.paymentError =
        'No pudimos iniciar el pago con Webpay.';
    }


    this.processingPayment =
      false;


    this.cdr
      .detectChanges();
  }
}
  /*
   * =========================================
   * ENVIAR REVIEW
   * =========================================
   */

  async submitReview():
    Promise<void> {


    if (
      !this.request
      ||
      this.submittingReview
      ||
      this.review
    ) {

      return;
    }


    this.reviewError =
      '';


    this.reviewSuccess =
      '';


    if (
      this.selectedRating < 1
      ||
      this.selectedRating > 5
    ) {

      this.reviewError =
        'Selecciona una evaluación entre 1 y 5 estrellas.';


      return;
    }


    const comment =
      this.reviewComment
        .trim();


    if (
      comment.length < 3
    ) {

      this.reviewError =
        'Escribe un comentario sobre tu experiencia.';


      return;
    }


    this.submittingReview =
      true;


    this.cdr
      .detectChanges();


    try {

      const result =
        await this.reviewService
          .submitReview(
            this.request.id,
            this.selectedRating,
            comment
          );


      this.review = {

        id:
          result.reviewId,

        requestId:
          this.request.id,

        clientId:
          this.request.clientId,

        technicianId:
          result.technicianId,

        rating:
          result.rating,

        comment:
          result.comment
      };


      this.reviewSuccess =
        'Gracias. Tu evaluación fue registrada correctamente.';


      console.log(
        '[ServiGo] Evaluación registrada:',
        result
      );


    } catch (error: any) {

      console.error(
        '[ServiGo] Error registrando evaluación:',
        error
      );


      if (
        error?.code ===
        'functions/already-exists'
      ) {

        this.reviewError =
          'Este servicio ya fue evaluado.';


      } else if (
        error?.code ===
        'functions/failed-precondition'
      ) {

        this.reviewError =
          'Este servicio todavía no puede ser evaluado.';


      } else if (
        error?.code ===
        'functions/permission-denied'
      ) {

        this.reviewError =
          'No tienes permisos para evaluar este servicio.';


      } else {

        this.reviewError =
          'No pudimos registrar tu evaluación.';
      }


    } finally {

      this.submittingReview =
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

    await this.router
      .navigateByUrl(
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
      ]
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
 * FORMATO MONEDA CLP
 * =========================================
 *
 * Formato estándar chileno:
 *
 * 105000
 *      ↓
 * $105.000
 */

formatCurrency(
  amount:
    number
    | null
    | undefined
): string {


  const safeAmount =
    typeof amount ===
      'number'
      &&
      Number.isFinite(
        amount
      )
      ? amount
      : 0;


  return new Intl.NumberFormat(
    'es-CL',
    {

      style:
        'currency',

      currency:
        'CLP',

      minimumFractionDigits:
        0,

      maximumFractionDigits:
        0
    }
  ).format(
    safeAmount
  );
}
}
