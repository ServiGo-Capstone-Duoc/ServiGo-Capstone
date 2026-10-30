import {
  Injectable
} from '@angular/core';

import {
  httpsCallable
} from 'firebase/functions';

import {
  firebaseFunctions
} from '../firebase/firebase';


/*
 * =========================================
 * CREATE WEBPAY
 * =========================================
 */

export interface CreateWebpayTransactionResponse {

  ok: boolean;

  paymentId: string;

  requestId: string;

  quoteId: string;

  technicianId: string;

  amount: number;

  currency: 'CLP';

  status: 'pending';

  buyOrder: string;

  token: string;

  url: string;
}


/*
 * =========================================
 * COMMIT WEBPAY
 * =========================================
 */

export interface CommitWebpayTransactionResponse {

  ok: boolean;

  approved: boolean;

  paymentId: string;

  requestId: string;

  amount?: number;

  currency?: 'CLP';

  status?:
    'approved'
    |
    'rejected';

  responseCode: number;

  authorizationCode?: string;

  paymentTypeCode?: string;

  installmentsNumber?: number;

  cardLast4?: string;
}


@Injectable({
  providedIn:
    'root'
})
export class PaymentService {


  /*
   * =========================================
   * INICIAR WEBPAY PLUS
   * =========================================
   *
   * El frontend envía solamente requestId.
   *
   * El backend determina:
   *
   * - cliente autenticado
   * - presupuesto aceptado
   * - técnico contratado
   * - monto real
   * - buyOrder
   * - sessionId
   *
   * El frontend NUNCA determina el monto.
   */

  async createWebpayTransaction(
    requestId:
      string
  ): Promise<CreateWebpayTransactionResponse> {


    const createFunction =
      httpsCallable<
        {
          requestId:
            string;
        },
        CreateWebpayTransactionResponse
      >(
        firebaseFunctions,
        'createWebpayTransaction'
      );


    const response =
      await createFunction({
        requestId
      });


    if (
      !response.data.ok
      ||
      !response.data.token
      ||
      !response.data.url
    ) {

      throw new Error(
        'webpay-create-failed'
      );
    }


    console.log(
      '[ServiGo Payment] Webpay creado:',
      {
        paymentId:
          response.data.paymentId,

        requestId:
          response.data.requestId,

        amount:
          response.data.amount,

        status:
          response.data.status,

        buyOrder:
          response.data.buyOrder
      }
    );


    return response.data;
  }


  /*
   * =========================================
   * CONFIRMAR WEBPAY PLUS
   * =========================================
   *
   * Recibe token_ws después del retorno
   * desde Transbank.
   *
   * El backend realiza el COMMIT y valida:
   *
   * - propietario
   * - token
   * - buyOrder
   * - monto
   * - responseCode
   *
   * Solamente el backend puede cambiar:
   *
   * paymentStatus -> paid
   */

  async commitWebpayTransaction(
    token:
      string
  ): Promise<CommitWebpayTransactionResponse> {


    const normalizedToken =
      token.trim();


    if (
      !normalizedToken
    ) {

      throw new Error(
        'webpay-token-required'
      );
    }


    const commitFunction =
      httpsCallable<
        {
          token:
            string;
        },
        CommitWebpayTransactionResponse
      >(
        firebaseFunctions,
        'commitWebpayTransaction'
      );


    const response =
      await commitFunction({
        token:
          normalizedToken
      });


    console.log(
      '[ServiGo Payment] Resultado Webpay:',
      response.data
    );


    return response.data;
  }


  /*
   * =========================================
   * ENVIAR FORMULARIO A WEBPAY
   * =========================================
   *
   * Transbank requiere POST:
   *
   * token_ws = token
   *
   * No hacemos window.location.href porque
   * Webpay espera el token mediante POST.
   */

  redirectToWebpay(
    url:
      string,
    token:
      string
  ): void {


    if (
      !url
      ||
      !token
    ) {

      throw new Error(
        'webpay-redirect-invalid'
      );
    }


    const form =
      document.createElement(
        'form'
      );


    form.method =
      'POST';


    form.action =
      url;


    /*
     * Evita abrir una pestaña separada.
     */

    form.target =
      '_self';


    const tokenInput =
      document.createElement(
        'input'
      );


    tokenInput.type =
      'hidden';


    tokenInput.name =
      'token_ws';


    tokenInput.value =
      token;


    form.appendChild(
      tokenInput
    );


    document.body
      .appendChild(
        form
      );


    form.submit();


    /*
     * Si el navegador no ha abandonado aún
     * la página, retiramos el elemento.
     */

    setTimeout(
      () => {

        form.remove();

      },
      1000
    );
  }


  /*
   * =========================================
   * INICIAR PAGO COMPLETO
   * =========================================
   *
   * Método de conveniencia para las páginas
   * de ServiGo.
   */

  async startWebpayPayment(
    requestId:
      string
  ): Promise<void> {


    const transaction =
      await this
        .createWebpayTransaction(
          requestId
        );


    this.redirectToWebpay(
      transaction.url,
      transaction.token
    );
  }
}