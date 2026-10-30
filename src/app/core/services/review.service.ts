import {
  Injectable
} from '@angular/core';

import {
  httpsCallable
} from 'firebase/functions';

import {
  firebaseFunctions
} from '../firebase/firebase';


export interface ServiceReview {

  id: string;

  requestId: string;

  clientId: string;

  technicianId: string;

  rating: number;

  comment: string;
}


interface GetReviewResponse {

  exists: boolean;

  review:
    ServiceReview
    | null;
}


interface SubmitReviewResponse {

  ok: boolean;

  reviewId: string;

  technicianId: string;

  rating: number;

  comment: string;

  averageRating: number;

  ratingCount: number;
}


@Injectable({
  providedIn:
    'root'
})
export class ReviewService {


  /*
   * =========================================
   * OBTENER REVIEW
   * =========================================
   */

  async getReviewForRequest(
    requestId: string
  ): Promise<
    ServiceReview | null
  > {


    const callable =
      httpsCallable<
        {
          requestId: string;
        },
        GetReviewResponse
      >(
        firebaseFunctions,
        'getReviewForRequest'
      );


    const response =
      await callable({
        requestId
      });


    if (
      !response.data
        .exists
    ) {

      return null;
    }


    return response.data
      .review;
  }


  /*
   * =========================================
   * ENVIAR REVIEW
   * =========================================
   */

  async submitReview(
    requestId: string,
    rating: number,
    comment: string
  ): Promise<
    SubmitReviewResponse
  > {


    const callable =
      httpsCallable<
        {
          requestId: string;
          rating: number;
          comment: string;
        },
        SubmitReviewResponse
      >(
        firebaseFunctions,
        'submitReview'
      );


    const response =
      await callable({

        requestId,

        rating,

        comment
      });


    return response.data;
  }
}