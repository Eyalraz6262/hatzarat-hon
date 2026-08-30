/**
 * Central tuning constants for "הגענו?".
 * Everything that a product decision might want to change lives here.
 */

/** Names of the background tasks registered with expo-task-manager. */
export const TASKS = {
  /** Native OS geofence (region monitoring) — primary, cheapest trigger. */
  GEOFENCE: 'hagaanu-geofence-task',
  /** Background location stream — backstop, catches missed/late geofence events. */
  LOCATION: 'hagaanu-location-task',
} as const;

/** Android notification channels. */
export const CHANNELS = {
  /** Full alarm: max importance, alarm audio stream, bypasses Do Not Disturb. */
  ALARM: 'hagaanu-alarm',
  /** Quiet, ongoing "alarm is armed" status notification. */
  STATUS: 'hagaanu-status',
} as const;

/** The single geofence region identifier (we only ever monitor one). */
export const GEOFENCE_REGION_ID = 'hagaanu-destination';

/** Quick-pick radius options, in meters. */
export const RADIUS_PRESETS = [300, 500, 1000, 2000] as const;

export const DEFAULT_RADIUS_M = 500;

/**
 * iOS region monitoring is unreliable below ~100m, and GPS accuracy on a moving
 * train is rarely better than that anyway. Enforced on custom radius input.
 */
export const MIN_RADIUS_M = 150;
export const MAX_RADIUS_M = 20000;

/**
 * Battery-aware polling tiers for the backstop location task.
 *
 * The further the user is from the destination, the coarser we sample. Each tier
 * declares the distance band it covers and how often the OS should hand us a fix.
 * The task restarts itself with new options when the active tier changes, so a
 * two-hour ride costs almost nothing until the last few kilometers.
 */
export type PollingTier = {
  id: string;
  /** Tier applies while distance-to-destination is below this (meters). */
  maxDistanceM: number;
  /** Minimum meters travelled before we get a new fix. */
  distanceInterval: number;
  /** Minimum milliseconds between fixes (Android). */
  timeInterval: number;
};

export const POLLING_TIERS: PollingTier[] = [
  { id: 'near', maxDistanceM: 3000, distanceInterval: 150, timeInterval: 15_000 },
  { id: 'mid', maxDistanceM: 12000, distanceInterval: 700, timeInterval: 45_000 },
  { id: 'far', maxDistanceM: Number.POSITIVE_INFINITY, distanceInterval: 2500, timeInterval: 120_000 },
];

/**
 * Safety margin added to the radius when the backstop evaluates a fix.
 * A fix reported with 80m of error at exactly radius+50m is, in practice, inside.
 * We add the fix's own accuracy (capped) rather than a blind constant.
 */
export const MAX_ACCURACY_MARGIN_M = 250;

/** How long the in-app alarm keeps ringing before it gives up, in ms. */
export const ALARM_MAX_DURATION_MS = 5 * 60 * 1000;

/** Vibration pattern (ms): wait, vibrate, wait, vibrate... repeated. */
export const VIBRATION_PATTERN = [0, 800, 400, 800, 400, 1200];

/** Notification channel vibration pattern. */
export const CHANNEL_VIBRATION_PATTERN = [0, 500, 300, 500, 300, 800];

/** Bundled alarm sound. Must stay in sync with the `sounds` array in app.config.ts. */
export const ALARM_SOUND_FILE = 'alarm.wav';
