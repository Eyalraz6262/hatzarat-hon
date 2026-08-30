import type { LatLng } from '../types';
import { t } from '../i18n';

const EARTH_RADIUS_M = 6_371_008.8;

const toRad = (deg: number) => (deg * Math.PI) / 180;

/**
 * Great-circle distance in meters between two points (haversine).
 * Accurate to well under a meter at the distances this app cares about.
 */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Localised, human-friendly distance.
 * Under 1 km we round to a readable step; above it we show one decimal.
 */
export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters) || meters < 0) return '—';

  if (meters < 1000) {
    const step = meters < 100 ? 10 : 50;
    const rounded = Math.max(step, Math.round(meters / step) * step);
    return t('common.meters', { value: rounded });
  }

  const km = meters / 1000;
  const value = km < 10 ? km.toFixed(1) : String(Math.round(km));
  return t('common.kilometers', { value });
}

/**
 * A map region that frames a circle of `radiusM` around `center` with padding.
 * Longitude degrees shrink with latitude, hence the cos() correction.
 */
export function regionForRadius(center: LatLng, radiusM: number, padding = 2.6) {
  const latitudeDelta = ((radiusM * padding) / EARTH_RADIUS_M) * (180 / Math.PI);
  const cos = Math.max(0.01, Math.cos(toRad(center.latitude)));
  return {
    latitude: center.latitude,
    longitude: center.longitude,
    latitudeDelta,
    longitudeDelta: latitudeDelta / cos,
  };
}

/** True when two coordinates are the same place for our purposes (< 1 m apart). */
export function sameCoords(a: LatLng | null, b: LatLng | null): boolean {
  if (!a || !b) return a === b;
  return distanceMeters(a, b) < 1;
}
