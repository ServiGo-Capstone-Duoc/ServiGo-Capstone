import {
  Injectable
} from '@angular/core';

import {
  collection,
  DocumentData,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
  writeBatch
} from 'firebase/firestore';

import {
  firestore
} from '../firebase/firebase';

import {
  Quote,
  QuoteStatus
} from '../models/quote.model';


export interface CreateQuoteData {

  requestId: string;

  clientId: string;

  technicianId: string;
  technicianName: string;

  laborAmount: number;
  materialsAmount: number;
  otherAmount: number;

  availableDate: string;

  comment: string;
}


@Injectable({
  providedIn: 'root'
})
export class QuoteService {


  /*
   * =========================================
   * COTIZACIONES DEL CLIENTE
   * =========================================
   */

  async getQuotesForClient(
    clientId: string
  ): Promise<Quote[]> {

    const quotesQuery =
      query(
        collection(
          firestore,
          'quotes'
        ),

        where(
          'clientId',
          '==',
          clientId
        )
      );


    const result =
      await getDocs(
        quotesQuery
      );


    return result.docs
      .map(
        snapshot =>
          this.mapQuote(
            snapshot.data()
          )
      )
      .sort(
        (
          a,
          b
        ) => {

          const dateA =
            a.createdAt
              ?.getTime()
            ?? 0;

          const dateB =
            b.createdAt
              ?.getTime()
            ?? 0;


          return dateB - dateA;
        }
      );
  }


  async getQuotesForRequest(
    requestId: string,
    clientId: string
  ): Promise<Quote[]> {

    const quotes =
      await this.getQuotesForClient(
        clientId
      );


    return quotes.filter(
      quote =>
        quote.requestId ===
        requestId
    );
  }


  /*
   * =========================================
   * VALIDAR DUPLICADO TÉCNICO
   * =========================================
   */

  async hasActiveQuote(
    requestId: string,
    technicianId: string
  ): Promise<boolean> {

    const quotesQuery =
      query(
        collection(
          firestore,
          'quotes'
        ),

        where(
          'requestId',
          '==',
          requestId
        ),

        where(
          'technicianId',
          '==',
          technicianId
        )
      );


    const result =
      await getDocs(
        quotesQuery
      );


    return result.docs.some(
      snapshot => {

        const status =
          snapshot.data()['status'];


        return (
          status === 'sent'
          ||
          status === 'accepted'
        );
      }
    );
  }


  /*
   * =========================================
   * CREAR COTIZACIÓN
   * =========================================
   */

  async createQuote(
    data: CreateQuoteData
  ): Promise<string> {

    if (
      data.clientId ===
      data.technicianId
    ) {

      throw new Error(
        'cannot-quote-own-request'
      );
    }


    const duplicate =
      await this.hasActiveQuote(
        data.requestId,
        data.technicianId
      );


    if (
      duplicate
    ) {

      throw new Error(
        'quote-already-exists'
      );
    }


    const laborAmount =
      this.cleanAmount(
        data.laborAmount
      );

    const materialsAmount =
      this.cleanAmount(
        data.materialsAmount
      );

    const otherAmount =
      this.cleanAmount(
        data.otherAmount
      );


    const totalAmount =
      laborAmount
      + materialsAmount
      + otherAmount;


    if (
      totalAmount <= 0
    ) {

      throw new Error(
        'invalid-total'
      );
    }


    const quoteRef =
      doc(
        collection(
          firestore,
          'quotes'
        )
      );


    const status:
      QuoteStatus =
        'sent';


    await setDoc(
      quoteRef,
      {

        id:
          quoteRef.id,

        requestId:
          data.requestId,

        clientId:
          data.clientId,

        technicianId:
          data.technicianId,

        technicianName:
          data.technicianName.trim(),

        laborAmount,

        materialsAmount,

        otherAmount,

        totalAmount,

        availableDate:
          this.parseDate(
            data.availableDate
          ),

        comment:
          data.comment.trim(),

        status,

        createdAt:
          serverTimestamp(),

        updatedAt:
          serverTimestamp()
      }
    );


    return quoteRef.id;
  }


  /*
   * =========================================
   * ACEPTAR COTIZACIÓN
   * =========================================
   */

