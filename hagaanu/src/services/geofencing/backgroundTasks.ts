import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';

import { GEOFENCE_REGION_ID, MAX_ACCURACY_MARGIN_M, TASKS } from '../../constants/config';
import { ArrivalCoordinator } from '../alarm/ArrivalCoordinator';
import { LocationService } from '../location/LocationService';
import { NotificationService } from '../notifications/NotificationService';
import { AlarmStorage } from '../storage/AlarmStorage';
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
  await ArrivalCoordinator.trigger('geofence');
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

  if (distance <= session.radiusM + accuracyMargin) {
    log.debug('location', `backstop arrival: ${Math.round(distance)}m <= ${session.radiusM}m`);
    await ArrivalCoordinator.trigger('backstop');
    return;
  }

  // Keep the ongoing notification current, so a glance at the lock screen shows
  // the trip closing. Only when the rendered text changes — formatDistance
  // rounds, so most fixes produce the same string and cost nothing.
  const distanceLabel = formatDistance(distance);
  if (distanceLabel !== session.statusDistanceLabel) {
    await AlarmStorage.patch({ statusDistanceLabel: distanceLabel });
    await NotificationService.presentArmedStatus(
      session.destination.label,
      formatDistance(session.radiusM),
      distanceLabel
    );
  }

  // Battery: sample coarsely far out, tightly close in. Restart the stream only
  // when the tier actually changes, since restarting costs a radio wake.
  const tier = LocationService.tierForDistance(distance);
  if (tier.id !== session.pollingTierId) {
    log.debug('location', `polling tier ${session.pollingTierId ?? 'none'} -> ${tier.id} at ${Math.round(distance)}m`);
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
