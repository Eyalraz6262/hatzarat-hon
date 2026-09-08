import type { LatLng } from '../../types';

/**
 * The simulated journey, as arithmetic.
 *
 * A browser cannot travel. Without this the web build would let you arm an
 * alarm and then sit there forever, which shows the setup screens and hides
 * everything the app is actually for — the screen changing as you close in,
 * and the alarm going off.
 *
 * So the demo moves you. It drives the SAME store, the same watchdog and the
 * same arrival coordinator that a phone does; only the source of the positions
 * is different. None of the detection rules are simulated, which is the point:
 * what you watch happen in the browser is the real logic running.
 */

/** How long a simulated trip takes, start to alarm. */
export const TRIP_MS = 40_000;

/**
 * Eases into motion and out of it, so the distance readout behaves like a
 * vehicle rather than a linear ramp — the polling tiers and the speed-based
 * rules then see something shaped like a real trip.
 */
export function progressAt(elapsedMs: number, totalMs: number = TRIP_MS): number {
  const x = Math.min(Math.max(elapsedMs / totalMs, 0), 1);
  return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
}

/** Where the traveller is at a given progress, between two points. */
export function pointAt(from: LatLng, to: LatLng, progress: number): LatLng {
  return {
    latitude: from.latitude + (to.latitude - from.latitude) * progress,
    longitude: from.longitude + (to.longitude - from.longitude) * progress,
  };
}

/**
 * Metres per second between two samples.
 *
 * Reported alongside each simulated fix because the overshoot rules read speed
 * to tell a parked phone's GPS jitter from a vehicle that has genuinely passed
 * the stop. Handing them a null would quietly disable a rule the demo exists
 * to exercise.
 */
export function speedBetween(a: LatLng, b: LatLng, seconds: number): number {
  if (seconds <= 0) return 0;
  return metresBetween(a, b) / seconds;
}

/** Flat-earth distance. Good to a fraction of a percent at these ranges. */
export function metresBetween(a: LatLng, b: LatLng): number {
  const R = 6_371_000;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat = ((a.latitude + b.latitude) / 2) * (Math.PI / 180);
  const x = dLon * Math.cos(lat);
  return Math.sqrt(dLat * dLat + x * x) * R;
}

/**
 * Where a simulated trip starts.
 *
 * Far enough out that the armed screen begins in its "far" state and the
 * passenger sees it change — starting inside the gauge's window would skip the
 * one transition the whole design is built around.
 */
export function startPointFor(destination: LatLng, radiusM: number): LatLng {
  const metres = Math.max(radiusM * 26, 9_000);
  return {
    latitude: destination.latitude - metres / 111_000,
    longitude: destination.longitude - metres / 128_000,
  };
}
