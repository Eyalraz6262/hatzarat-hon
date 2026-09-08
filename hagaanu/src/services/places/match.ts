import type { LatLng } from '../../types';
import { distanceMeters } from '../../utils/geo';
import { PLACES, type Place, type PlaceKind } from './catalog';

/**
 * Ranking a typed query against the bundled catalog.
 *
 * Pure: no React, no expo, no I/O. Everything here is unit tested, because the
 * behaviour that matters — "תחנת רכבת משה דיין" finding a station whose actual
 * name is "ראשון לציון - משה דיין" — is entirely in the normalisation rules,
 * and those are the kind of thing that quietly rots.
 */

export type PlaceHit = {
  place: Place;
  /** Metres from the user, when we know where they are. */
  distanceM: number | null;
};

/**
 * Words that describe a *category* rather than name a place.
 *
 * People type what a place is as well as what it is called — "תחנת רכבת משה
 * דיין", "אצטדיון סמי עופר". The catalog stores only the name, so these words
 * would match nothing and sink the query. Instead each one is dropped from the
 * terms that must match and, where it is unambiguous, read as a hint about
 * which kind of place is wanted.
 */
const KIND_WORDS: Record<string, PlaceKind> = {
  רכבת: 'train',
  הרכבת: 'train',
  אוטובוס: 'bus',
  מרכזית: 'bus',
  אצטדיון: 'stadium',
  איצטדיון: 'stadium',
  היכל: 'stadium',
  קניון: 'mall',
  אוניברסיטת: 'campus',
  אוניברסיטה: 'campus',
  האוניברסיטה: 'campus',
  מכללת: 'campus',
  קמפוס: 'campus',
  חולים: 'hospital',
  בילינסון: 'hospital',
  תעופה: 'airport',
  train: 'train',
  station: 'train',
  bus: 'bus',
  stadium: 'stadium',
  mall: 'mall',
  university: 'campus',
  hospital: 'hospital',
  airport: 'airport',
};

/** Dropped from the query, and never a hint — too ambiguous to mean anything. */
const FILLER = new Set([
  'תחנת',
  'כדורגל',
  'football',
  'soccer',
  'תחנה',
  'התחנה',
  'בית',
  'שדה',
  'נמל',
  'של',
  'the',
  'of',
  'at',
]);

