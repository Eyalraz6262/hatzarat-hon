/**
 * Settings normalisation.
 *
 * Run with: npm test
 *
 * Every one of these cases is a value that could genuinely be on disk: written
 * by an older build, half-written when the process died, or corrupted. The
 * rule under test is that none of them can produce a settings object that
 * silences the alarm or crashes a screen.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { DEFAULT_SETTINGS, normaliseSettings as normalise } from './settings';

test('empty, null and garbage input all give the defaults', () => {
  assert.deepEqual(normalise(undefined), DEFAULT_SETTINGS);
  assert.deepEqual(normalise(null), DEFAULT_SETTINGS);
  assert.deepEqual(normalise({}), DEFAULT_SETTINGS);
  assert.deepEqual(normalise({ soundId: 'trombone', theme: 'neon' }), DEFAULT_SETTINGS);
});

test('an unknown sound id falls back to a real tone rather than to none', () => {
  assert.equal(normalise({ soundId: 'removed-in-v2' }).soundId, DEFAULT_SETTINGS.soundId);
  assert.equal(normalise({ soundId: null }).soundId, DEFAULT_SETTINGS.soundId);
});

test('every shipped sound id survives a round trip', () => {
  for (const id of ['soft', 'normal', 'sharp'] as const) {
    assert.equal(normalise({ soundId: id }).soundId, id);
  }
});

test('volume is clamped into a range that is always audible', () => {
  assert.equal(normalise({ volume: 0 }).volume, 0.2);
  assert.equal(normalise({ volume: -5 }).volume, 0.2);
  assert.equal(normalise({ volume: 9 }).volume, 1);
  assert.equal(normalise({ volume: 0.55 }).volume, 0.55);
  assert.equal(normalise({ volume: 'loud' as unknown as number }).volume, DEFAULT_SETTINGS.volume);
  assert.equal(normalise({ volume: NaN }).volume, DEFAULT_SETTINGS.volume);
});

test('a radius that is not one of the presets is rejected', () => {
  assert.equal(normalise({ defaultRadiusM: 1000 }).defaultRadiusM, 1000);
  // 437 is what a slider would have produced. There is no slider, so it is stale.
  assert.equal(normalise({ defaultRadiusM: 437 }).defaultRadiusM, DEFAULT_SETTINGS.defaultRadiusM);
  assert.equal(normalise({ defaultRadiusM: 0 }).defaultRadiusM, DEFAULT_SETTINGS.defaultRadiusM);
});

test('language is null for anything not shipped, meaning follow the device', () => {
  assert.equal(normalise({ language: 'he' }).language, 'he');
  assert.equal(normalise({ language: 'ar' }).language, 'ar');
  assert.equal(normalise({ language: 'de' }).language, null);
  assert.equal(normalise({}).language, null);
});

test('booleans are taken only when they really are booleans', () => {
  assert.equal(normalise({ vibrate: false }).vibrate, false);
  // "false" from a bad JSON round trip must not read as true.
  assert.equal(normalise({ vibrate: 'false' as unknown as boolean }).vibrate, true);
  assert.equal(normalise({ demoSeen: true }).demoSeen, true);
});

test('a partial object keeps what it has and defaults the rest', () => {
  const s = normalise({ soundId: 'sharp', vibrate: false });
  assert.equal(s.soundId, 'sharp');
  assert.equal(s.vibrate, false);
  assert.equal(s.volume, DEFAULT_SETTINGS.volume);
  assert.equal(s.theme, DEFAULT_SETTINGS.theme);
});
