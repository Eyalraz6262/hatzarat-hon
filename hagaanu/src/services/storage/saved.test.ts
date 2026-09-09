/**
 * The saved-destinations rules.
 *
 * Run with: npm test
 *
 * This list is the one-tap path for the person who rides the same line every
 * morning. If the ordering is wrong they hunt for their commute; if the cap is
 * wrong the app throws away the trip they just saved.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { MAX_SAVED, orderSaved, savedId, withSaved, type SavedDestination } from './saved';

const at = (id: string, lastUsedAt: number, pinned = false): SavedDestination => ({
  id,
  name: id,
  kind: 'favourite',
  destination: { coords: { latitude: 32, longitude: 34 }, label: id },
  radiusM: 500,
  lastUsedAt,
  pinned,
});

test('leads with the most recently used', () => {
  const list = orderSaved([at('old', 1_000), at('new', 3_000), at('mid', 2_000)]);
  assert.deepEqual(list.map((i) => i.id), ['new', 'mid', 'old']);
});

test('a pinned route outranks a more recent unpinned one', () => {
  const list = orderSaved([at('yesterday', 3_000), at('commute', 1_000, true)]);
  assert.deepEqual(list.map((i) => i.id), ['commute', 'yesterday']);
});

test('pinned routes are ordered among themselves by last use', () => {
  const list = orderSaved([at('a', 1_000, true), at('b', 2_000, true), at('c', 9_000)]);
  assert.deepEqual(list.map((i) => i.id), ['b', 'a', 'c']);
});

test('does not mutate the list it was given', () => {
  const input = [at('a', 1_000), at('b', 2_000)];
  orderSaved(input);
  assert.deepEqual(input.map((i) => i.id), ['a', 'b']);
});

test('a new save lands at the front', () => {
  const next = withSaved([at('a', 1_000), at('b', 2_000)], at('fresh', 5_000));
  assert.equal(next[0].id, 'fresh');
  assert.equal(next.length, 3);
});

test('the cap drops the least recently used, not the newest', () => {
  const full = Array.from({ length: MAX_SAVED }, (_, i) => at(`old${i}`, i + 1));
  const next = withSaved(full, at('fresh', 99_999));

  assert.equal(next.length, MAX_SAVED);
  assert.equal(next[0].id, 'fresh');
  assert.ok(!next.some((i) => i.id === 'old0'), 'the stalest entry is the one to go');
});

test('the cap never drops a pinned route', () => {
  // Every slot but one taken by a pin, plus one stale unpinned entry.
  const full = [
    ...Array.from({ length: MAX_SAVED - 1 }, (_, i) => at(`pin${i}`, i + 1, true)),
    at('stale', 500),
  ];
  const next = withSaved(full, at('fresh', 99_999));

  assert.equal(next.length, MAX_SAVED);
  assert.equal(next.filter((i) => i.pinned).length, MAX_SAVED - 1, 'every pin survives');
  assert.ok(next.some((i) => i.id === 'fresh'));
  assert.ok(!next.some((i) => i.id === 'stale'));
});

test('a list full of pins still keeps the destination just saved', () => {
  // The one case the cap could eat the very thing the user asked to keep.
  const full = Array.from({ length: MAX_SAVED }, (_, i) => at(`pin${i}`, i + 1, true));
  const next = withSaved(full, at('fresh', 99_999));

  assert.equal(next.length, MAX_SAVED);
  assert.ok(next.some((i) => i.id === 'fresh'), 'the new save is never the one dropped');
  assert.ok(!next.some((i) => i.id === 'pin0'), 'the stalest pin gives up its slot instead');
});

test('re-saving an existing id replaces it rather than duplicating it', () => {
  const next = withSaved([at('a', 1_000), at('b', 2_000)], at('a', 9_000));
  assert.equal(next.filter((i) => i.id === 'a').length, 1);
  assert.equal(next[0].id, 'a');
});

test('ids do not collide within a millisecond, so delete hits the right entry', () => {
  const ids = new Set(Array.from({ length: 500 }, () => savedId(1_700_000_000_000)));
  assert.equal(ids.size, 500);
});
