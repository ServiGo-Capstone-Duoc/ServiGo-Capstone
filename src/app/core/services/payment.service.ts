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
 * RESUMEN ECONÓMICO DEL SERVICIO
 * =========================================
 *
 * El backend reconstruye el contexto desde el documento de cotización o el
 * snapshot autoritativo guardado en la solicitud. El frontend no calcula ni
 * propone montos.
 */

export type ServicePaymentSummaryReason =
  | 'accepted_quote_unavailable'
  | 'service_not_completed'
  | 'already_paid'
  | null;

export interface ServicePaymentSummaryResponse {
  ok: boolean;
  available: boolean;
  eligible: boolean;
  reason: ServicePaymentSummaryReason;
  requestId: string;
  serviceStatus: string;
  paymentStatus: 'pending' | 'paid';
  paymentId?: string | null;
  quoteId?: string;
  technicianId?: string;
  technicianName?: string;
  visitFeeAmount?: number;
  laborAmount?: number;
  materialsAmount?: number;
  otherAmount?: number;
  totalAmount?: number;
  currency: 'CLP';
}


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

export interface AbortWebpayTransactionResponse {
  ok: boolean;
  requestId: string;
  paymentId: string;
  status: 'aborted' | 'approved';
  updated: boolean;
}


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


  async getServicePaymentSummary(
    requestId: string
  ): Promise<ServicePaymentSummaryResponse> {
    const normalizedRequestId =
      requestId.trim();

    if (
      !normalizedRequestId
    ) {
      throw new Error(
        'payment-request-id-required'
      );
    }

    const summaryFunction =
      httpsCallable<
        { requestId: string },
        ServicePaymentSummaryResponse
      >(
        firebaseFunctions,
        'getServicePaymentSummary'
      );

    const response =
      await summaryFunction({
        requestId: normalizedRequestId
      });

    if (
      !response.data?.ok
    ) {
      throw new Error(
        'payment-summary-failed'
      );
    }

    return response.data;
  }


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


    


    return response.data;
  }


  async abortWebpayTransaction(
    token: string
  ): Promise<AbortWebpayTransactionResponse> {
    const normalizedToken =
      token.trim();

    if (
      !normalizedToken
    ) {
      throw new Error(
        'webpay-token-required'
      );
    }

    const abortFunction =
      httpsCallable<
        { token: string },
        AbortWebpayTransactionResponse
      >(
        firebaseFunctions,
        'abortWebpayTransaction'
      );

    const response =
      await abortFunction({
        token: normalizedToken
      });

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