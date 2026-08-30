import * as Location from 'expo-location';

import { GEOFENCE_REGION_ID, TASKS } from '../../constants/config';
import type { Destination } from '../../types';
import { log } from '../../utils/logger';

/**
 * Thin wrapper over the OS region-monitoring APIs.
 *
 * expo-location's geofencing maps straight onto `CLLocationManager` region
 * monitoring (iOS) and `GeofencingClient` (Android) — the official, OS-scheduled
 * mechanism. That is what lets the system wake our process when the user enters
 * the region without us running continuously, which is the entire premise of the
 * app and the reason we don't roll our own polling loop as the primary path.
 */
export const GeofencingService = {
  async isActive(): Promise<boolean> {
    try {
      return await Location.hasStartedGeofencingAsync(TASKS.GEOFENCE);
    } catch {
      return false;
    }
  },

  /**
   * Arms a single region around `destination`.
   *
   * We monitor exactly one region even though iOS allows 20, because there is
   * exactly one destination. `notifyOnExit: false` halves the callbacks — we only
   * care about arriving.
   */
  async start(destination: Destination, radiusM: number): Promise<void> {
    await GeofencingService.stop();

    await Location.startGeofencingAsync(TASKS.GEOFENCE, [
      {
        identifier: GEOFENCE_REGION_ID,
        latitude: destination.coords.latitude,
        longitude: destination.coords.longitude,
        radius: radiusM,
        notifyOnEnter: true,
        notifyOnExit: false,
      },
    ]);

    log.debug('geofence', `armed around ${destination.label} r=${radiusM}m`);
  },

  async stop(): Promise<void> {
    try {
      if (await GeofencingService.isActive()) {
        await Location.stopGeofencingAsync(TASKS.GEOFENCE);
        log.debug('geofence', 'disarmed');
      }
    } catch (error) {
      log.warn('geofence', 'stop failed', error);
    }
  },
};
