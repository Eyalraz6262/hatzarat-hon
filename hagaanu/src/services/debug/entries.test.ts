/**
 * The trip journal's rules.
 *
 * Run with: npm test
 *
 * These lines are the only record of what happened while the phone was locked
 * and the app was asleep. Losing them to a race between two JS contexts would
 * lose exactly the evidence the journal exists to keep.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { JOURNAL_MAX, ago, appendEntry, mergeEntries, stamp, type JournalEntry } from './entries';

const at = (ms: number, text: string): JournalEntry => ({ at: ms, kind: 'fix', text });

test('the newest line comes first', () => {
  const list = appendEntry([at(1, 'old')], at(2, 'new'));
  assert.deepEqual(list.map((e) => e.text), ['new', 'old']);
});

test('the cap drops the oldest, never the line just written', () => {
  // Newest-first, the order the list is always held in.
  const full = Array.from({ length: JOURNAL_MAX }, (_, i) => at(JOURNAL_MAX - i, `line ${i}`));
  const next = appendEntry(full, at(9_999, 'newest'));

  assert.equal(next.length, JOURNAL_MAX);
  assert.equal(next[0].text, 'newest');
  assert.ok(!next.some((e) => e.text === `line ${JOURNAL_MAX - 1}`), 'the tail is the oldest');
  assert.ok(next.some((e) => e.text === 'line 0'));
});

test('merging keeps lines only one side has', () => {
  // The real case: the background task wrote while the foreground app held a
  // copy from before it. Neither list may win outright.
  const foreground = [at(3, 'app resumed'), at(1, 'armed')];
  const background = [at(2, 'geofence enter'), at(1, 'armed')];

  const merged = mergeEntries(foreground, background);
  assert.deepEqual(merged.map((e) => e.text), ['app resumed', 'geofence enter', 'armed']);
});

test('merging does not duplicate the lines both sides have', () => {
  const shared = [at(1, 'armed'), at(2, 'fix')];
  assert.equal(mergeEntries(shared, [...shared]).length, 2);
});

test('two different lines written in the same millisecond both survive', () => {
  const merged = mergeEntries([at(5, 'one')], [at(5, 'two')]);
  assert.equal(merged.length, 2);
});

test('merging caps the result', () => {
  const a = Array.from({ length: JOURNAL_MAX }, (_, i) => at(i * 2, `a${i}`));
  const b = Array.from({ length: JOURNAL_MAX }, (_, i) => at(i * 2 + 1, `b${i}`));
  assert.equal(mergeEntries(a, b).length, JOURNAL_MAX);
});

test('ages read the way a tester would say them out loud', () => {
  assert.equal(ago(0), '0s');
  assert.equal(ago(45_000), '45s');
  assert.equal(ago(90_000), '1m 30s');
  assert.equal(ago(3_600_000), '1h 0m');
  assert.equal(ago(-5), '0s', 'a clock that stepped backwards is not a negative age');
});

test('timestamps are zero-padded, so the column stays straight', () => {
  const noon = new Date(2026, 0, 1, 9, 5, 7).getTime();
  assert.equal(stamp(noon), '09:05:07');
});
