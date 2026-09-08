/**
 * The failure-mode rules.
 *
 * Run with: npm test
 *
 * This is the most important test file in the project. Every case below is a
 * real thing that happens on an Israeli bus or train, and the cost of getting
 * one wrong is either a passenger asleep past their stop or a passenger woken
 * at the wrong one. The second is worse, so the tests are written to pin down
 * when the app must STAY QUIET as carefully as when it must ring.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  STALE_RING_MS,
  STALE_WARN_MS,
  applyFix,
  onFix,
  onSilence,
  type TripState,
} from './watchdog';

const NOW = 1_757_000_000_000;

function trip(over: Partial<TripState> = {}): TripState {
  return {
    radiusM: 500,
    earlyRadiusM: null,
    earlySent: false,
    closestM: null,
    lastDistanceM: null,
    lastFixAt: null,
    lastSpeedMps: null,
    ...over,
  };
}

/* ── arrival ─────────────────────────────────────────────────────── */

test('rings inside the radius', () => {
  assert.deepEqual(onFix(trip(), 400, 0), { kind: 'arrive' });
  assert.deepEqual(onFix(trip(), 500, 0), { kind: 'arrive' });
});

test('stays quiet just outside the radius', () => {
  assert.deepEqual(onFix(trip(), 501, 0), { kind: 'none' });
});

test('a fix with poor accuracy widens the ring rather than being trusted exactly', () => {
  // 80m outside a 500m ring, but the fix itself reports 120m of error.
  assert.deepEqual(onFix(trip(), 580, 120), { kind: 'arrive' });
  // The same fix with a good lock is not an arrival.
  assert.deepEqual(onFix(trip(), 580, 10), { kind: 'none' });
});

/* ── the early heads-up ──────────────────────────────────────────── */

test('sends the early notice once, inside the early ring', () => {
  const state = trip({ earlyRadiusM: 2000 });
  assert.deepEqual(onFix(state, 1800, 0), { kind: 'early' });
  assert.deepEqual(onFix({ ...state, earlySent: true }, 1800, 0), { kind: 'none' });
});

test('no early notice when the user did not ask for one', () => {
  assert.deepEqual(onFix(trip({ earlyRadiusM: null }), 1800, 0), { kind: 'none' });
});

test('an overshoot beats the early notice', () => {
  // Already past the stop. "Time to get ready" would be actively wrong.
  const state = trip({ earlyRadiusM: 2000, closestM: 600 });
  assert.deepEqual(onFix(state, 1400, 0), { kind: 'overshot' });
});

/* ── overshoot ───────────────────────────────────────────────────── */

test('rings when the distance grows past the closest approach', () => {
  // Got to 600m from a 500m ring, the geofence was late, the train left.
  const state = trip({ closestM: 600 });
  assert.deepEqual(onFix(state, 900, 0), { kind: 'none' }); // within the margin
  assert.deepEqual(onFix(state, 1200, 0), { kind: 'overshot' });
});

test('GPS jitter at a standstill is not an overshoot', () => {
  const state = trip({ closestM: 600 });
  // A stationary phone wanders by tens of metres. None of this is travel.
  for (const d of [610, 640, 590, 660, 620]) {
    assert.deepEqual(onFix(state, d, 0), { kind: 'none' }, `${d}m should be quiet`);
  }
});

test('a wide detour far from the destination is not an overshoot', () => {
  // Closest was 20 km: we never got near, so we cannot have gone past.
  const state = trip({ closestM: 20_000 });
  assert.deepEqual(onFix(state, 26_000, 0), { kind: 'none' });
});

test('a bigger radius needs a bigger move before it counts as going past', () => {
  const wide = trip({ radiusM: 2000, closestM: 2400 });
  assert.deepEqual(onFix(wide, 3800, 0), { kind: 'none' });
  assert.deepEqual(onFix(wide, 4600, 0), { kind: 'overshot' });
});

test('no overshoot before we have measured anything', () => {
  assert.deepEqual(onFix(trip({ closestM: null }), 40_000, 0), { kind: 'none' });
});

/* ── silence ─────────────────────────────────────────────────────── */

test('a fresh fix is not silence', () => {
  const state = trip({ lastFixAt: NOW - 10_000, lastDistanceM: 4000 });
  assert.deepEqual(onSilence(state, NOW), { kind: 'none' });
});

