import type { Destination } from '../../types';

/**
 * Trip history, as rules rather than as storage.
 *
 * Split from `TripStorage` for the same reason `saved.ts` is: the cap, the
 * ordering and the "close out the open one" logic are the parts that can be
 * wrong, and they should be testable without AsyncStorage and without a React
 * Native runtime.
 */

/**
 * How many trips are kept.
 *
 * Enough that a regular commuter sees a month of their own routine, small
 * enough that the whole list is one AsyncStorage read on a cold start. There
 * is no server and no pagination, and there should not be.
 */
export const MAX_TRIPS = 60;

/**
 * How a trip ended.
 *
 *   woken     the alarm rang and the user dismissed it — the trip worked
 *   cancelled the user stood it down before arriving
 *   open      armed, and nothing has closed it yet
 *
 * There is deliberately no "missed": the app cannot tell the difference
 * between someone who got off at the right stop with the alarm still armed and
 * someone the alarm failed, and inventing that distinction in a history screen
 * would be claiming knowledge the app does not have.
 */
export type TripOutcome = 'woken' | 'cancelled' | 'open';

export type Trip = {
  /** The alarm session's own id, so arming and closing out cannot disagree. */
  id: string;
  destination: Destination;
  radiusM: number;
  /** Epoch ms when the alarm was armed. */
  armedAt: number;
  /** Epoch ms when it rang or was stood down; null while still open. */
  endedAt: number | null;
  outcome: TripOutcome;
};

/** Newest first. One comparator, so the stored order and the drawn order agree. */
export function orderTrips(trips: Trip[]): Trip[] {
  return [...trips].sort((a, b) => b.armedAt - a.armedAt);
}

/**
 * Records a newly armed trip.
 *
 * Re-arming the same session id replaces rather than duplicates: the store
 * hydrates an armed session on relaunch and would otherwise write a second
 * row for a trip that never ended.
 */
export function withTrip(existing: Trip[], trip: Trip): Trip[] {
  const others = existing.filter((item) => item.id !== trip.id);
  return orderTrips([trip, ...others]).slice(0, MAX_TRIPS);
}

/**
 * Closes out the trip an alarm just finished.
 *
 * By id when we have one. Without an id — a process that was restarted between
 * arming and arriving no longer knows which session it was — the newest open
 * trip is the only candidate there can be, because only one alarm is ever
 * armed at a time.
 */
export function closeTrip(
  existing: Trip[],
  outcome: Exclude<TripOutcome, 'open'>,
  at: number,
  id?: string
): Trip[] {
  const target = id
    ? existing.find((trip) => trip.id === id && trip.outcome === 'open')
    : orderTrips(existing).find((trip) => trip.outcome === 'open');
  if (!target) return existing;

  return existing.map((trip) =>
    trip === target ? { ...trip, outcome, endedAt: at } : trip
  );
}

/** Drops anything a stored blob got wrong, so one bad row cannot empty the list. */
export function normaliseTrips(raw: unknown): Trip[] {
  if (!Array.isArray(raw)) return [];

  const clean: Trip[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const trip = item as Partial<Trip>;
    const coords = trip.destination?.coords;
    if (
      typeof trip.id !== 'string' ||
      typeof trip.armedAt !== 'number' ||
      typeof trip.radiusM !== 'number' ||
      typeof trip.destination?.label !== 'string' ||
      typeof coords?.latitude !== 'number' ||
      typeof coords?.longitude !== 'number'
    ) {
      continue;
    }
    clean.push({
      id: trip.id,
      destination: { label: trip.destination.label, coords },
      radiusM: trip.radiusM,
      armedAt: trip.armedAt,
      endedAt: typeof trip.endedAt === 'number' ? trip.endedAt : null,
      outcome:
        trip.outcome === 'woken' || trip.outcome === 'cancelled' ? trip.outcome : 'open',
    });
  }
  return orderTrips(clean).slice(0, MAX_TRIPS);
}
