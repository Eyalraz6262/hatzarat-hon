/**
 * The simulated journey.
 *
 * Run with: npm test
 *
 * Only the browser demo uses this, but it feeds the real detection rules — so
 * a simulation that produced a nonsense speed, or a path that never arrives,
 * would quietly break the thing it exists to demonstrate.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { TRIP_MS, metresBetween, pointAt, progressAt, speedBetween, startPointFor } from './simulation';

const HAIFA = { latitude: 32.7909, longitude: 34.9564 };
const TEL_AVIV = { latitude: 32.0836, longitude: 34.7981 };

test('the trip starts at the start and ends at the end', () => {
  assert.equal(progressAt(0), 0);
  assert.equal(progressAt(TRIP_MS), 1);
  assert.equal(progressAt(TRIP_MS * 5), 1, 'and does not overshoot past the end');
});

test('it eases rather than ramping, so the middle is the fast part', () => {
  const early = progressAt(TRIP_MS * 0.1);
  const middle = progressAt(TRIP_MS * 0.5) - progressAt(TRIP_MS * 0.4);
  const late = progressAt(TRIP_MS) - progressAt(TRIP_MS * 0.9);

  assert.ok(early < 0.1, 'it pulls away slowly');
  assert.ok(middle > late, 'and slows into the destination');
});

test('progress never goes backwards, so the low-water mark only falls', () => {
  let previous = -1;
  for (let ms = 0; ms <= TRIP_MS; ms += 500) {
    const p = progressAt(ms);
    assert.ok(p >= previous, `progress fell at ${ms}ms`);
    previous = p;
  }
});

test('the path interpolates between the two ends', () => {
  assert.deepEqual(pointAt(TEL_AVIV, HAIFA, 0), TEL_AVIV);
  assert.deepEqual(pointAt(TEL_AVIV, HAIFA, 1), HAIFA);

  const half = pointAt(TEL_AVIV, HAIFA, 0.5);
  assert.ok(half.latitude > TEL_AVIV.latitude && half.latitude < HAIFA.latitude);
});

test('speed comes out in metres per second, not degrees', () => {
  // Tel Aviv to Haifa is about 80 km. Covered in an hour, that is ~22 m/s.
  const mps = speedBetween(TEL_AVIV, HAIFA, 3_600);
  assert.ok(mps > 18 && mps < 26, `expected a plausible road speed, got ${mps}`);
});

test('a zero interval does not divide by zero', () => {
  assert.equal(speedBetween(TEL_AVIV, HAIFA, 0), 0);
});

test('the trip starts outside the gauge window, so the screen has somewhere to go', () => {
  // The gauge appears within ten radii. Starting inside it would skip the
  // transition the demo exists to show.
  for (const radiusM of [150, 300, 500, 1000, 2000]) {
    const start = startPointFor(HAIFA, radiusM);
    assert.ok(
      metresBetween(start, HAIFA) > radiusM * 10,
      `radius ${radiusM}: started at ${Math.round(metresBetween(start, HAIFA))}m`
    );
  }
});
