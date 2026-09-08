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

/* ── transfers ───────────────────────────────────────────────────── */

const LOD = { coords: { latitude: 31.9482, longitude: 34.8797 }, label: 'לוד' };

test('a transfer lands between the stops, by its own distance to the destination', () => {
  // Tel Aviv to Haifa, changing at Netanya. Netanya is 54 km from Haifa, so it
  // belongs after the stop 78 km out and before the one 39 km out.
  const netanya = { coords: { latitude: 32.3186, longitude: 34.8541 }, label: 'נתניה' };
  const rail = buildRail(LINE, { latitude: 32.0836, longitude: 34.7981 }, HAIFA, 500, netanya);

  const named = rail.items
    .filter((i) => i.kind === 'stop' || i.kind === 'transfer' || i.kind === 'destination')
    .map((i) => (i as { name: string }).name);

  assert.deepEqual(named, ['נתניה', 'נתניה', 'חדרה מערב', 'בנימינה', 'עתלית', 'חיפה חוף הכרמל']);
});

test('a journey with a change has two wake points, the transfer first', () => {
  const rail = buildRail([], { latitude: 32.0836, longitude: 34.7981 }, HAIFA, 500, LOD, 300);
  const wakes = rail.items.filter((i) => i.kind === 'wake');

  assert.equal(wakes.length, 2);
  assert.equal(wakes[0].id, 'wake-transfer');
  assert.equal(wakes[0].remainingM, 300, 'the transfer keeps its own radius');
  assert.equal(wakes[1].id, 'wake-final');
  assert.equal(wakes[1].remainingM, 500);
});

test('the transfer sits immediately before its own wake marker', () => {
  const rail = buildRail(LINE, { latitude: 32.0836, longitude: 34.7981 }, HAIFA, 500, LOD);
  const order = rail.items.map((i) => i.kind);
  const at = order.indexOf('transfer');

  assert.ok(at >= 0, 'the transfer must appear');
  assert.equal(order[at + 1], 'wake');
});

test('a journey with no change has exactly one wake point', () => {
  const rail = buildRail(LINE, { latitude: 32.0836, longitude: 34.7981 }, HAIFA, 500);
  assert.equal(rail.items.filter((i) => i.kind === 'wake').length, 1);
  assert.ok(!rail.items.some((i) => i.kind === 'transfer'));
});
