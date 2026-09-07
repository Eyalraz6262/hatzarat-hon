import type { LatLng } from '../../types';
import { distanceMeters } from '../../utils/geo';
import { log } from '../../utils/logger';

/**
 * The stops between you and your destination.
 *
 * This is what makes the route rail worth building: "three stops to go" is
 * information a passenger can act on, and "4.3 km to go" is not. Everything
 * else in this app is a distance calculation; this file is the one place that
 * turns distance into stops.
 *
 * SOURCE: OpenStreetMap via Overpass. Chosen deliberately over the two
 * alternatives:
 *
 *   - Google Places / Nearby Search would need an API key with billing
 *     enabled, and the brief for this app says not to introduce one.
 *   - Israel's Ministry of Transport publishes a full GTFS feed, which is the
 *     better long-term source, but it is a ~100MB static archive that has to
 *     be processed and hosted somewhere. That is a backend, and this app does
 *     not have one.
 *
 * Overpass is free, needs no key and no account, and Israel's rail stations
 * are complete in OSM. Bus stops are good in cities and patchier on
 * intercity routes, which is exactly why `fetchStopsAlongRoute` degrades
 * rather than fails: the rail falls back to distance milestones and says so.
 *
 * NETWORK POSTURE: this is called ONCE, when the user arms, while they still
 * have signal and attention. The result is cached with the alarm. Once armed,
 * the alarm never touches the network again — arrival detection is the OS
 * geofence and the local position stream, and neither knows this file exists.
 */

export type TransitStop = {
  id: string;
  name: string;
  coords: LatLng;
  kind: 'rail' | 'bus' | 'light-rail';
  /** Metres from the user's position at the time the corridor was built. */
  fromOriginM: number;
};

export type StopsResult =
  | { ok: true; stops: TransitStop[] }
  /**
   * The rail still renders — it just shows distance milestones instead of
   * names. `reason` is surfaced to the user, because an app that quietly
   * shows less than it promised is worse than one that says why.
   */
  | { ok: false; reason: 'offline' | 'none-found' | 'too-far' };

/** Public Overpass instances, tried in order. No key, no account. */
const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

const REQUEST_TIMEOUT_MS = 9_000;

/** Beyond this the corridor query gets slow and the stop list stops being useful. */
const MAX_ROUTE_M = 120_000;

/** How far off the straight line a stop may sit and still count as "on the way". */
const CORRIDOR_M = 450;

/** More than this and the rail becomes a list to scroll, which defeats the point. */
const MAX_STOPS = 7;

/**
 * Stops between `origin` and `destination`, ordered origin-first.
 *
 * The query is a corridor, not a bounding box: `around:` along a two-point
 * line keeps a stop 400m off the route and drops one 3km away that a box
 * around the same two points would happily include.
 */
export async function fetchStopsAlongRoute(
  origin: LatLng,
  destination: LatLng
): Promise<StopsResult> {
  const routeM = distanceMeters(origin, destination);
  if (routeM > MAX_ROUTE_M) return { ok: false, reason: 'too-far' };

  const query = corridorQuery(origin, destination, CORRIDOR_M);

  for (const endpoint of ENDPOINTS) {
    try {
      const elements = await postOverpass(endpoint, query);
      const stops = selectStops(elements, origin, destination, routeM);
      if (stops.length === 0) return { ok: false, reason: 'none-found' };
      return { ok: true, stops };
    } catch (error) {
      log.warn('stops', 'endpoint failed: ' + endpoint, error);
      // Fall through to the next mirror.
    }
  }

  return { ok: false, reason: 'offline' };
}

/* ------------------------------------------------------------------ *
 * The query
 * ------------------------------------------------------------------ */

/**
 * Overpass QL for "transit stops within `radius` of the line origin→destination".
 *
 * `around:r,lat1,lon1,lat2,lon2` takes a polyline, so two points describe the
 * corridor. Both node and way forms are asked for because OSM maps a large
 * station as a way (the building) and a bus stop as a node; `out center`
 * gives a way a single coordinate so both come back in one shape.
 */
