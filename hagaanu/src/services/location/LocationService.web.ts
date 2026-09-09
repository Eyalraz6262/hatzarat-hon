import { POLLING_TIERS, type PollingTier } from '../../constants/config';
import type { LatLng, PositionSample } from '../../types';
import { log } from '../../utils/logger';
import { pointAt, progressAt, startPointFor, TRIP_MS } from '../demo/simulation';

/**
 * Location, in a browser.
 *
 * Two things are different here and only two: where positions come from, and
 * the fact that nothing runs once the tab is closed. Everything downstream —
 * the distance maths, the polling tiers, the overshoot and silence rules, the
 * arrival coordinator — is the same code the phone runs, reading the same
 * shape of sample.
 *
 * Positions come from a simulated trip rather than from the browser's
 * geolocation API. That is deliberate rather than a limitation: real
 * geolocation would put the demo wherever the reader happens to be sitting,
 * with a distance to a destination in another country that never changes, and
 * the one thing worth seeing — the screen closing in, and the alarm firing —
 * would never happen.
 */

/** The simulated trip, or null when nothing is running. */
let trip: { from: LatLng; to: LatLng; startedAt: number } | null = null;
let last: { at: number; coords: LatLng } | null = null;

/** Where the demo sits before a destination is chosen: central Israel. */
const IDLE: LatLng = { latitude: 32.0853, longitude: 34.7818 };

function sampleNow(): PositionSample {
  const at = Date.now();

  if (!trip) {
    last = { at, coords: IDLE };
    return { coords: IDLE, accuracy: 12, timestamp: at };
  }

  const coords = pointAt(trip.from, trip.to, progressAt(at - trip.startedAt));
  last = { at, coords };

  return { coords, accuracy: 9, timestamp: at };
}

export const DemoTrip = {
  /** Puts the traveller at a start point far enough out to watch the approach. */
  place(destination: LatLng, radiusM: number): void {
    trip = null;
    last = { at: Date.now(), coords: startPointFor(destination, radiusM) };
  },

  /** Starts moving from wherever the traveller is towards `destination`. */
  start(destination: LatLng, radiusM: number): void {
    const from = last?.coords ?? startPointFor(destination, radiusM);
    trip = { from, to: destination, startedAt: Date.now() };
    log.debug('location', 'web demo: trip started');
  },

  stop(): void {
    trip = null;
  },

  running(): boolean {
    return trip !== null && Date.now() - trip.startedAt < TRIP_MS + 4_000;
  },
};

/** Ticks fast enough that the gauge moves smoothly rather than in jumps. */
const TICK_MS = 900;

export const LocationService = {
  async getCurrent(): Promise<PositionSample | null> {
    return sampleNow();
  },

  watch(onSample: (sample: PositionSample) => void): Promise<{ remove: () => void }> {
    const timer = setInterval(() => onSample(sampleNow()), TICK_MS);
    onSample(sampleNow());
    return Promise.resolve({ remove: () => clearInterval(timer) });
  },

  tierForDistance(distanceM: number): PollingTier {
    return POLLING_TIERS.find((tier) => distanceM <= tier.maxDistanceM) ?? POLLING_TIERS[POLLING_TIERS.length - 1];
  },

  async isBackgroundTrackingActive(): Promise<boolean> {
    // Nothing runs with the tab closed, and saying otherwise would be the one
    // claim this build must never make.
    return true;
  },

  async startBackgroundTracking(): Promise<void> {},
  async stopBackgroundTracking(): Promise<void> {},
};
