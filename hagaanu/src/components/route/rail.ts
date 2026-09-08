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
  /**
   * Where an alarm will fire. There are two on a journey with a change: one at
   * the transfer and one at the destination, so the id is not a constant.
   */
  | { kind: 'wake'; id: string; remainingM: number }
  /** A change of vehicle: the first leg's target, on the way to the last. */
  | { kind: 'transfer'; id: 'transfer'; name: string; remainingM: number }
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
  radiusM: number,
  /**
   * The change of vehicle, when the journey has one.
   *
   * Placed by its own distance to the final destination, so it lands in the
   * right place among the stops without needing any route geometry — the same
   * measure everything else on the rail is ordered by.
   */
  transfer: Destination | null = null,
  transferRadiusM: number = radiusM
): Rail {
  const withRemaining = stops
    .map((stop) => ({ stop, remainingM: distanceMeters(stop.coords, destination.coords) }))
    // Drop anything inside the wake ring: a stop the alarm has already covered
    // is not a stop the passenger is waiting for.
    .filter((entry) => entry.remainingM > radiusM)
    .sort((a, b) => b.remainingM - a.remainingM);

  const hereRemaining = here ? distanceMeters(here, destination.coords) : null;
  const transferRemaining = transfer
    ? distanceMeters(transfer.coords, destination.coords)
    : null;

  const items: RailItem[] = [];
  let transferPlaced = false;

  const placeTransfer = (beforeRemaining: number | null) => {
    if (!transfer || transferPlaced || transferRemaining === null) return;
    if (beforeRemaining !== null && transferRemaining < beforeRemaining) return;
    transferPlaced = true;
    items.push({
      kind: 'transfer',
      id: 'transfer',
      name: transfer.label,
      remainingM: transferRemaining,
    });
    items.push({ kind: 'wake', id: 'wake-transfer', remainingM: transferRadiusM });
  };

  for (const { stop, remainingM } of withRemaining) {
    // Inserted before the first stop the passenger has NOT yet reached.
    if (hereRemaining !== null && hereRemaining > remainingM && !items.some((i) => i.kind === 'here')) {
      items.push({ kind: 'here', id: 'here', remainingM: hereRemaining });
    }
    placeTransfer(remainingM);
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

  // Past every listed stop, or there were none.
  placeTransfer(null);

  items.push({ kind: 'wake', id: 'wake-final', remainingM: radiusM });
  items.push({ kind: 'destination', id: 'destination', name: destination.label, remainingM: 0 });

  return {
    items,
    stopsToGo:
      hereRemaining === null
        ? null
        : withRemaining.filter((entry) => entry.remainingM < hereRemaining).length,
  };
}
