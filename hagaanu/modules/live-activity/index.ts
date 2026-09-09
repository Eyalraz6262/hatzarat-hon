import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';

/**
 * The iOS Live Activity, as the rest of the app sees it.
 *
 * `requireOptionalNativeModule` rather than `requireNativeModule`: this module
 * exists only in an iOS build that has been prebuilt with the widget target.
 * On Android, in Expo Go, and in any build made before the target was added,
 * it is simply absent — and every call below then does nothing.
 *
 * That is the contract the whole feature is built on. The alarm is the
 * geofence, the background stream and the watchdog; this is a display of what
 * they are already doing. If it never appears, nothing about waking the
 * passenger changes. So there is no error to report and nothing to retry:
 * a lock screen that fails to draw must never be the reason someone misses
 * their stop.
 */
type Native = {
  isAvailable(): boolean;
  start(destination: string, distance: string, stops: string, staleText: string): Promise<void>;
  update(distance: string, stops: string, stale: boolean, staleText: string): Promise<void>;
  end(distance: string, stops: string): Promise<void>;
};

const native =
  Platform.OS === 'ios' ? requireOptionalNativeModule<Native>('LiveActivity') : null;

export const LiveActivity = {
  /**
   * Whether a card can be shown at all.
   *
   * False on Android, on iOS below 16.2, in a build without the widget target,
   * and when the user has switched Live Activities off for this app. The
   * caller does not need to tell those apart — they all mean the same thing.
   */
  isAvailable(): boolean {
    try {
      return native?.isAvailable() ?? false;
    } catch {
      return false;
    }
  },

  async start(
    destination: string,
    distance: string,
    stops: string,
    staleText: string
  ): Promise<void> {
    try {
      await native?.start(destination, distance, stops, staleText);
    } catch {
      // As above: never surfaced, never retried.
    }
  },

  async update(
    distance: string,
    stops: string,
    stale: boolean,
    staleText: string
  ): Promise<void> {
    try {
      await native?.update(distance, stops, stale, staleText);
    } catch {
      // As above.
    }
  },

  async end(distance = '', stops = ''): Promise<void> {
    try {
      await native?.end(distance, stops);
    } catch {
      // As above.
    }
  },
};
