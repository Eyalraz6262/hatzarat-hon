/**
 * The rules that decide what a trip is doing.
 *
 * Pure, and deliberately so. Everything here runs from a background task in a
 * JS context with no React tree, no screen and often no user awake, and it is
 * the code that decides whether someone gets woken. Keeping it as functions
 * over plain values is what makes it possible to test the cases that matter —
 * every one of which is a real thing that happens on an Israeli train.
 *
 * The one rule that shapes all of it: NEVER GUESS A POSITION. When the fix
 * goes stale we may decide to ring, and we may say we lost signal, but we
 * never extrapolate where the passenger is and never claim they arrived.
 * A wrong position wakes someone at the wrong station and they get off, which
 * is worse than not waking them at all.
 */

export type TripState = {
  /** The alarm radius the user picked. */
  radiusM: number;
  /** The optional early heads-up radius. Null when the user did not want one. */
  earlyRadiusM: number | null;
  /** Whether the early heads-up has already been sent. */
  earlySent: boolean;
  /**
   * The closest we have ever measured on this trip.
   *
   * The whole overshoot rule hangs off this: without a low-water mark there is
   * no way to tell "the bus is going the long way round" from "we went past".
   */
  closestM: number | null;
  /** Distance at the most recent fix. */
  lastDistanceM: number | null;
  /** Epoch ms of the most recent fix. */
  lastFixAt: number | null;
  /** Ground speed at the most recent fix, m/s, when the OS reported one. */
  lastSpeedMps: number | null;
};

export type TripSignal =
  /** Inside the ring. Ring the alarm. */
  | { kind: 'arrive' }
  /** Inside the early ring for the first time. A silent notice, no sound. */
  | { kind: 'early' }
  /** We were approaching and now we are not. Ring, with a different message. */
  | { kind: 'overshot' }
  /** No fix for long enough that we should ring anyway. */
  | { kind: 'stale-ring'; lastDistanceM: number }
  /** No fix for a while. Say so on the lock screen; do not ring. */
  | { kind: 'stale-warn'; lastDistanceM: number }
  /** Carry on. */
  | { kind: 'none' };

/* ------------------------------------------------------------------ *
 * Thresholds
 * ------------------------------------------------------------------ */

/** After this long without a fix, the lock screen stops claiming a distance. */
export const STALE_WARN_MS = 90_000;

/** After this long without a fix, we consider ringing anyway. */
export const STALE_RING_MS = 180_000;

/**
 * How far past the closest approach counts as having gone past.
 *
 * Never smaller than 300m, because GPS jitter alone moves a stationary phone
 * further than a tighter threshold would tolerate, and never smaller than the
 * radius itself — inside the radius we would have rung already.
 */
export function overshootMargin(radiusM: number): number {
  return Math.max(300, radiusM);
}

/**
 * How close we must have got before "you went past" is a claim worth making.
 *
 * Without this, a bus taking a wide detour 20 km out would trip the rule and
 * wake someone in the middle of nowhere to tell them they missed a stop they
 * never reached.
 */
export function overshootProximity(radiusM: number): number {
  return Math.max(1500, radiusM * 4);
}

/**
 * How close we must have last been for a stale fix to be worth ringing on.
 *
 * Three radii out is close enough that arriving during the blackout is
 * plausible. Further than that and silence is the honest answer.
 */
export function staleRingProximity(radiusM: number): number {
  return radiusM * 3;
}

/** Below this the speed reading is noise, not travel. ~18 km/h. */
const MOVING_MPS = 5;

/** How far past a computed arrival time we wait before ringing on it. */
const ETA_GRACE_MS = 60_000;

/* ------------------------------------------------------------------ *
 * The decision
 * ------------------------------------------------------------------ */

/**
 * What to do about a fresh fix.
 *
 * `accuracyMargin` widens the arrival test by the fix's own reported error: a
 * fix with 120m of error sitting 80m outside the ring is very likely already
 * inside it. The caller caps it, so a garbage fix cannot ring the alarm
 * kilometres early.
 */
export function onFix(state: TripState, distanceM: number, accuracyMargin: number): TripSignal {
  if (distanceM <= state.radiusM + accuracyMargin) return { kind: 'arrive' };

  // Overshoot is checked before the early notice: if we have already gone
  // past, telling someone to start getting ready is worse than useless.
  if (isOvershooting(state, distanceM)) return { kind: 'overshot' };

  if (
    state.earlyRadiusM !== null &&
    !state.earlySent &&
    distanceM <= state.earlyRadiusM
  ) {
    return { kind: 'early' };
  }

  return { kind: 'none' };
}

function isOvershooting(state: TripState, distanceM: number): boolean {
  const { closestM, radiusM } = state;
  if (closestM === null) return false;

  // Only near the destination, and only once we are meaningfully past the
  // closest point we ever reached.
  if (closestM > overshootProximity(radiusM)) return false;
  return distanceM > closestM + overshootMargin(radiusM);
}

/**
 * What to do when no fix has arrived for a while.
 *
 * Called on a timer and whenever the app comes back to the foreground, since
 * the interesting case is precisely the one where the background stream has
 * gone quiet.
 */
export function onSilence(state: TripState, now: number): TripSignal {
  const { lastFixAt, lastDistanceM } = state;

  // Before the first fix there is nothing to be stale about. The alarm is
  // still armed and the OS geofence is still the primary layer.
  if (lastFixAt === null || lastDistanceM === null) return { kind: 'none' };

  const silentFor = now - lastFixAt;
  if (silentFor < STALE_WARN_MS) return { kind: 'none' };

  if (silentFor >= STALE_RING_MS && shouldRingOnSilence(state, now, silentFor)) {
    return { kind: 'stale-ring', lastDistanceM };
  }

  return { kind: 'stale-warn', lastDistanceM };
}

/**
 * Whether a blackout is worth ringing through.
 *
 * Two independent reasons, and either is enough:
 *
 *  1. We were already close. Arriving during the blackout is plausible, and a
 *     tunnel is exactly where people miss their stop.
 *  2. We were moving fast enough that the remaining distance would have been
 *     covered by now. This extrapolates TIME, not position: it decides whether
 *     to ring, and the message it produces says we lost signal rather than
 *     claiming an arrival.
 */
function shouldRingOnSilence(state: TripState, now: number, silentFor: number): boolean {
  const { lastDistanceM, lastFixAt, lastSpeedMps, radiusM } = state;
  if (lastDistanceM === null || lastFixAt === null) return false;

  if (lastDistanceM <= staleRingProximity(radiusM)) return true;

  if (lastSpeedMps !== null && lastSpeedMps >= MOVING_MPS) {
    const secondsNeeded = (lastDistanceM - radiusM) / lastSpeedMps;
    const etaAt = lastFixAt + secondsNeeded * 1000;
    if (now > etaAt + ETA_GRACE_MS) return true;
  }

  // Referenced so the reason for the threshold stays next to its use.
  void silentFor;
  return false;
}

/**
 * Folds a fresh fix into the trip's running state.
 *
 * `closestM` only ever falls, which is what makes it a low-water mark rather
 * than a running distance, and is the reason the overshoot rule can tell
 * "going past" from "going around".
 */
export function applyFix(
  state: TripState,
  distanceM: number,
  at: number,
  speedMps: number | null
): TripState {
  return {
    ...state,
    closestM: state.closestM === null ? distanceM : Math.min(state.closestM, distanceM),
    lastDistanceM: distanceM,
    lastFixAt: at,
    lastSpeedMps: speedMps !== null && speedMps >= 0 ? speedMps : null,
  };
}
