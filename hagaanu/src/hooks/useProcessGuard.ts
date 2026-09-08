import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';

import { GeofencingService } from '../services/geofencing/GeofencingService';
import { LocationService } from '../services/location/LocationService';
import { AlarmStorage } from '../services/storage/AlarmStorage';
import { useAlarmStore } from '../state/useAlarmStore';
import { log } from '../utils/logger';

/**
 * Notices when the OS tore our monitors down behind our back, and puts them
 * back up.
 *
 * This is the single largest cause of a transit alarm silently failing, and it
 * is almost entirely an Android problem: Xiaomi, Samsung, Huawei, OnePlus,
 * Oppo and Vivo all ship battery managers that close background apps far more
 * aggressively than Google's own documentation says they should. The app comes
 * back to the foreground believing it is armed, while nothing has been
 * watching for twenty minutes.
 *
 * Two things happen here, and the order matters:
 *
 *   1. Repair, always. Whatever went missing gets restarted immediately, so
 *      the rest of the trip is covered even if the user never reads a word.
 *   2. Remember, once. The fact that it happened is recorded so the app can
 *      offer the battery-settings fix — but only after a real failure, never
 *      during onboarding. Asking for a battery exemption before the user has
 *      seen the app work reads as a red flag and costs more than it buys.
 */
export function useProcessGuard(): void {
  const status = useAlarmStore((state) => state.status);
  const reportKilled = useAlarmStore((state) => state.reportKilled);
  const checking = useRef(false);

  useEffect(() => {
    if (status !== 'armed') return;

    const check = async () => {
      if (checking.current) return;
      checking.current = true;

      try {
        const session = await AlarmStorage.read();
        if (!session || session.status !== 'armed') return;

        // In foreground-only mode there is nothing registered with the OS to
        // lose, so there is nothing here to detect or repair.
        if (session.foregroundOnly) return;

        const [geofenceLive, streamLive] = await Promise.all([
          GeofencingService.isActive(),
          LocationService.isBackgroundTrackingActive(),
        ]);

        if (geofenceLive && streamLive) return;

        log.warn(
          'location',
          `monitors lost while armed (geofence=${geofenceLive}, stream=${streamLive}); repairing`
        );

        if (!geofenceLive) {
          try {
            await GeofencingService.start(session.destination, session.radiusM);
          } catch (error) {
            log.error('geofence', 'failed to re-register geofence', error);
          }
        }

        if (!streamLive) {
          try {
            await LocationService.startBackgroundTracking(
              LocationService.tierForDistance(session.lastDistanceM ?? Number.POSITIVE_INFINITY)
            );
          } catch (error) {
            log.error('location', 'failed to restart background tracking', error);
          }
        }

        // Only Android gets the offer, because only Android has the setting.
        // iOS terminates background apps too, but there is nothing the user
        // can do about it and telling them so would be noise.
        if (Platform.OS === 'android') reportKilled();
      } catch (error) {
        log.warn('app', 'process guard failed', error);
      } finally {
        checking.current = false;
      }
    };

    void check();
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') void check();
    });

    return () => subscription.remove();
  }, [status, reportKilled]);
}