function corridorQuery(a: LatLng, b: LatLng, radius: number): string {
  const line = `${a.latitude},${a.longitude},${b.latitude},${b.longitude}`;
  return `[out:json][timeout:20];
(
  node(around:${radius},${line})["railway"="station"];
  node(around:${radius},${line})["railway"="halt"];
  way(around:${radius},${line})["railway"="station"];
  node(around:${radius},${line})["railway"="tram_stop"];
  node(around:${radius},${line})["highway"="bus_stop"]["name"];
  node(around:${radius},${line})["public_transport"="station"]["name"];
);
out center tags 400;`;
}

async function postOverpass(endpoint: string, query: string): Promise<OverpassElement[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`overpass ${response.status}`);
    const json = (await response.json()) as { elements?: OverpassElement[] };
    return json.elements ?? [];
  } finally {
    clearTimeout(timer);
  }
}

export type OverpassElement = {
  type: 'node' | 'way';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

/* ------------------------------------------------------------------ *
 * Ranking
 * ------------------------------------------------------------------ */

/**
 * Turns a bag of OSM elements into the handful of stops worth drawing.
 *
 * Three things happen here and each one exists because the raw result is not
 * usable as-is:
 *
 *  1. A stop is kept only if it is genuinely BETWEEN origin and destination.
 *     `around:` on a polyline also matches points behind the origin, and a
 *     rail showing a stop you already passed reads as a bug.
 *  2. Stops are de-duplicated by name. OSM maps each direction of a road as
 *     its own bus stop node, so a single stop on a highway is two or four
 *     nodes with the same name a few metres apart.
 *  3. Rail beats bus when both are present. On an intercity trip the bus
 *     stops are noise; on a city trip there is no rail and the buses are the
 *     whole list.
 */
export function selectStops(
  elements: OverpassElement[],
  origin: LatLng,
  destination: LatLng,
  routeM: number
): TransitStop[] {
  const seen = new Set<string>();
  const candidates: TransitStop[] = [];

  for (const element of elements) {
    const name = element.tags?.name?.trim();
    if (!name) continue;

    const lat = element.lat ?? element.center?.lat;
    const lon = element.lon ?? element.center?.lon;
    if (lat === undefined || lon === undefined) continue;

    const coords = { latitude: lat, longitude: lon };
    const fromOriginM = distanceMeters(origin, coords);
    const toDestM = distanceMeters(coords, destination);

    // Between, not behind. The 1.25 slack allows for a route that curves —
    // a stop on a bend is legitimately further than the straight line.
    if (fromOriginM + toDestM > routeM * 1.25) continue;

    // Not the endpoints themselves.
    if (fromOriginM < 250 || toDestM < 250) continue;

    const key = name.replace(/\s+/g, ' ').toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    candidates.push({ id: `${element.type}/${element.id}`, name, coords, kind: kindOf(element), fromOriginM });
  }

  const rail = candidates.filter((s) => s.kind !== 'bus');
  const pool = rail.length >= 2 ? rail : candidates;

  pool.sort((a, b) => a.fromOriginM - b.fromOriginM);
  return thinTo(pool, MAX_STOPS);
}

function kindOf(element: OverpassElement): TransitStop['kind'] {
  const tags = element.tags ?? {};
  if (tags.railway === 'tram_stop' || tags.light_rail === 'yes') return 'light-rail';
  if (tags.highway === 'bus_stop') return 'bus';
  return 'rail';
}

/**
 * Keeps `max` stops spread evenly along the route rather than the first `max`.
 *
 * Truncating would show four stops clustered around the origin and then a
 * jump to the destination, which misrepresents the journey. Sampling by
 * position keeps the rail honest about where you are along it.
 */
function thinTo<T>(items: T[], max: number): T[] {
  if (items.length <= max) return items;
  const step = (items.length - 1) / (max - 1);
  const out: T[] = [];
  for (let i = 0; i < max; i += 1) out.push(items[Math.round(i * step)]);
  return out;
}
