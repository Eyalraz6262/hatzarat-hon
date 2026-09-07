/**
 * The rail's ordering rules.
 *
 * Run with: npm test
 *
 * This is the screen's whole claim: "these are the stops between you and your
 * destination, and this is how many are left". If the ordering is wrong the
 * app is lying to a sleeping passenger, which is worse than showing nothing.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { buildRail } from './rail';
import type { TransitStop } from '../../services/transit/StopsService';

const HAIFA = { coords: { latitude: 32.7909, longitude: 34.9564 }, label: 'חיפה חוף הכרמל' };

/** Real stations on the Tel Aviv → Haifa line, listed south to north. */
const LINE: TransitStop[] = [
  { id: 'a', name: 'נתניה', coords: { latitude: 32.3186, longitude: 34.8541 }, kind: 'rail', fromOriginM: 0 },
  { id: 'b', name: 'חדרה מערב', coords: { latitude: 32.4364, longitude: 34.9174 }, kind: 'rail', fromOriginM: 0 },
  { id: 'c', name: 'בנימינה', coords: { latitude: 32.5157, longitude: 34.9494 }, kind: 'rail', fromOriginM: 0 },
  { id: 'd', name: 'עתלית', coords: { latitude: 32.6885, longitude: 34.9425 }, kind: 'rail', fromOriginM: 0 },
];

const kinds = (r: ReturnType<typeof buildRail>) => r.items.map((i) => i.kind);
const names = (r: ReturnType<typeof buildRail>) =>
  r.items.filter((i) => i.kind === 'stop').map((i) => (i as { name: string }).name);

test('orders stops by distance remaining, so the destination is always last', () => {
  const rail = buildRail(LINE, { latitude: 32.0836, longitude: 34.7981 }, HAIFA, 500);

  assert.deepEqual(names(rail), ['נתניה', 'חדרה מערב', 'בנימינה', 'עתלית']);
  assert.equal(rail.items[rail.items.length - 1].kind, 'destination');
  assert.equal(rail.items[rail.items.length - 2].kind, 'wake');
});

test('places "you are here" before the first stop still ahead', () => {
  // Just north of Hadera: Netanya and Hadera are behind, Binyamina is ahead.
  const rail = buildRail(LINE, { latitude: 32.46, longitude: 34.925 }, HAIFA, 500);

  const order = kinds(rail);
  const here = order.indexOf('here');
  const railNames = rail.items.filter((i) => i.kind === 'stop').map((i) => (i as { name: string }).name);

  assert.equal(railNames[here - 2], 'נתניה');
  assert.equal(rail.items[here + 1].kind, 'stop');
  assert.equal((rail.items[here + 1] as { name: string }).name, 'בנימינה');
});

test('marks the stops behind the passenger as passed and the ones ahead as not', () => {
  const rail = buildRail(LINE, { latitude: 32.46, longitude: 34.925 }, HAIFA, 500);
  const byName = Object.fromEntries(
    rail.items.filter((i) => i.kind === 'stop').map((i) => [(i as { name: string }).name, i as { passed: boolean }])
  );

  assert.equal(byName['נתניה'].passed, true);
  assert.equal(byName['חדרה מערב'].passed, true);
  assert.equal(byName['בנימינה'].passed, false);
  assert.equal(byName['עתלית'].passed, false);
});

test('counts only the stops still ahead of the passenger', () => {
  const start = buildRail(LINE, { latitude: 32.0836, longitude: 34.7981 }, HAIFA, 500);
  const midway = buildRail(LINE, { latitude: 32.46, longitude: 34.925 }, HAIFA, 500);
  const nearly = buildRail(LINE, { latitude: 32.75, longitude: 34.95 }, HAIFA, 500);

  assert.equal(start.stopsToGo, 4);
  assert.equal(midway.stopsToGo, 2);
  assert.equal(nearly.stopsToGo, 0);
});

test('hides a stop that already sits inside the wake ring', () => {
  // Atlit is ~11 km out, so a 15 km radius swallows it: the alarm covers that
  // stretch already and listing it as "still to come" would be wrong.
  const rail = buildRail(LINE, { latitude: 32.0836, longitude: 34.7981 }, HAIFA, 15_000);

  assert.ok(!names(rail).includes('עתלית'));
  assert.deepEqual(names(rail), ['נתניה', 'חדרה מערב', 'בנימינה']);
});

test('still renders you, the wake point and the destination with no stops at all', () => {
  const rail = buildRail([], { latitude: 32.0836, longitude: 34.7981 }, HAIFA, 500);

  assert.deepEqual(kinds(rail), ['here', 'wake', 'destination']);
  assert.equal(rail.stopsToGo, 0);
});

test('omits the here marker before the first fix instead of guessing a position', () => {
  const rail = buildRail(LINE, null, HAIFA, 500);

  assert.ok(!kinds(rail).includes('here'));
  assert.equal(rail.stopsToGo, null);
  assert.deepEqual(names(rail), ['נתניה', 'חדרה מערב', 'בנימינה', 'עתלית']);
});

test('puts the here marker last when every stop is behind the passenger', () => {
  const rail = buildRail(LINE, { latitude: 32.76, longitude: 34.95 }, HAIFA, 500);
  const order = kinds(rail);

  assert.equal(order[order.length - 3], 'here');
  assert.equal(order[order.length - 2], 'wake');
  assert.equal(order[order.length - 1], 'destination');
});
