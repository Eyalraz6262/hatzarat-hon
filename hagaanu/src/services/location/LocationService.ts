import * as Location from 'expo-location';

import { POLLING_TIERS, TASKS, type PollingTier } from '../../constants/config';
import { t } from '../../i18n';
import { colors } from '../../theme';
import type { PositionSample } from '../../types';
import { log } from '../../utils/logger';

function toSample(location: Location.LocationObject): PositionSample {
  return {
    coords: {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    },
    accuracy: location.coords.accuracy ?? null,
    timestamp: location.timestamp,
  };
}

/**
 * Foreground location + the background location stream that backstops geofencing.
 *
 * Why a backstop at all, when the OS has geofences: native region monitoring is
 * cheap but *lazy*. Both platforms batch and delay region callbacks (iOS can take
 * minutes and wants the device to settle; Android's GeofencingClient has its own
 * responsiveness window and gets throttled in Doze). On a train at 120 km/h a
 * 500 m region is crossed in about 30 seconds — a late callback means a missed
 * stop. So we run both: the geofence is the low-power primary, and this stream
 * — sampled coarsely when far away, tightly when close — catches what it misses.
 */
export const LocationService = {
  /** One fix, good enough to center the map. Fast path: last known position. */
  async getCurrent(options?: { fresh?: boolean }): Promise<PositionSample | null> {
    try {
      if (!options?.fresh) {
        const cached = await Location.getLastKnownPositionAsync({ maxAge: 60_000 });
        if (cached) return toSample(cached);
      }
      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      return toSample(current);
    } catch (error) {
      log.warn('location', 'getCurrent failed', error);
      return null;
    }
  },

  /** Live foreground updates, for the map dot and the live distance readout. */
  watch(onSample: (sample: PositionSample) => void): Promise<Location.LocationSubscription> {
    return Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        distanceInterval: 25,
        timeInterval: 5_000,
      },
      (location) => onSample(toSample(location))
    );
  },

  /** Picks the polling tier for a given remaining distance. */
  tierForDistance(distanceM: number): PollingTier {
    return POLLING_TIERS.find((tier) => distanceM <= tier.maxDistanceM) ?? POLLING_TIERS[POLLING_TIERS.length - 1];
  },

  async isBackgroundTrackingActive(): Promise<boolean> {
    try {
      return await Location.hasStartedLocationUpdatesAsync(TASKS.LOCATION);
    } catch {
      return false;
    }
  },

  /**
   * Starts (or re-starts, with new options) the background location stream.
   *
   * `Balanced` accuracy is the battery decision that matters most: it resolves
   * position from Wi-Fi and cell towers and only reaches for GPS when it must,
   * which is ~100 m accurate — plenty against a 300 m+ radius, and a fraction of
   * the power of `BestForNavigation`.
   */
  async startBackgroundTracking(tier: PollingTier): Promise<void> {
    if (await LocationService.isBackgroundTrackingActive()) {
      await LocationService.stopBackgroundTracking();
    }

    await Location.startLocationUpdatesAsync(TASKS.LOCATION, {
      accuracy: Location.Accuracy.Balanced,
      distanceInterval: tier.distanceInterval,
      timeInterval: tier.timeInterval,
      // Batch fixes while far away so the radio wakes less often.
      deferredUpdatesDistance: tier.distanceInterval,
      deferredUpdatesInterval: tier.timeInterval,

      // iOS: never let the OS pause updates — a paused manager on a stationary
      // train (a long platform stop) would not resume in time.
      pausesUpdatesAutomatically: false,
      activityType: Location.LocationActivityType.OtherNavigation,
      showsBackgroundLocationIndicator: true,

      // Android 8+ hard-limits background location for apps without a foreground
      // service to a few updates per hour. This notification is the price of
      // getting a real stream — and it doubles as honest disclosure.
      foregroundService: {
        notificationTitle: t('active.serviceTitle'),
        notificationBody: t('active.serviceBody'),
        notificationColor: colors.accent,
        killServiceOnDestroy: false,
      },
      mayShowUserSettingsDialog: false,
    });

    log.debug('location', `background tracking started (tier=${tier.id})`);
  },

  async stopBackgroundTracking(): Promise<void> {
    try {
      if (await LocationService.isBackgroundTrackingActive()) {
        await Location.stopLocationUpdatesAsync(TASKS.LOCATION);
        log.debug('location', 'background tracking stopped');
      }
    } catch (error) {
      log.warn('location', 'stopBackgroundTracking failed', error);
    }
  },
};
