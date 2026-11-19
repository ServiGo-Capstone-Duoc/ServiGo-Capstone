/*
 * =========================================
 * RECOMENDACIÓN TERRITORIAL
 * =========================================
 */

export interface DemandRecommendation {

  commune:
    string;

  predictedDemand:
    number;

  predictedDemandRounded:
    number;

  level:
    'Alta'
    |
    'Media'
    |
    'Baja';

  ranking:
    number;

  historyRecords:
    number | null;

  lag1:
    number | null;

  lag7:
    number | null;

  rollingMean7:
    number | null;

  rollingMean28:
    number | null;
}


/*
 * =========================================
 * ANALYTICS DEMAND
 * =========================================
 */

export interface DemandAnalytics {

  id:
    string;

  predictionDate:
    string;

  category:
    string;

  timeBand:
    string;

  modelVersion:
    string;

  modelType:
    string;

  dataSource:
    string;

  experimental:
    boolean;

  isSynthetic:
    boolean;

  recommendationCount:
    number;

  recommendations:
    DemandRecommendation[];

  generatedAt:
    Date | null;

  updatedAt:
    Date | null;
}