/** Hebrew points and cantillation, plus the marks people type inconsistently. */
const MARKS = /[֑-ׇ׳״'"`׳״]/g;
const SEPARATORS = /[-–—_,.()[\]/\\]+/g;

export function normalize(text: string): string {
  return text
    .replace(MARKS, '')
    .replace(SEPARATORS, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * The definite article is optional in the way people type.
 *
 * "מפרץ" should find "המפרץ" and the other way round, but stripping ה from
 * every word would turn "הרצליה" into "רצליה" and "הדסה" into "דסה". Three
 * letters left over is the shortest that is still a word worth matching.
 */
function withoutArticle(token: string): string | null {
  return token.startsWith('ה') && token.length >= 4 ? token.slice(1) : null;
}

function tokensOf(text: string): string[] {
  return normalize(text).split(' ').filter(Boolean);
}

/**
 * The tokens a query term may match, split by how much a match is worth.
 *
 * "עזריאלי" is the name of the shopping centre and merely an alias of the
 * railway station next door. Both are true, but someone typing it means the
 * centre, so a hit on a place's own name has to outrank a hit on an alias.
 */
type Haystack = { primary: string[]; alias: string[] };

function expand(parts: string[]): string[] {
  const tokens = new Set<string>();
  for (const part of parts) {
    for (const token of tokensOf(part)) {
      tokens.add(token);
      const bare = withoutArticle(token);
      if (bare) tokens.add(bare);
    }
  }
  return [...tokens];
}

function haystack(place: Place): Haystack {
  return {
    primary: expand([place.name, place.nameEn, place.city ?? '']),
    alias: expand(place.aliases ?? []),
  };
}

type Query = {
  /** Terms that must all match. */
  terms: string[];
  /** What kind of place the phrasing implies, if it implies one. */
  kind: PlaceKind | null;
  normalized: string;
};

export function parseQuery(text: string): Query {
  const all = tokensOf(text);
  const terms: string[] = [];
  let kind: PlaceKind | null = null;

  for (const token of all) {
    const hinted = KIND_WORDS[token];
    if (hinted) {
      kind ??= hinted;
      continue;
    }
    if (FILLER.has(token)) continue;
    terms.push(token);
  }

  // "תחנה מרכזית" and "בית חולים" are entirely category words. Rather than
  // return nothing, fall back to matching on them — the kind hint alone then
  // lists every bus terminal, nearest first, which is a reasonable answer.
  return { terms, kind, normalized: normalize(text) };
}

/** Whole-token match beats prefix match, and a name beats an alias. */
function termScore(term: string, hay: Haystack): number {
  const bare = withoutArticle(term);
  const hits = (tokens: string[], whole: number, prefix: number): number => {
    for (const token of tokens) {
      if (token === term || token === bare) return whole;
    }
    for (const token of tokens) {
      if (token.startsWith(term) || (bare && token.startsWith(bare))) return prefix;
    }
    return 0;
  };
  return Math.max(hits(hay.primary, 300, 200), hits(hay.alias, 150, 100));
}

/** A term that matched the place's own name outright, not a prefix or alias. */
const STRONG = 300;

/**
 * Closeness is worth something, but never enough to beat the name.
 *
 * Someone in Haifa typing "תדי" means the stadium in Jerusalem. Proximity
 * settles ties between comparable matches — two stations called "מרכז" — and
 * orders a category-only query. It does not reorder a better name match below
 * a worse one, which is why the ceiling here is under one whole-token match.
 */
function proximityScore(distanceM: number | null): number {
  if (distanceM === null) return 0;
  return 120 / (1 + distanceM / 15_000);
}

export const MAX_RESULTS = 6;

/**
 * Rank the catalog against a query.
 *
 * `near` is the user's last known position. It only ever reorders results —
 * nothing is filtered out for being far away, because the whole point of the
 * app is that you are going somewhere else.
 */
export function searchCatalog(
  query: string,
  near: LatLng | null = null,
  places: Place[] = PLACES
): PlaceHit[] {
  const parsed = parseQuery(query);
  if (parsed.terms.length === 0 && !parsed.kind) return [];

  // Numbers do not appear in any name in the catalog, but they are the whole
  // point of a street address. A query carrying one is meant for the geocoder,
  // so the relaxed pass below stays out of its way.
  const looksLikeAnAddress = parsed.terms.some((term) => /\d/.test(term));
  // On the relaxed pass, how many of the typed words a place has to account for
  // before it is offered at all.
  const floor = Math.ceil(parsed.terms.length * 0.6);

  const rank = (requireAll: boolean): PlaceHit[] => {
    const scored: { hit: PlaceHit; score: number }[] = [];

    for (const place of places) {
      const hay = haystack(place);

      let score = 0;
      let missed = 0;
      let best = 0;
      for (const term of parsed.terms) {
        const points = termScore(term, hay);
        if (points === 0) {
          if (requireAll) {
            missed = -1;
            break;
          }
          // Not every word people type is part of a name. On the relaxed pass
          // an unmatched term costs less than a matched one earns, so a place
          // that answers three words out of four still beats one that answers
          // two.
          missed += 1;
          continue;
        }
        score += points;
        best = Math.max(best, points);
      }
      if (missed === -1) continue;
      if (!requireAll) {
        const matched = parsed.terms.length - missed;
        if (best < STRONG || matched < floor) continue;
      }
      score -= missed * 120;

      // A category-only query ("תחנה מרכזית") matches every place of that kind.
      if (parsed.terms.length === 0 && place.kind !== parsed.kind) continue;

      if (parsed.kind && place.kind === parsed.kind) score += 150;
      if (normalize(place.name) === parsed.normalized) score += 2_000;

      const distanceM = near ? Math.round(distanceMeters(near, place.coords)) : null;
      score += proximityScore(distanceM);

      scored.push({ hit: { place, distanceM }, score });
    }

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_RESULTS)
      .map((entry) => entry.hit);
  };

  const exact = rank(true);
  if (exact.length > 0) return exact;
  return looksLikeAnAddress ? [] : rank(false);
}

/** How a catalog hit is written on one line of a phone screen. */
export function labelFor(place: Place): string {
  if (!place.city) return place.name;
  // "אצטדיון סמי עופר, חיפה" reads well; "נתניה, נתניה" does not.
  return normalize(place.name).includes(normalize(place.city))
    ? place.name
    : `${place.name}, ${place.city}`;
}

/**
 * The catalog entry a tap landed on, when it landed close enough to mean it.
 *
 * Tapping the map is the other way to pick a destination, and a tap within a
 * few hundred metres of a station almost certainly means the station. Snapping
 * gives it the station's real name instead of a reverse-geocoded street, and
 * gives the geofence the same centre the search would have used.
 *
 * The window is deliberately tight. A tap in open country stays a coordinate
 * rather than being relabelled as somewhere it is nowhere near.
 */
export function nearestPlace(coords: LatLng, withinM = 700): Place | null {
  let best: Place | null = null;
  let bestM = Infinity;

  for (const place of PLACES) {
    const m = distanceMeters(coords, place.coords);
    if (m < bestM) {
      bestM = m;
      best = place;
    }
  }

  return bestM <= withinM ? best : null;
}
