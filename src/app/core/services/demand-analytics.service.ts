import {
  Injectable
} from '@angular/core';

import {
  collection,
  DocumentData,
  getDocs,
  query,
  Timestamp
} from 'firebase/firestore';

import {
  firestore
} from '../firebase/firebase';

import {
  DemandAnalytics,
  DemandRecommendation
} from '../models/demand-analytics.model';


@Injectable({
  providedIn:
    'root'
})
export class DemandAnalyticsService {


  /*
   * =========================================
   * TODAS LAS PREDICCIONES
   * =========================================
   *
   * Servicio READ-ONLY.
   *
   * Angular nunca crea, modifica ni elimina
   * documentos analyticsDemand.
   */

  async getPredictions():
    Promise<DemandAnalytics[]> {


    const snapshot =
      await getDocs(
        query(
          collection(
            firestore,
            'analyticsDemand'
          )
        )
      );


    if (
      snapshot.empty
    ) {

      return [];
    }


    return snapshot.docs
      .map(
        documentSnapshot =>
          this.mapPrediction(
            documentSnapshot.id,
            documentSnapshot.data()
          )
      )
      .filter(
        (
          prediction
        ):
          prediction is DemandAnalytics =>
            prediction !== null
      )
      .sort(
        (
          a,
          b
        ) =>
          this.comparePredictions(
            a,
            b
          )
      );
  }


  /*
   * =========================================
   * PREDICCIÓN MÁS RECIENTE
   * =========================================
   *
   * Se mantiene para compatibilidad con
   * el Home actual.
   */

  async getLatestPrediction():
    Promise<DemandAnalytics | null> {


    const predictions =
      await this.getPredictions();


    return (
      predictions[
        0
      ]
      ??
      null
    );
  }


  /*
   * =========================================
   * ÚLTIMA FECHA DISPONIBLE
   * =========================================
   */

  getLatestPredictionDate(
    predictions:
      DemandAnalytics[]
  ): string {


    if (
      predictions.length ===
        0
    ) {

      return '';
    }


    return predictions
      .map(
        prediction =>
          prediction.predictionDate
      )
      .filter(
        date =>
          !!date
      )
      .sort(
        (
          a,
          b
        ) =>
          b.localeCompare(
            a
          )
      )[
        0
      ]
      ??
      '';
  }


  /*
   * =========================================
   * PREDICCIONES DE ÚLTIMA FECHA
   * =========================================
   */

  getLatestPredictions(
    predictions:
      DemandAnalytics[]
  ): DemandAnalytics[] {


    const latestDate =
      this.getLatestPredictionDate(
        predictions
      );


    if (
      !latestDate
    ) {

      return [];
    }


    return predictions
      .filter(
        prediction =>
          prediction.predictionDate ===
            latestDate
      )
      .sort(
        (
          a,
          b
        ) => {


          const categoryComparison =
            a.category.localeCompare(
              b.category,
              'es'
            );


          if (
            categoryComparison !==
              0
          ) {

            return categoryComparison;
          }


          return (
            this.timeBandOrder(
              a.timeBand
            )
            -
            this.timeBandOrder(
              b.timeBand
            )
          );
        }
      );
  }


  /*
   * =========================================
   * BUSCAR COMBINACIÓN
   * =========================================
   */

  findPrediction(
    predictions:
      DemandAnalytics[],
    category:
      string,
    timeBand:
      string
  ): DemandAnalytics | null {


    const latestPredictions =
      this.getLatestPredictions(
        predictions
      );


    return (
      latestPredictions.find(
        prediction =>
          prediction.category ===
            category
          &&
          prediction.timeBand ===
            timeBand
      )
      ??
      null
    );
  }


  /*
   * =========================================
   * CATEGORÍAS DISPONIBLES
   * =========================================
   */

  getCategories(
    predictions:
      DemandAnalytics[]
  ): string[] {


    const latestPredictions =
      this.getLatestPredictions(
        predictions
      );


    return Array.from(
      new Set(
        latestPredictions.map(
          prediction =>
            prediction.category
        )
      )
    )
      .sort(
        (
          a,
          b
        ) =>
          a.localeCompare(
            b,
            'es'
          )
      );
  }


  /*
   * =========================================
   * FRANJAS DISPONIBLES
   * =========================================
   */

  getTimeBands(
    predictions:
      DemandAnalytics[],
    category:
      string
  ): string[] {


    const latestPredictions =
      this.getLatestPredictions(
        predictions
      );


    const values =
      Array.from(
        new Set(
          latestPredictions
            .filter(
              prediction =>
                prediction.category ===
                  category
            )
            .map(
              prediction =>
                prediction.timeBand
            )
        )
      );


    return values.sort(
      (
        a,
        b
      ) =>
        this.timeBandOrder(
          a
        )
        -
        this.timeBandOrder(
          b
        )
    );
  }


  /*
   * =========================================
   * MAPEAR PREDICCIÓN
   * =========================================
   */

