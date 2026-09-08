import type { LatLng } from '../../types';
import { distanceMeters } from '../../utils/geo';
import { PLACES, type Place, type PlaceKind } from './catalog';
import { normalize, proximityScore, tokensOf, withoutArticle } from './normalize';
import { nearestStop, searchStops, type StopHit } from './stops';

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

type Scored = { hit: PlaceHit; score: number };

/** A stop from the national index, shaped like a curated place. */
function asPlace(hit: StopHit): Place {
  return {
    name: hit.name,
    nameEn: '',
    kind: hit.kind,
    city: hit.town || undefined,
    coords: hit.coords,
  };
}

/**
 * Whether a stop is really the curated place we already listed.
 *
 * The feed has a stop called "אצטדיון סמי עופר/כביש 4" beside the stadium and
 * "ת. רכבת נתניה" outside the station. Those are worth showing — they are where
 * a bus actually puts you down. What is not worth showing is the same place
 * twice under two spellings, so a stop is dropped only when its name contains
 * the curated one and it is close enough to be the same spot.
 */
const SAME_SPOT_M = 350;

function duplicates(hit: PlaceHit, shown: PlaceHit[]): boolean {
  const name = normalize(hit.place.name);
  return shown.some((seen) => {
    const other = normalize(seen.place.name);
    if (!name.includes(other) && !other.includes(name)) return false;
    return distanceMeters(hit.place.coords, seen.place.coords) < SAME_SPOT_M;
  });
}

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
    // "ת. רכבת נתניה" leaves a bare "ת" behind. A single letter matches a
    // quarter of the country and narrows nothing. A single digit is different:
    // it is the whole of "כביש 4", and the house number in an address.
    if (token.length < 2 && !/\d/.test(token)) continue;
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
 * What a hand-checked entry is worth over a raw one from the feed.
 *
 * The curated list holds the canonical name for a place — "אצטדיון סמי עופר"
 * rather than "אצטדיון סמי עופר/כביש 4" — so where both describe the same
 * thing equally well, the tidier one goes first. It is a nudge, not a veto:
 * a stop that matches a whole word the curated entry only prefixed still wins.
 */
const CURATED_BONUS = 150;

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

  // A number is the whole point of a street address, and no curated name has
  // one — so the relaxed pass stays out of the geocoder's way whenever one
  // appears. Stop names do carry numbers ("אצטדיון סמי עופר/כביש 4"), so for
  // those a number only means an address when it comes with a street *and* a
  // town: two or more other words beside it.
  const hasNumber = parsed.terms.some((term) => /\d/.test(term));
  const looksLikeAnAddress = hasNumber;
  const addressForStops = hasNumber && parsed.terms.length >= 3;
  // On the relaxed pass, how many of the typed words a place has to account for
  // before it is offered at all.
  const floor = Math.ceil(parsed.terms.length * 0.6);

  const rank = (requireAll: boolean): Scored[] => {
    const scored: Scored[] = [];

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

    return scored;
  };

  const exact = rank(true);
  const curated = exact.length > 0 ? exact : looksLikeAnAddress ? [] : rank(false);

  // The curated list is small, hand-checked and canonical; the national index
  // is what makes the answer complete — every stop a bus or a train actually
  // calls at, which is most of what anyone names as a destination and none of
  // which an address geocoder has ever heard of. They are scored on one scale
  // so they sort into one list rather than one always sitting above the other:
  // someone typing "הרצל" in Tel Aviv wants the stop around the corner, not the
  // station in Herzliya, however tidy its name is.
  const merged: Scored[] = curated.map((entry) => ({
    hit: entry.hit,
    score: entry.score + CURATED_BONUS,
  }));

  if (parsed.terms.length > 0 && !addressForStops) {
    for (const hit of searchStops(parsed.terms, near, MAX_RESULTS * 2, parsed.kind)) {
      merged.push({
        hit: { place: asPlace(hit), distanceM: hit.distanceM },
        score: hit.score,
      });
    }
  }

  const shown: PlaceHit[] = [];
  for (const { hit } of merged.sort((a, b) => b.score - a.score)) {
    if (shown.length >= MAX_RESULTS) break;
    if (duplicates(hit, shown)) continue;
    shown.push(hit);
  }
  return shown;
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
  if (bestM <= withinM) return best;

  // Nothing curated is near, but almost anywhere someone taps in a built-up
  // part of the country has a stop on it, and a stop's name beats a street
  // address for telling them where they are about to be woken.
  const stop = nearestStop(coords, withinM);
  return stop ? asPlace(stop) : null;
}
