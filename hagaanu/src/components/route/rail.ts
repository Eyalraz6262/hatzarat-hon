import type { TransitStop } from '../../services/transit/StopsService';
import type { Destination, LatLng } from '../../types';
import { distanceMeters } from '../../utils/geo';

/**
 * The rail's data model.
 *
 * Kept apart from the view because the ordering rules are the part that can
 * actually be wrong, and being wrong here means a passenger sees a stop they
 * already passed still listed ahead of them.
 *
 * Everything is ordered by DISTANCE REMAINING TO THE DESTINATION, descending.
 * That single measure is what makes the rail work while the bus is moving:
 * it needs no route geometry, no origin memory and no direction of travel,
 * and it stays correct when the driver detours or the passenger boarded
 * halfway along.
 */

export type RailItem =
  | { kind: 'stop'; id: string; name: string; remainingM: number; passed: boolean; transit: TransitStop['kind'] }
  /** Where the passenger is right now. */
  | { kind: 'here'; id: 'here'; remainingM: number }
  /** Where the alarm will fire. */
  | { kind: 'wake'; id: 'wake'; remainingM: number }
  | { kind: 'destination'; id: 'destination'; name: string; remainingM: number };

export type Rail = {
  items: RailItem[];
  /** Stops still ahead of the wake point. The armed screen's headline number. */
  stopsToGo: number | null;
};

/**
 * Builds the rail from a live position.
 *
 * `stops` may be empty, and that is a supported state rather than an error:
 * the rail then shows you, the wake point and the destination, which is still
 * a truthful picture of the journey, just a coarser one.
 */
export function buildRail(
  stops: TransitStop[],
  here: LatLng | null,
  destination: Destination,
  radiusM: number
): Rail {
  const withRemaining = stops
    .map((stop) => ({ stop, remainingM: distanceMeters(stop.coords, destination.coords) }))
    // Drop anything inside the wake ring: a stop the alarm has already covered
    // is not a stop the passenger is waiting for.
    .filter((entry) => entry.remainingM > radiusM)
    .sort((a, b) => b.remainingM - a.remainingM);

  const hereRemaining = here ? distanceMeters(here, destination.coords) : null;

  const items: RailItem[] = [];

  for (const { stop, remainingM } of withRemaining) {
    // Inserted before the first stop the passenger has NOT yet reached.
    if (hereRemaining !== null && hereRemaining > remainingM && !items.some((i) => i.kind === 'here')) {
      items.push({ kind: 'here', id: 'here', remainingM: hereRemaining });
    }
    items.push({
      kind: 'stop',
      id: stop.id,
      name: stop.name,
      remainingM,
      passed: hereRemaining !== null && hereRemaining < remainingM,
      transit: stop.kind,
    });
  }

  // Past every listed stop, or there were none. Either way the marker still
  // belongs on the rail, between the last stop and the wake point.
  if (hereRemaining !== null && !items.some((i) => i.kind === 'here')) {
    items.push({ kind: 'here', id: 'here', remainingM: hereRemaining });
  }

  items.push({ kind: 'wake', id: 'wake', remainingM: radiusM });
  items.push({ kind: 'destination', id: 'destination', name: destination.label, remainingM: 0 });

  return {
    items,
    stopsToGo:
      hereRemaining === null
        ? null
        : withRemaining.filter((entry) => entry.remainingM < hereRemaining).length,
  };
}