  private mapPrediction(
    id:
      string,
    data:
      DocumentData
  ): DemandAnalytics | null {


    const predictionDate =
      typeof data[
        'predictionDate'
      ] ===
        'string'
        ? data[
            'predictionDate'
          ]
        : '';


    const category =
      typeof data[
        'category'
      ] ===
        'string'
        ? data[
            'category'
          ]
        : '';


    const timeBand =
      typeof data[
        'timeBand'
      ] ===
        'string'
        ? data[
            'timeBand'
          ]
        : '';


    if (
      !predictionDate
      ||
      !category
      ||
      !timeBand
    ) {

      return null;
    }


    const rawRecommendations =
      Array.isArray(
        data[
          'recommendations'
        ]
      )
        ? data[
            'recommendations'
          ]
        : [];


    const recommendations =
      rawRecommendations
        .map(
          (
            item:
              unknown
          ) =>
            this.mapRecommendation(
              item
            )
        )
        .filter(
          (
            item
          ):
            item is DemandRecommendation =>
              item !== null
        )
        .sort(
          (
            a,
            b
          ) =>
            a.ranking
            -
            b.ranking
        );


    return {

      id,

      predictionDate,

      category,

      timeBand,

      modelVersion:
        this.stringValue(
          data[
            'modelVersion'
          ]
        ),

      modelType:
        this.stringValue(
          data[
            'modelType'
          ]
        ),

      dataSource:
        this.stringValue(
          data[
            'dataSource'
          ]
        ),

      experimental:
        data[
          'experimental'
        ] ===
          true,

      isSynthetic:
        data[
          'isSynthetic'
        ] ===
          true,

      recommendationCount:
        this.numberValue(
          data[
            'recommendationCount'
          ]
        )
        ??
        recommendations.length,

      recommendations,

      generatedAt:
        this.toDate(
          data[
            'generatedAt'
          ]
        ),

      updatedAt:
        this.toDate(
          data[
            'updatedAt'
          ]
        )
    };
  }


  /*
   * =========================================
   * MAPEAR RECOMENDACIÓN
   * =========================================
   */

  private mapRecommendation(
    value:
      unknown
  ): DemandRecommendation | null {


    if (
      !value
      ||
      typeof value !==
        'object'
    ) {

      return null;
    }


    const data =
      value as
        Record<
          string,
          unknown
        >;


    const commune =
      this.stringValue(
        data[
          'commune'
        ]
      );


    const ranking =
      this.numberValue(
        data[
          'ranking'
        ]
      );


    const predictedDemand =
      this.numberValue(
        data[
          'predictedDemand'
        ]
      );


    if (
      !commune
      ||
      ranking ===
        null
      ||
      predictedDemand ===
        null
    ) {

      return null;
    }


    const rawLevel =
      this.stringValue(
        data[
          'level'
        ]
      );


    let level:
      DemandRecommendation[
        'level'
      ] =
        'Media';


    if (
      rawLevel ===
        'Alta'
      ||
      rawLevel ===
        'Media'
      ||
      rawLevel ===
        'Baja'
    ) {

      level =
        rawLevel;
    }


    return {

      commune,

      predictedDemand,

      predictedDemandRounded:
        this.numberValue(
          data[
            'predictedDemandRounded'
          ]
        )
        ??
        Math.max(
          0,
          Math.round(
            predictedDemand
          )
        ),

      level,

      ranking,

      historyRecords:
        this.numberValue(
          data[
            'historyRecords'
          ]
        ),

      lag1:
        this.numberValue(
          data[
            'lag1'
          ]
        ),

      lag7:
        this.numberValue(
          data[
            'lag7'
          ]
        ),

      rollingMean7:
        this.numberValue(
          data[
            'rollingMean7'
          ]
        ),

      rollingMean28:
        this.numberValue(
          data[
            'rollingMean28'
          ]
        )
    };
  }


  /*
   * =========================================
   * ORDEN GENERAL
   * =========================================
   */

  private comparePredictions(
    a:
      DemandAnalytics,
    b:
      DemandAnalytics
  ): number {


    const dateComparison =
      b.predictionDate
        .localeCompare(
          a.predictionDate
        );


    if (
      dateComparison !==
        0
    ) {

      return dateComparison;
    }


    const categoryComparison =
      a.category.localeCompare(
        b.category,
        'es'
      );


    if (
      categoryComparison !==
        0
    ) {

      return categoryComparison;
    }


    return (
      this.timeBandOrder(
        a.timeBand
      )
      -
      this.timeBandOrder(
        b.timeBand
      )
    );
  }


  /*
   * =========================================
   * ORDEN FRANJA
   * =========================================
   */

  private timeBandOrder(
    value:
      string
  ): number {


    switch (
      value
    ) {

      case 'Mañana':

        return 1;


      case 'Tarde':

        return 2;


      case 'Noche':

        return 3;


      default:

        return 99;
    }
  }


  /*
   * =========================================
   * HELPERS
   * =========================================
   */

  private stringValue(
    value:
      unknown
  ): string {


    return (
      typeof value ===
        'string'
        ? value.trim()
        : ''
    );
  }


  private numberValue(
    value:
      unknown
  ): number | null {


    if (
      typeof value ===
        'number'
      &&
      Number.isFinite(
        value
      )
    ) {

      return value;
    }


    return null;
  }


  private toDate(
    value:
      unknown
  ): Date | null {


    if (
      value instanceof
        Timestamp
    ) {

      return value.toDate();
    }


    if (
      value
      &&
      typeof (
        value as {
          toDate?:
            () => Date;
        }
      ).toDate ===
        'function'
    ) {

      return (
        value as {
          toDate:
            () => Date;
        }
      ).toDate();
    }


    if (
      value instanceof
        Date
    ) {

      return value;
    }


    return null;
  }
}