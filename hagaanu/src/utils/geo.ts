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

const toDeg = (rad: number) => (rad * 180) / Math.PI;

/**
 * The point `distanceM` away from `origin` on the given compass bearing.
 * Standard spherical destination-point formula.
 */
export function radialPoint(origin: LatLng, distanceM: number, bearingDeg: number): LatLng {
  const delta = distanceM / EARTH_RADIUS_M;
  const theta = toRad(bearingDeg);
  const phi1 = toRad(origin.latitude);
  const lambda1 = toRad(origin.longitude);

  const sinPhi2 =
    Math.sin(phi1) * Math.cos(delta) + Math.cos(phi1) * Math.sin(delta) * Math.cos(theta);
  const phi2 = Math.asin(Math.min(1, Math.max(-1, sinPhi2)));
  const lambda2 =
    lambda1 +
    Math.atan2(
      Math.sin(theta) * Math.sin(delta) * Math.cos(phi1),
      Math.cos(delta) - Math.sin(phi1) * sinPhi2
    );

  return { latitude: toDeg(phi2), longitude: toDeg(lambda2) };
}

/**
 * A closed ring of coordinates around `center`.
 *
 * Drawn as a polyline rather than a map Circle because the design calls for a
 * dashed survey ring, and neither platform's Circle overlay supports a dash
 * pattern. 72 segments is smooth at every zoom the app reaches without paying
 * for points nobody can see.
 */
export function ringPoints(center: LatLng, radiusM: number, segments = 72): LatLng[] {
  const step = 360 / segments;
  const points: LatLng[] = [];
  for (let i = 0; i <= segments; i += 1) {
    points.push(radialPoint(center, radiusM, i * step));
  }
  return points;
}

/**
 * Azimuth ticks: short radial strokes sitting just outside the ring, at every
 * `360 / count` degrees. These are what make the zone read as a diagram with a
 * bearing rather than a shaded blob.
 */
export function ringTicks(
  center: LatLng,
  radiusM: number,
  count = 12,
  lengthM = radiusM * 0.12
): LatLng[][] {
  const step = 360 / count;
  const ticks: LatLng[][] = [];
  for (let i = 0; i < count; i += 1) {
    const bearing = i * step;
    ticks.push([
      radialPoint(center, radiusM, bearing),
      radialPoint(center, radiusM + lengthM, bearing),
    ]);
  }
  return ticks;
}

/**
 * The radius dimension line — centre out to due west, with a perpendicular end
 * cap, the way a radius is called out on an engineering plan.
 */
export function dimensionLine(center: LatLng, radiusM: number): { line: LatLng[]; cap: LatLng[] } {
  const edge = radialPoint(center, radiusM, 270);
  const capLength = radiusM * 0.09;
  return {
    line: [center, edge],
    cap: [radialPoint(edge, capLength, 0), radialPoint(edge, capLength, 180)],
  };
}
