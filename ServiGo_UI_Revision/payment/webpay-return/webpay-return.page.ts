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
  checkmarkCircleOutline,
  closeCircleOutline,
  cardOutline,
  arrowForwardOutline
} from 'ionicons/icons';

import {
  PaymentService,
  CommitWebpayTransactionResponse
} from '../../../core/services/payment.service';


type WebpayReturnState =
  | 'processing'
  | 'approved'
  | 'rejected'
  | 'aborted'
  | 'error';


@Component({
  selector:
    'app-webpay-return',

  templateUrl:
    './webpay-return.page.html',

  styleUrls: [
    './webpay-return.page.scss'
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
export class WebpayReturnPage
  implements OnInit {


  private readonly route =
    inject(
      ActivatedRoute
    );


  private readonly router =
    inject(
      Router
    );


  private readonly paymentService =
    inject(
      PaymentService
    );

private readonly cdr =
  inject(
    ChangeDetectorRef
  );
  state:
    WebpayReturnState =
      'processing';


  result:
    CommitWebpayTransactionResponse | null =
      null;


  requestId =
    '';


  errorMessage =
    '';


  constructor() {


    addIcons({
      checkmarkCircleOutline,
      closeCircleOutline,
      cardOutline,
      arrowForwardOutline
    });
  }


  /*
   * =========================================
   * RETORNO WEBPAY
   * =========================================
   */

  async ngOnInit():
    Promise<void> {


    /*
     * Transbank puede retornar diferentes
     * parámetros dependiendo de cómo terminó
     * la operación.
     */

    const tokenWs =
      this.route.snapshot
        .queryParamMap
        .get(
          'token_ws'
        )
        ?.trim()
      ??
      '';


    const tbkToken =
      this.route.snapshot
        .queryParamMap
        .get(
          'TBK_TOKEN'
        )
        ?.trim()
      ??
      '';


    const tbkOrdenCompra =
      this.route.snapshot
        .queryParamMap
        .get(
          'TBK_ORDEN_COMPRA'
        )
        ?.trim()
      ??
      '';


    const tbkIdSesion =
      this.route.snapshot
        .queryParamMap
        .get(
          'TBK_ID_SESION'
        )
        ?.trim()
      ??
      '';


    console.log(
      '[ServiGo Webpay] Retorno recibido:',
      {
        hasTokenWs:
          !!tokenWs,

        hasTbkToken:
          !!tbkToken,

        hasTbkOrdenCompra:
          !!tbkOrdenCompra,

        hasTbkIdSesion:
          !!tbkIdSesion
      }
    );


    /*
     * =====================================
     * FLUJO NORMAL
     * =====================================
     *
     * Si existe token_ws intentamos COMMIT.
     */

    if (
      tokenWs
    ) {

      await this
        .commitPayment(
          tokenWs
        );


      return;
    }


    /*
     * =====================================
     * OPERACIÓN ABORTADA
     * =====================================
     *
     * Si no recibimos token_ws pero sí
     * parámetros TBK, el usuario volvió
     * desde un flujo no completado.
     */

    if (
      tbkToken
      ||
      tbkOrdenCompra
      ||
      tbkIdSesion
    ) {

      this.state =
        'aborted';


      this.errorMessage =
        'El pago no fue completado. Puedes volver al servicio e intentarlo nuevamente.';


      return;
    }


    /*
     * =====================================
     * RETORNO INVÁLIDO
     * =====================================
     */

    this.state =
      'error';


    this.errorMessage =
      'No recibimos información válida para confirmar el pago.';
  }


  /*
   * =========================================
   * COMMIT
   * =========================================
   */

  private async commitPayment(
  token:
    string
): Promise<void> {


  this.state =
    'processing';


  this.errorMessage =
    '';


  this.cdr
    .detectChanges();


  try {


    const result =
      await this
        .paymentService
        .commitWebpayTransaction(
          token
        );


    console.log(
      '[ServiGo Webpay] COMMIT recibido:',
      result
    );


    this.result =
      result;


    this.requestId =
      result.requestId;


    if (
      result.approved
      &&
      result.status ===
        'approved'
    ) {

      this.state =
        'approved';


      this.cdr
        .detectChanges();


      return;
    }


    this.state =
      'rejected';


    this.errorMessage =
      'Transbank no autorizó la operación. No se realizó ningún cobro confirmado.';


    this.cdr
      .detectChanges();


  } catch (error) {


    console.error(
      '[ServiGo Webpay] Error confirmando pago:',
      error
    );


    this.state =
      'error';


    this.errorMessage =
      'No pudimos confirmar el resultado del pago. No vuelvas a pagar hasta revisar el estado del servicio.';


    this.cdr
      .detectChanges();
  }
}


  /*
   * =========================================
   * VOLVER AL SERVICIO
   * =========================================
   */

  async continueToService():
    Promise<void> {


    if (
      this.requestId
    ) {

      await this.router
        .navigate(
          [
            '/app/services',
            this.requestId
          ],
          {
            replaceUrl:
              true
          }
        );


      return;
    }


    await this.router
      .navigateByUrl(
        '/app/services',
        {
          replaceUrl:
            true
        }
      );
  }
}