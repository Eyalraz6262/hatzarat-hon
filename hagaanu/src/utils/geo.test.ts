/**
 * Sanity checks for the distance maths the alarm depends on.
 *
 * Run with: npm test
 *
 * These are deliberately about *correctness of the trigger*, not formatting:
 * an error here means the alarm fires at the wrong place, which is the only
 * bug in this app that actually matters.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { distanceMeters, regionForRadius, sameCoords } from './geo';
import { POLLING_TIERS } from '../constants/config';

// Two real Israeli railway stations, ~54 km apart.
const TEL_AVIV_SAVIDOR = { latitude: 32.0836, longitude: 34.7981 };
const HAIFA_HOF_HACARMEL = { latitude: 32.7909, longitude: 34.9564 };

test('distance between two known stations is within 1% of the real value', () => {
  const d = distanceMeters(TEL_AVIV_SAVIDOR, HAIFA_HOF_HACARMEL);
  // Great-circle distance is ~79.6 km; allow 1% for coordinate precision.
  assert.ok(d > 78_800 && d < 80_400, `expected ~79.6km, got ${Math.round(d)}m`);
});

test('distance is zero for identical points and symmetric otherwise', () => {
  assert.equal(distanceMeters(TEL_AVIV_SAVIDOR, TEL_AVIV_SAVIDOR), 0);
  assert.ok(
    Math.abs(
      distanceMeters(TEL_AVIV_SAVIDOR, HAIFA_HOF_HACARMEL) -
        distanceMeters(HAIFA_HOF_HACARMEL, TEL_AVIV_SAVIDOR)
    ) < 1e-6
  );
});

test('one degree of latitude is ~111 km anywhere', () => {
  const d = distanceMeters({ latitude: 32, longitude: 34.8 }, { latitude: 33, longitude: 34.8 });
  assert.ok(Math.abs(d - 111_195) < 500, `got ${Math.round(d)}m`);
});

test('a 500m radius resolves to a region that contains the whole circle', () => {
  const region = regionForRadius(TEL_AVIV_SAVIDOR, 500);
  // Half the latitude span, in meters, must exceed the radius.
  const halfSpanM = (region.latitudeDelta / 2) * 111_195;
  assert.ok(halfSpanM > 500, `region too tight: ${Math.round(halfSpanM)}m for a 500m radius`);
  // Longitude delta is widened by 1/cos(lat) so the circle stays circular.
  assert.ok(region.longitudeDelta > region.latitudeDelta);
});

test('sameCoords tolerates sub-meter jitter but not a real move', () => {
  assert.ok(sameCoords(TEL_AVIV_SAVIDOR, { ...TEL_AVIV_SAVIDOR, latitude: 32.083600001 }));
  assert.ok(!sameCoords(TEL_AVIV_SAVIDOR, { ...TEL_AVIV_SAVIDOR, latitude: 32.0846 }));
  assert.ok(!sameCoords(TEL_AVIV_SAVIDOR, null));
});

test('polling tiers cover every distance without a gap', () => {
  // Every tier must be reachable, and the last one must be a catch-all —
  // otherwise a long-distance trip would find no tier and never sample.
  const sorted = [...POLLING_TIERS].sort((a, b) => a.maxDistanceM - b.maxDistanceM);
  assert.deepEqual(sorted, POLLING_TIERS, 'tiers must be ordered nearest-first');
  assert.equal(POLLING_TIERS[POLLING_TIERS.length - 1].maxDistanceM, Number.POSITIVE_INFINITY);

  for (const distance of [0, 100, 2999, 3000, 3001, 11_999, 12_001, 500_000]) {
    const tier = POLLING_TIERS.find((candidate) => distance <= candidate.maxDistanceM);
    assert.ok(tier, `no tier for ${distance}m`);
  }
});

test('closer tiers sample more often than distant ones', () => {
  for (let i = 1; i < POLLING_TIERS.length; i += 1) {
    assert.ok(
      POLLING_TIERS[i].distanceInterval > POLLING_TIERS[i - 1].distanceInterval,
      'a further tier must sample more coarsely, or the battery budget is wrong'
    );
  }
});
