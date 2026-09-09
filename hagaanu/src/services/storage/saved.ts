import type { Destination } from '../../types';

/**
 * The saved-destinations list, as rules rather than as storage.
 *
 * Split from `SavedStorage` for the same reason the settings normaliser is:
 * the ordering and the cap are the parts that can be wrong, and they should be
 * testable without AsyncStorage and without a React Native runtime.
 */

/** How many saved destinations are kept. */
export const MAX_SAVED = 12;

/** The drawn mark a saved destination is filed under. */
export type SavedKind = 'home' | 'work' | 'station' | 'favourite';

export type SavedDestination = {
  id: string;
  name: string;
  kind: SavedKind;
  destination: Destination;
  radiusM: number;
  /** Epoch ms, so the list can lead with what the user actually uses. */
  lastUsedAt: number;
  /**
   * A route the user rides regularly, kept at the front of the list.
   *
   * Recency ordering is right for almost everyone, but it fails the exact
   * person this feature is for: the commuter who takes one trip every weekday
   * and a different one twice a year still has to hunt for the daily one after
   * a single weekend outing. A pin is the user overriding the heuristic.
   */
  pinned?: boolean;
};

/**
 * Pinned first, then by last use.
 *
 * One comparator, used by every read and every write, so the stored order and
 * the drawn order can never drift apart.
 */
export function orderSaved(items: SavedDestination[]): SavedDestination[] {
  return [...items].sort((a, b) => {
    if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
    return b.lastUsedAt - a.lastUsedAt;
  });
}

/**
 * Adds a record and applies the cap.
 *
 * Two things must survive it: what the user just saved, and anything they
 * pinned. Ordering already leads with the pinned ones, so trimming the tail
 * keeps them — but the new record is unpinned, and once the pins alone fill
 * the list it would be the first thing dropped. That is the one case where
 * the cap would eat the very destination being saved, so it is held out of
 * the trim explicitly.
 */
export function withSaved(
  existing: SavedDestination[],
  record: SavedDestination
): SavedDestination[] {
  const rest = orderSaved(existing.filter((item) => item.id !== record.id));
  if (rest.length + 1 <= MAX_SAVED) return orderSaved([record, ...rest]);
  return orderSaved([record, ...rest.slice(0, MAX_SAVED - 1)]);
}

/**
 * A collision-proof id.
 *
 * A timestamp alone is not one: two saves in the same millisecond would share
 * an id, and every later delete or pin addresses entries by it — so the wrong
 * route would vanish.
 */
export function savedId(now: number = Date.now()): string {
  return `${now}-${Math.random().toString(36).slice(2, 8)}`;
}