test('after 90 seconds the lock screen stops claiming a live distance', () => {
  const state = trip({ lastFixAt: NOW - STALE_WARN_MS - 1, lastDistanceM: 9000 });
  assert.deepEqual(onSilence(state, NOW), { kind: 'stale-warn', lastDistanceM: 9000 });
});

test('a long blackout far from the destination stays a warning, not an alarm', () => {
  // 9 km out, standing still. Silence is the honest answer.
  const state = trip({
    lastFixAt: NOW - STALE_RING_MS - 1,
    lastDistanceM: 9000,
    lastSpeedMps: 0,
  });
  assert.deepEqual(onSilence(state, NOW), { kind: 'stale-warn', lastDistanceM: 9000 });
});

test('a long blackout close to the destination rings', () => {
  // 1.2 km out with a 500m ring, then a tunnel. This is the Carmel case, and
  // it is exactly where people miss their stop.
  const state = trip({ lastFixAt: NOW - STALE_RING_MS - 1, lastDistanceM: 1200 });
  assert.deepEqual(onSilence(state, NOW), { kind: 'stale-ring', lastDistanceM: 1200 });
});

test('a blackout rings once the trip would have finished at the last known speed', () => {
  // 6 km out at 30 m/s: about 183 seconds of travel left. Six minutes of
  // silence later, arriving during the blackout is the likeliest reading.
  const state = trip({
    lastFixAt: NOW - 6 * 60_000,
    lastDistanceM: 6000,
    lastSpeedMps: 30,
  });
  assert.deepEqual(onSilence(state, NOW), { kind: 'stale-ring', lastDistanceM: 6000 });
});

test('the same blackout does not ring before that time would have passed', () => {
  const state = trip({
    lastFixAt: NOW - STALE_RING_MS - 1,
    lastDistanceM: 6000,
    lastSpeedMps: 30,
  });
  assert.deepEqual(onSilence(state, NOW), { kind: 'stale-warn', lastDistanceM: 6000 });
});

test('a parked phone never rings on the speed rule, however long the silence', () => {
  const state = trip({
    lastFixAt: NOW - 60 * 60_000,
    lastDistanceM: 9000,
    lastSpeedMps: 1.2, // walking pace: noise, not travel
  });
  assert.deepEqual(onSilence(state, NOW), { kind: 'stale-warn', lastDistanceM: 9000 });
});

test('silence before the first fix does nothing at all', () => {
  // The OS geofence is still armed and is still the primary layer. There is
  // simply nothing for this rule to reason about yet.
  assert.deepEqual(onSilence(trip(), NOW), { kind: 'none' });
});

/* ── folding fixes in ────────────────────────────────────────────── */

test('the closest approach only ever falls', () => {
  let state = trip();
  state = applyFix(state, 8000, NOW, 20);
  assert.equal(state.closestM, 8000);
  state = applyFix(state, 3000, NOW + 1000, 20);
  assert.equal(state.closestM, 3000);
  state = applyFix(state, 5000, NOW + 2000, 20);
  assert.equal(state.closestM, 3000, 'moving away must not raise the low-water mark');
  assert.equal(state.lastDistanceM, 5000);
});

test('a negative speed from the OS is discarded rather than trusted', () => {
  // Both platforms report -1 when they have no speed estimate.
  const state = applyFix(trip(), 4000, NOW, -1);
  assert.equal(state.lastSpeedMps, null);
});

test('a whole journey ends in an arrival and nothing else', () => {
  let state = trip({ earlyRadiusM: 2000 });
  const signals: string[] = [];

  // Tel Aviv to Haifa, closing in.
  for (const [d, t] of [
    [78_000, 0],
    [40_000, 900_000],
    [12_000, 1_500_000],
    [3_000, 1_800_000],
    [1_800, 1_860_000],
    [900, 1_890_000],
    [420, 1_920_000],
  ] as const) {
    const signal = onFix(state, d, 20);
    signals.push(signal.kind);
    if (signal.kind === 'early') state = { ...state, earlySent: true };
    state = applyFix(state, d, NOW + t, 30);
  }

  assert.deepEqual(signals, ['none', 'none', 'none', 'none', 'early', 'none', 'arrive']);
});
