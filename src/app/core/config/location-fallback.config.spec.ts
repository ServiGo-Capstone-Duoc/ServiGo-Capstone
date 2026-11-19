import {
  CLIENT_FALLBACK_LOCATION,
  TECHNICIAN_FALLBACK_LOCATION
} from './location-fallback.config';

describe('ServiGo fallback locations', () => {
  it('mantiene la ubicación de respaldo del cliente', () => {
    expect(CLIENT_FALLBACK_LOCATION.latitude)
      .toBe(-33.60580873981834);
    expect(CLIENT_FALLBACK_LOCATION.longitude)
      .toBe(-70.57482331349283);
  });

  it('mantiene la ubicación de respaldo del técnico', () => {
    expect(TECHNICIAN_FALLBACK_LOCATION.latitude)
      .toBe(-33.589965678034076);
    expect(TECHNICIAN_FALLBACK_LOCATION.longitude)
      .toBe(-70.66675504900094);
  });
});