  async acceptQuote(
    clientId: string,
    selectedQuote: Quote
  ): Promise<void> {

    if (
      selectedQuote.clientId !==
      clientId
    ) {

      throw new Error(
        'quote-not-owned'
      );
    }


    if (
      selectedQuote.status !==
      'sent'
    ) {

      throw new Error(
        'quote-not-available'
      );
    }


    /*
     * Recuperamos todas las cotizaciones
     * de esta solicitud.
     */
    const quotes =
      await this.getQuotesForRequest(
        selectedQuote.requestId,
        clientId
      );


    const batch =
      writeBatch(
        firestore
      );


    /*
     * Cotización seleccionada.
     */
    const selectedQuoteRef =
      doc(
        firestore,
        'quotes',
        selectedQuote.id
      );


    batch.update(
      selectedQuoteRef,
      {

        status:
          'accepted',

        updatedAt:
          serverTimestamp()
      }
    );


    /*
     * Rechazamos automáticamente
     * las demás cotizaciones que
     * todavía estén enviadas.
     */
    for (
      const quote
      of quotes
    ) {

      if (
        quote.id ===
        selectedQuote.id
      ) {

        continue;
      }


      if (
        quote.status !==
        'sent'
      ) {

        continue;
      }


      const quoteRef =
        doc(
          firestore,
          'quotes',
          quote.id
        );


      batch.update(
        quoteRef,
        {

          status:
            'rejected',

          updatedAt:
            serverTimestamp()
        }
      );
    }


    /*
     * Convertimos la solicitud
     * en un servicio contratado.
     */
    const requestRef =
      doc(
        firestore,
        'serviceRequests',
        selectedQuote.requestId
      );


    batch.update(
      requestRef,
      {

        status:
          'accepted',

        assignedTechnicianId:
          selectedQuote.technicianId,

        acceptedQuoteId:
          selectedQuote.id,

        updatedAt:
          serverTimestamp()
      }
    );


    /*
     * Todo se confirma junto.
     *
     * Si una escritura falla,
     * ninguna se aplica.
     */
    await batch.commit();
  }


  /*
   * =========================================
   * RECHAZAR UNA COTIZACIÓN
   * =========================================
   */

  async rejectQuote(
    clientId: string,
    quote: Quote
  ): Promise<void> {

    if (
      quote.clientId !==
      clientId
    ) {

      throw new Error(
        'quote-not-owned'
      );
    }


    if (
      quote.status !==
      'sent'
    ) {

      throw new Error(
        'quote-not-available'
      );
    }


    const batch =
      writeBatch(
        firestore
      );


    const quoteRef =
      doc(
        firestore,
        'quotes',
        quote.id
      );


    batch.update(
      quoteRef,
      {

        status:
          'rejected',

        updatedAt:
          serverTimestamp()
      }
    );


    await batch.commit();
  }


  /*
   * =========================================
   * MAPEO
   * =========================================
   */

  private mapQuote(
    data: DocumentData
  ): Quote {

    return {

      id:
        data['id'] ?? '',

      requestId:
        data['requestId'] ?? '',

      clientId:
        data['clientId'] ?? '',

      technicianId:
        data['technicianId'] ?? '',

      technicianName:
        data['technicianName'] ?? '',

      laborAmount:
        Number(
          data['laborAmount']
          ?? 0
        ),

      materialsAmount:
        Number(
          data['materialsAmount']
          ?? 0
        ),

      otherAmount:
        Number(
          data['otherAmount']
          ?? 0
        ),

      totalAmount:
        Number(
          data['totalAmount']
          ?? 0
        ),

      availableDate:
        this.toDate(
          data['availableDate']
        ),

      comment:
        data['comment'] ?? '',

      status:
        (
          data['status']
          ?? 'sent'
        ) as QuoteStatus,

      createdAt:
        this.toDate(
          data['createdAt']
        ),

      updatedAt:
        this.toDate(
          data['updatedAt']
        )
    };
  }


  private cleanAmount(
    value: number
  ): number {

    const result =
      Number(value);


    if (
      !Number.isFinite(result)
      ||
      result < 0
    ) {

      return 0;
    }


    return Math.round(
      result
    );
  }


  private parseDate(
    value: string
  ): Timestamp | null {

    if (!value) {
      return null;
    }


    const [
      year,
      month,
      day
    ] =
      value
        .split('-')
        .map(Number);


    if (
      !year
      ||
      !month
      ||
      !day
    ) {

      return null;
    }


    return Timestamp.fromDate(
      new Date(
        year,
        month - 1,
        day,
        12,
        0,
        0
      )
    );
  }


  private toDate(
    value: unknown
  ): Date | null {

    if (
      value instanceof Timestamp
    ) {

      return value.toDate();
    }


    if (
      value instanceof Date
    ) {

      return value;
    }


    return null;
  }
}