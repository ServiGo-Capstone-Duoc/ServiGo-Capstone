export type ServiGoLocationSource =
  | 'gps'
  | 'geocoded'
  | 'manual'
  | 'fallback';

export interface ServiGoFallbackLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  label: string;
}

/*
 * Coordenadas de continuidad para pruebas y contingencia.
 *
 * La aplicación siempre intenta utilizar una ubicación real o geocodificada
 * primero. Estas coordenadas solo se usan cuando el dispositivo, navegador o
 * proveedor de geocodificación no puede entregar una posición válida.
 */
export const CLIENT_FALLBACK_LOCATION: ServiGoFallbackLocation = {
  latitude: -33.60580873981834,
  longitude: -70.57482331349283,
  accuracy: 5000,
  label: 'Ubicación de respaldo del cliente en Santiago'
};

export const TECHNICIAN_FALLBACK_LOCATION: ServiGoFallbackLocation = {
  latitude: -33.589965678034076,
  longitude: -70.66675504900094,
  accuracy: 5000,
  label: 'Ubicación de respaldo del técnico en Santiago'
};
