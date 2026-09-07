/**
 * The stop-selection rules, on the kind of data OSM actually returns.
 *
 * Run with: npm test
 *
 * The network call is not tested here — it is a POST to a public endpoint and
 * mocking it would only assert that fetch was called. What is worth testing is
 * `selectStops`, because every rule in it exists to fix something the raw
 * Overpass result gets wrong, and a regression there shows up as a rail that
 * lists stops you already passed.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { selectStops, type OverpassElement } from './StopsService';
import { distanceMeters } from '../../utils/geo';

// A real corridor: Tel Aviv Savidor north to Haifa Hof HaCarmel, ~78 km.
const TEL_AVIV = { latitude: 32.0836, longitude: 34.7981 };
const HAIFA = { latitude: 32.7909, longitude: 34.9564 };
const ROUTE_M = distanceMeters(TEL_AVIV, HAIFA);

let nextId = 1;
function node(
  name: string,
  latitude: number,
  longitude: number,
  tags: Record<string, string> = { railway: 'station' }
): OverpassElement {
  return { type: 'node', id: nextId++, lat: latitude, lon: longitude, tags: { name, ...tags } };
}

test('keeps stops that lie between origin and destination, ordered by distance travelled', () => {
  const stops = selectStops(
    [
      node('בנימינה', 32.5157, 34.9494),
      node('נתניה', 32.3186, 34.8541),
      node('חדרה מערב', 32.4364, 34.9174),
    ],
    TEL_AVIV,
    HAIFA,
    ROUTE_M
  );

  assert.deepEqual(
    stops.map((s) => s.name),
    ['נתניה', 'חדרה מערב', 'בנימינה']
  );
});

test('drops a stop behind the origin', () => {
  // Lod is south-east of Tel Aviv: on this trip you are moving away from it.
  const stops = selectStops(
    [node('נתניה', 32.3186, 34.8541), node('לוד', 31.9467, 34.8903)],
    TEL_AVIV,
    HAIFA,
    ROUTE_M
  );

  assert.deepEqual(stops.map((s) => s.name), ['נתניה']);
});

test('drops a stop far off the corridor even when it is roughly on the way north', () => {
  // Beit Shean is at the same latitude band but ~40 km inland.
  const stops = selectStops(
    [node('נתניה', 32.3186, 34.8541), node('בית שאן', 32.4967, 35.4997)],
    TEL_AVIV,
    HAIFA,
    ROUTE_M
  );

  assert.deepEqual(stops.map((s) => s.name), ['נתניה']);
});

test('collapses the duplicate nodes OSM maps for each direction of a road', () => {
  const stops = selectStops(
    [
      node('נתניה מרכז', 32.3186, 34.8541, { highway: 'bus_stop' }),
      node('נתניה מרכז', 32.3188, 34.8544, { highway: 'bus_stop' }),
      node('נתניה מרכז', 32.3184, 34.8539, { highway: 'bus_stop' }),
    ],
    TEL_AVIV,
    HAIFA,
    ROUTE_M
  );

  assert.equal(stops.length, 1);
});

test('prefers rail over bus once there are at least two rail stops', () => {
  const stops = selectStops(
    [
      node('נתניה', 32.3186, 34.8541),
      node('בנימינה', 32.5157, 34.9494),
      node('צומת פועלים', 32.4, 34.88, { highway: 'bus_stop' }),
      node('צומת עולש', 32.45, 34.9, { highway: 'bus_stop' }),
    ],
    TEL_AVIV,
    HAIFA,
    ROUTE_M
  );

  assert.deepEqual(stops.map((s) => s.name), ['נתניה', 'בנימינה']);
});

test('falls back to bus stops when the route has no rail on it', () => {
  const stops = selectStops(
    [
      node('צומת פועלים', 32.4, 34.88, { highway: 'bus_stop' }),
      node('צומת עולש', 32.45, 34.9, { highway: 'bus_stop' }),
    ],
    TEL_AVIV,
    HAIFA,
    ROUTE_M
  );

  assert.equal(stops.length, 2);
  assert.ok(stops.every((s) => s.kind === 'bus'));
});

test('thins a long list by sampling along the route, not by truncating it', () => {
  // Twelve evenly spaced stops. Truncation would return the first seven and
  // stop two thirds of the way up, misrepresenting where the passenger is.
  const many = Array.from({ length: 12 }, (_, i) =>
    node(
      `תחנה ${i + 1}`,
      TEL_AVIV.latitude + ((HAIFA.latitude - TEL_AVIV.latitude) * (i + 1)) / 13,
      TEL_AVIV.longitude + ((HAIFA.longitude - TEL_AVIV.longitude) * (i + 1)) / 13
    )
  );

  const stops = selectStops(many, TEL_AVIV, HAIFA, ROUTE_M);

  assert.equal(stops.length, 7);
  assert.equal(stops[0].name, 'תחנה 1');
  assert.equal(stops[stops.length - 1].name, 'תחנה 12');
  // Strictly increasing, so the sample really is spread across the route.
  for (let i = 1; i < stops.length; i += 1) {
    assert.ok(stops[i].fromOriginM > stops[i - 1].fromOriginM);
  }
});

test('ignores elements with no name and reads a way through its center', () => {
  const stops = selectStops(
    [
      { type: 'node', id: 900, lat: 32.3186, lon: 34.8541, tags: { railway: 'station' } },
      { type: 'way', id: 901, center: { lat: 32.4364, lon: 34.9174 }, tags: { name: 'חדרה מערב', railway: 'station' } },
    ],
    TEL_AVIV,
    HAIFA,
    ROUTE_M
  );

  assert.deepEqual(stops.map((s) => s.name), ['חדרה מערב']);
});
