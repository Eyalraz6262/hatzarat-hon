import type { LatLng } from '../../types';
import { distanceMeters } from '../../utils/geo';
import type { PlaceKind } from './catalog';
import { normalize, proximityScore, withoutArticle } from './normalize';
import { COORD_SCALE, LAT_ORIGIN, LON_ORIGIN, STOPS, TOWNS } from './stops.generated';

/**
 * Searching 26,699 stops without making the keyboard stutter.
 *
 * The curated catalog next door is 110 entries and a linear scan over it costs
 * nothing. This is two hundred times that, and it is scanned on every
 * keystroke, so it needs both a cheaper representation and a way to avoid
 * looking at almost all of it.
 *
 * The representation is parallel typed arrays rather than 26,699 objects: one
 * string split, three typed arrays, no per-record allocation. The way to avoid
 * looking at all of it is an inverted index — every distinct word in every stop
 * name, sorted, with the stops it appears in. A term becomes a binary search
 * for a prefix range rather than a walk over the whole country.
 *
 * Both are built once, lazily, on the first search. Building costs a couple of
 * hundred milliseconds; doing it at startup would spend that on every launch
 * for a user who may never search at all.
 */

type Index = {
  names: string[];
  /**
   * The name and town normalised, space padded at both ends.
   *
   * Scoring used to normalise and split each candidate on every keystroke,
   * which is the whole cost of a broad query. Padded, a whole-word match is
   * `includes(' word ')` and a prefix match is `includes(' word')` — no regex,
   * no allocation, and cheap enough that a query too broad to narrow can just
   * scan the country rather than guess at a subset of it.
   */
  hay: string[];
  town: Uint16Array;
  lat: Float64Array;
  lon: Float64Array;
  /** Every distinct word across every name, sorted, for prefix search. */
  words: string[];
  /** For each word, the stops whose name or town contains it. */
  postings: Int32Array[];
};

let index: Index | null = null;

function build(): Index {
  const lines = STOPS.split('\n');
  const count = lines.length;

  const names = new Array<string>(count);
  const hay = new Array<string>(count);
  const town = new Uint16Array(count);
  const lat = new Float64Array(count);
  const lon = new Float64Array(count);

  const buckets = new Map<string, number[]>();
  const add = (word: string, at: number) => {
    const list = buckets.get(word);
    if (list) {
      // Names repeat a word ("הרצל/הרצל"), and so does the town on every one
      // of its stops. Only the last index can be a repeat, so this is enough.
      if (list[list.length - 1] !== at) list.push(at);
    } else {
      buckets.set(word, [at]);
    }
  };

  for (let i = 0; i < count; i++) {
    const line = lines[i];
    const a = line.indexOf('\t');
    const b = line.indexOf('\t', a + 1);
    const c = line.indexOf('\t', b + 1);

    const name = line.slice(0, a);
    const townAt = parseInt(line.slice(a + 1, b), 36);
    names[i] = name;
    town[i] = townAt;
    lat[i] = LAT_ORIGIN + parseInt(line.slice(b + 1, c), 36) / COORD_SCALE;
    lon[i] = LON_ORIGIN + parseInt(line.slice(c + 1), 36) / COORD_SCALE;

    const words = normalize(name).split(' ').filter(Boolean);
    const townWords = normalize(TOWNS[townAt] ?? '').split(' ').filter(Boolean);
    hay[i] = ` ${[...words, ...townWords].join(' ')} `;
    for (const word of words) add(word, i);
    for (const word of townWords) add(word, i);
  }

  const words = [...buckets.keys()].sort();
  const postings = words.map((word) => Int32Array.from(buckets.get(word)!));

  return { names, hay, town, lat, lon, words, postings };
}

function ensure(): Index {
  index ??= build();
  return index;
}

/**
 * Pay the build cost while the user is looking at the map rather than at a
 * spinner in the search field. Safe to call more than once.
 */
export function warmStops(): void {
  if (!index) setTimeout(ensure, 0);
}

