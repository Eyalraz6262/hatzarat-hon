/**
 * Guards the Israel-specific constants.
 *
 * These numbers were written by hand, and a wrong bound is not a cosmetic bug:
 * too tight and real addresses vanish from search, too loose and "הרצל" returns
 * a street in Vienna. So they are checked against the actual extremes of the
 * country and against cities the app will really be used in.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { FALLBACK_REGION, ISRAEL_BOUNDS } from './config';

/** Well-known coordinates, north to south. */
const CITIES = {
  metula: { latitude: 33.2789, longitude: 35.5786 }, // northernmost town
  nahariya: { latitude: 33.0059, longitude: 35.0949 },
  haifa: { latitude: 32.794, longitude: 34.9896 },
  telAviv: { latitude: 32.0853, longitude: 34.7818 },
  jerusalem: { latitude: 31.7683, longitude: 35.2137 },
  beerSheva: { latitude: 31.253, longitude: 34.7915 },
  eilat: { latitude: 29.5581, longitude: 34.9482 }, // southernmost city
  katzrin: { latitude: 32.9925, longitude: 35.6892 }, // Golan, eastern edge
};

const inBounds = (c: { latitude: number; longitude: number }) =>
  c.latitude >= ISRAEL_BOUNDS.minLatitude &&
  c.latitude <= ISRAEL_BOUNDS.maxLatitude &&
  c.longitude >= ISRAEL_BOUNDS.minLongitude &&
  c.longitude <= ISRAEL_BOUNDS.maxLongitude;

test('the service-area box contains every corner of the country', () => {
  for (const [name, coords] of Object.entries(CITIES)) {
    assert.ok(inBounds(coords), `${name} falls outside ISRAEL_BOUNDS`);
  }
});

test('the box rejects the far-away matches the filter exists to catch', () => {
  // These are the real failure mode: a Hebrew or transliterated street name that
  // the platform geocoder also finds on another continent.
  const outside = {
    vienna: { latitude: 48.2082, longitude: 16.3738 },
    london: { latitude: 51.5072, longitude: -0.1276 },
    newYork: { latitude: 40.7128, longitude: -74.006 },
    cairo: { latitude: 30.0444, longitude: 31.2357 },
    nicosia: { latitude: 35.1856, longitude: 33.3823 },
    beirut: { latitude: 33.8938, longitude: 35.5018 },
    amman: { latitude: 31.9454, longitude: 35.9284 },
  };
  for (const [name, coords] of Object.entries(outside)) {
    assert.ok(!inBounds(coords), `${name} wrongly counts as inside the service area`);
  }
});

test('a rectangle cannot separate immediate neighbours, and does not pretend to', () => {
  // Irbid is 25 km from the Israeli border, so it falls inside the box. This is
  // documented behaviour, not a bug — the filter ranks by plausibility, and a
  // town you can see from the Galilee is a plausible thing to have searched for.
  const irbid = { latitude: 32.5556, longitude: 35.85 };
  assert.ok(inBounds(irbid));
});

test('the fallback map region frames the whole country', () => {
  const north = FALLBACK_REGION.latitude + FALLBACK_REGION.latitudeDelta / 2;
  const south = FALLBACK_REGION.latitude - FALLBACK_REGION.latitudeDelta / 2;
  const east = FALLBACK_REGION.longitude + FALLBACK_REGION.longitudeDelta / 2;
  const west = FALLBACK_REGION.longitude - FALLBACK_REGION.longitudeDelta / 2;

  assert.ok(north > CITIES.metula.latitude, 'fallback region cuts off the north');
  assert.ok(south < CITIES.eilat.latitude, 'fallback region cuts off Eilat');
  assert.ok(east > CITIES.katzrin.longitude, 'fallback region cuts off the Golan');
  assert.ok(west < CITIES.telAviv.longitude, 'fallback region cuts off the coast');
});
