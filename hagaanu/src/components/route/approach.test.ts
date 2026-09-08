/**
 * The approach model.
 *
 * Run with: npm test
 *
 * These rules decide what the armed screen claims. The version this replaced
 * claimed "3 stops to go" from a list of transit stops near the straight line
 * to the destination — which said nothing about whether the vehicle stopped at
 * any of them. Everything asserted below is either measured or arithmetic on
 * something measured.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { buildApproach, gaugeWindowM, phaseOf, positionOf } from './approach';

const HAIFA = { coords: { latitude: 32.7909, longitude: 34.9564 }, label: 'חיפה חוף הכרמל' };
const ATLIT = { coords: { latitude: 32.6885, longitude: 34.9425 }, label: 'עתלית' };
const TEL_AVIV = { latitude: 32.0836, longitude: 34.7981 };

test('most of a trip is "far", which is the state the screen stays quiet in', () => {
  assert.equal(phaseOf(54_000, 500), 'far');
  assert.equal(phaseOf(6_000, 500), 'far');
});

test('the gauge appears only once the wake ring is a readable part of it', () => {
  // At exactly ten radii the ring is a tenth of the height. Wider than that and
  // it would be drawn as a hairline, which is worse than not drawing it.
  assert.equal(phaseOf(5_000, 500), 'closing');
  assert.equal(phaseOf(5_001, 500), 'far');
  assert.equal(gaugeWindowM(500), 5_000);
});

test('"arriving" allows a little more than the radius', () => {
  // A fix reported at 530 m with the ring at 500 m is, in practice, arriving.
  // Being pedantic here would leave the screen saying "closing" while the
  // alarm is already going off.
  assert.equal(phaseOf(500, 500), 'arriving');
  assert.equal(phaseOf(535, 500), 'arriving');
  assert.equal(phaseOf(700, 500), 'closing');
});

test('no fix means far, never a guessed position', () => {
  assert.equal(phaseOf(null, 500), 'far');
  const approach = buildApproach(null, HAIFA, 500);
  assert.equal(approach.hereM, null);
  assert.equal(approach.herePosition, null);
});

test('the destination sits at the bottom of the gauge and the window at the top', () => {
  assert.equal(positionOf(0, 5_000), 1);
  assert.equal(positionOf(5_000, 5_000), 0);
  assert.equal(positionOf(2_500, 5_000), 0.5);
});

test('a distance beyond the window clamps to the top instead of running off it', () => {
  assert.equal(positionOf(50_000, 5_000), 0);
  assert.equal(positionOf(-10, 5_000), 1, 'and past the destination pins to the bottom');
});

test('a plain journey has one mark, at the destination itself', () => {
  const approach = buildApproach(TEL_AVIV, HAIFA, 500);

  assert.equal(approach.marks.length, 1);
  assert.equal(approach.marks[0].atM, 0);
  assert.equal(approach.marks[0].label, 'חיפה חוף הכרמל');
});

test('the gauge scales to the leg being watched, not to the whole journey', () => {
  // Armed on the transfer at Atlit, with Haifa still to come. The number that
  // decides whether you can keep sleeping is the distance to Atlit.
  const approach = buildApproach(TEL_AVIV, ATLIT, 500, [{ destination: HAIFA, radiusM: 500 }]);

  assert.ok(approach.hereM !== null && approach.finalM !== null);
  assert.ok(approach.hereM < approach.finalM, 'the transfer comes first');
  assert.equal(approach.windowM, 5_000);
});

test('a journey with a change draws both marks, ordered by distance to the end', () => {
  const approach = buildApproach(TEL_AVIV, ATLIT, 500, [{ destination: HAIFA, radiusM: 500 }]);

  assert.deepEqual(approach.marks.map((m) => m.label), ['עתלית', 'חיפה חוף הכרמל']);
  assert.ok(approach.marks[0].atM > 0, 'the transfer is short of the end');
  assert.equal(approach.marks[1].atM, 0, 'the destination is the end');
});

test('a tighter ring means a tighter window, so the screen zooms as you close in', () => {
  assert.equal(gaugeWindowM(150), 1_500);
  assert.equal(gaugeWindowM(2_000), 20_000);

  // The same position reads differently against a different ring, which is the
  // point: the gauge is about the warning you will get, not about the map.
  // 1.4 km out is nearly there on a 2 km ring and nowhere near it on a 150 m one.
  assert.equal(phaseOf(1_400, 2_000), 'arriving');
  assert.equal(phaseOf(1_400, 150), 'closing');
  assert.equal(phaseOf(1_600, 150), 'far');
});