/** First position where `word` could be inserted and keep `words` sorted. */
function lowerBound(words: string[], word: string): number {
  let lo = 0;
  let hi = words.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (words[mid] < word) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/**
 * When a term stops being worth indexing.
 *
 * A two-letter term can appear in thousands of names, and building a Set of
 * them costs more than the scan it was meant to save. Past this the index says
 * so rather than returning the first few thousand it happened to reach: those
 * would be whichever words sort earliest, which is a silent bias towards one
 * end of the alphabet and against whichever town the user is standing in.
 */
const TOO_BROAD = 4_000;

/**
 * The forms of a term worth looking up.
 *
 * The definite article is optional in the way people type, and the index holds
 * whichever form the operator wrote — so "מפרץ" has to reach "המפרץ" and
 * "הרצליה" has to keep its own ה. Both directions, same rule as the curated
 * catalog uses.
 */
function variants(term: string): string[] {
  const bare = withoutArticle(term);
  return bare ? [term, bare] : [term, `\u05d4${term}`];
}

/** `null` when nothing matches, `'all'` when the term is too broad to narrow. */
function candidates(idx: Index, term: string): Set<number> | 'all' | null {
  const found = new Set<number>();
  for (const form of variants(term)) {
    for (let w = lowerBound(idx.words, form); w < idx.words.length; w++) {
      if (!idx.words[w].startsWith(form)) break;
      for (const stop of idx.postings[w]) {
        found.add(stop);
        if (found.size > TOO_BROAD) return 'all';
      }
    }
  }
  return found.size > 0 ? found : null;
}

export type StopHit = {
  name: string;
  town: string;
  coords: LatLng;
  kind: PlaceKind;
  distanceM: number | null;
  score: number;
};

/**
 * A stop that names the railway is still a bus stop — it is the kerb outside
 * the station, not the platform, and the station itself is in the curated
 * catalog under its official name. The icon says which of the two you picked.
 */
function kindOf(name: string): PlaceKind {
  return /רכבת|רק"ל|רק״ל/.test(name) ? 'train' : 'bus';
}

/**
 * Rank the national stop list against already-parsed query terms.
 *
 * `terms` and `near` come from ./match, which owns the parsing — this is the
 * same vocabulary applied to a much bigger haystack.
 */
export function searchStops(
  terms: string[],
  near: LatLng | null,
  limit: number,
  kind: PlaceKind | null = null
): StopHit[] {
  if (terms.length === 0) return [];
  const idx = ensure();

  // Start from the rarest term: it is the one that narrows hardest, and every
  // other term is then a test on a small set rather than another scan. A term
  // too broad to narrow contributes nothing, and if every term is like that we
  // walk the whole index — bounded, and the same answer every time.
  let pool: Set<number> | null = null;
  for (const term of terms) {
    const found = candidates(idx, term);
    if (!found) return [];
    if (found === 'all') continue;
    if (!pool || found.size < pool.size) pool = found;
  }

  // Each term is tested against the padded haystack: ' word ' is a whole word,
  // ' word is a word that starts with it.
  const forms = terms.map(variants);

  const hits: StopHit[] = [];
  const consider = (at: number) => {
    const hay = idx.hay[at];

    let score = 0;
    for (const alternatives of forms) {
      let best = 0;
      for (const form of alternatives) {
        if (hay.includes(` ${form} `)) {
          best = 300;
          break;
        }
        if (hay.includes(` ${form}`)) best = 200;
      }
      if (best === 0) return;
      score += best;
    }

    const name = idx.names[at];
    const town = TOWNS[idx.town[at]] ?? '';

    const stopKind = kindOf(name);
    // Same weight the curated list gives it: saying "רכבת" should lift the
    // stops at the station above every other stop in the same town.
    if (kind && stopKind === kind) score += 150;

    const coords = { latitude: idx.lat[at], longitude: idx.lon[at] };
    const distanceM = near ? Math.round(distanceMeters(near, coords)) : null;

    score += proximityScore(distanceM);

    hits.push({ name, town, coords, kind: stopKind, distanceM, score });
  };

  if (pool) {
    for (const at of pool) consider(at);
  } else {
    for (let at = 0; at < idx.names.length; at++) consider(at);
  }

  // Name breaks a tie so the same query always returns the same list. Without
  // it the order falls out of the candidate set, which is insertion-ordered and
  // therefore an implementation detail.
  return hits
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, limit);
}

/** The nearest stop to a point, for snapping a tap on the map. */
export function nearestStop(coords: LatLng, withinM: number): StopHit | null {
  const idx = ensure();
  let best = -1;
  let bestM = Infinity;

  for (let i = 0; i < idx.names.length; i++) {
    // A cheap rectangle first: the full haversine on 26,699 stops is wasteful
    // when all but a handful are in another part of the country.
    if (Math.abs(idx.lat[i] - coords.latitude) > 0.01) continue;
    if (Math.abs(idx.lon[i] - coords.longitude) > 0.012) continue;
    const m = distanceMeters(coords, { latitude: idx.lat[i], longitude: idx.lon[i] });
    if (m < bestM) {
      bestM = m;
      best = i;
    }
  }

  if (best < 0 || bestM > withinM) return null;
  const town = TOWNS[idx.town[best]] ?? '';
  return {
    name: idx.names[best],
    town,
    coords: { latitude: idx.lat[best], longitude: idx.lon[best] },
    kind: kindOf(idx.names[best]),
    distanceM: Math.round(bestM),
    score: 0,
  };
}

/** How many places the index holds. Exposed for the tests and the about screen. */
export function stopCount(): number {
  return ensure().names.length;
}
