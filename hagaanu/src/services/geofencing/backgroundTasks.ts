import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';

import { GEOFENCE_REGION_ID, MAX_ACCURACY_MARGIN_M, TASKS } from '../../constants/config';
import { ArrivalCoordinator } from '../alarm/ArrivalCoordinator';
import { LiveActivity } from '../../../modules/live-activity';
import { Journal } from '../debug/Journal';
import { liveCard } from '../notifications/liveCard';
import { applyFix, onFix, type TripState } from '../alarm/watchdog';
import { LocationService } from '../location/LocationService';
import { NotificationService } from '../notifications/NotificationService';
import { AlarmStorage } from '../storage/AlarmStorage';
import type { AlarmSession } from '../../types';
import { distanceMeters, formatDistance } from '../../utils/geo';
import { log } from '../../utils/logger';

/**
 * Background task definitions.
 *
 * CRITICAL: this module is imported from `index.ts`, *before* the React app is
 * registered. `TaskManager.defineTask` must run in the global scope of every JS
 * context the OS may spin up — including the headless one it creates when it
 * wakes a terminated app for a geofence event. Defining these inside a component
 * or an effect is the classic reason "it works in the foreground but never fires
 * when the phone is locked".
 */

/** The persisted session, in the shape the pure rules understand. */
export function tripStateOf(session: AlarmSession): TripState {
  return {
    radiusM: session.radiusM,
    earlyRadiusM: session.earlyRadiusM ?? null,
    earlySent: session.earlySent ?? false,
    closestM: session.closestM ?? null,
    lastDistanceM: session.lastDistanceM ?? null,
    lastFixAt: session.lastFixAt ?? null,
    lastSpeedMps: session.lastSpeedMps ?? null,
  };
}

type GeofenceEventData = {
  eventType: Location.LocationGeofencingEventType;
  region: Location.LocationRegion;
};

TaskManager.defineTask<GeofenceEventData>(TASKS.GEOFENCE, async ({ data, error }) => {
  if (error) {
    log.error('geofence', 'task error', error);
    return;
  }
  if (!data) return;

  const { eventType, region } = data;

  if (region?.identifier !== GEOFENCE_REGION_ID) {
    log.debug('geofence', `ignoring event for unknown region ${region?.identifier}`);
    return;
  }

  if (eventType !== Location.LocationGeofencingEventType.Enter) {
    // We only register for Enter, but the OS may still deliver Exit on some
    // Android OEM builds. Ignoring it is the whole handling.
    return;
  }

  log.debug('geofence', 'ENTER event received');
  // Written before the trigger, not after: this is the line that proves the OS
  // woke us, and it must survive even if everything after it fails.
  await Journal.record('geofence', 'OS delivered ENTER for our region');
  await ArrivalCoordinator.trigger('geofence', 'arrived');
});

type LocationEventData = {
  locations: Location.LocationObject[];
};

TaskManager.defineTask<LocationEventData>(TASKS.LOCATION, async ({ data, error }) => {
  if (error) {
    log.error('location', 'background task error', error);
    return;
  }

  const locations = data?.locations;
  if (!locations?.length) return;

  const session = await AlarmStorage.read();
  if (!session || session.status !== 'armed') return;

  // Deferred updates arrive batched; only the newest fix describes where we are.
  const latest = locations[locations.length - 1];
  const current = { latitude: latest.coords.latitude, longitude: latest.coords.longitude };
  const distance = distanceMeters(current, session.destination.coords);

  // A fix reported with 120 m of error, sitting 80 m outside the radius, is very
  // likely already inside it. Widen the test by the fix's own accuracy rather
  // than a blind constant — and cap it so a garbage fix can't fire the alarm
  // kilometers early.
  const accuracyMargin = Math.min(latest.coords.accuracy ?? 0, MAX_ACCURACY_MARGIN_M);

  const before = tripStateOf(session);
  const signal = onFix(before, distance, accuracyMargin);

  // The running state is written before acting on the signal, so a process
  // killed between the two still has the low-water mark it needs next time.
  const after = applyFix(before, distance, latest.timestamp, latest.coords.speed ?? null);
  await AlarmStorage.patch({
    closestM: after.closestM,
    lastDistanceM: after.lastDistanceM,
    lastFixAt: after.lastFixAt,
    lastSpeedMps: after.lastSpeedMps,
    // A fresh fix clears the stale notice, so the next blackout says so again
    // rather than staying quiet because it already had its turn.
    staleNoticed: false,
  });

  // One line per fix. That is the whole point of the journal: it is the only
  // way to see, afterwards, that fixes were arriving at all while the phone was
  // locked — and how far apart they were.
  void Journal.record(
    'fix',
    `${Math.round(distance)}m` +
      `${accuracyMargin ? ` ±${Math.round(accuracyMargin)}m` : ''}` +
      ` · ${signal.kind}` +
      `${latest.coords.speed ? ` · ${latest.coords.speed.toFixed(1)}m/s` : ''}`
  );

  switch (signal.kind) {
    case 'arrive':
      log.debug('location', `backstop arrival: ${Math.round(distance)}m <= ${session.radiusM}m`);
      await ArrivalCoordinator.trigger('backstop', 'arrived');
      return;

    case 'overshot':
      log.debug(
        'location',
        `overshoot: ${Math.round(distance)}m, closest was ${Math.round(before.closestM ?? 0)}m`
      );
      await ArrivalCoordinator.trigger('backstop', 'overshot');
      return;

    case 'early':
      await ArrivalCoordinator.sendEarly();
      break;

    default:
      break;
  }

  // Keep the ongoing notification current, so a glance at the lock screen shows
  // the trip closing. Only when the rendered text changes — formatDistance
  // rounds, so most fixes produce the same string and cost nothing.
  const distanceLabel = formatDistance(distance);
  if (distanceLabel !== session.statusDistanceLabel) {
    await AlarmStorage.patch({ statusDistanceLabel: distanceLabel });
    await NotificationService.presentArmedStatus(session.destination.label, distanceLabel);

    // The Live Activity carries the same number, updated on the same rule: only
    // when the rendered text actually changed. ActivityKit budgets updates, and
    // spending one to redraw an identical string wastes it.
    const card = liveCard(distance, session.radiusM);
    await LiveActivity.update(card.distance, card.note, false, card.staleText);
  }

  // Battery: sample coarsely far out, tightly close in. Restart the stream only
  // when the tier actually changes, since restarting costs a radio wake.
  const tier = LocationService.tierForDistance(distance);
  if (tier.id !== session.pollingTierId) {
    log.debug(
      'location',
      `polling tier ${session.pollingTierId ?? 'none'} -> ${tier.id} at ${Math.round(distance)}m`
    );
    await AlarmStorage.patch({ pollingTierId: tier.id });
    try {
      await LocationService.startBackgroundTracking(tier);
    } catch (restartError) {
      log.error('location', 'failed to switch polling tier', restartError);
    }
  }
});

/**
 * Imported for its side effects. Exported as a no-op call so the import can't be
 * tree-shaken or reordered away by a bundler that thinks it is unused.
 */
export function registerBackgroundTasks(): void {
  log.debug('app', 'background tasks registered');
}
