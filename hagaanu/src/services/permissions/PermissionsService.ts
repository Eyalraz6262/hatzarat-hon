import { Linking, Platform } from 'react-native';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';

import type { PermissionState, PermissionsSnapshot } from '../../types';
import { log } from '../../utils/logger';

/**
 * Maps an Expo permission response onto our tri-state.
 *
 * `blocked` means the OS will not show the dialog again — the only way forward
 * is the system settings screen, so the UI must say that instead of re-asking.
 */
function toState(response: {
  status: Location.PermissionStatus | Notifications.PermissionStatus | string;
  canAskAgain?: boolean;
}): PermissionState {
  if (response.status === 'granted') return 'granted';
  if (response.canAskAgain === false) return 'blocked';
  return 'denied';
}

export const PermissionsService = {
  async snapshot(): Promise<PermissionsSnapshot> {
    const [foreground, background, notifications] = await Promise.all([
      Location.getForegroundPermissionsAsync(),
      Location.getBackgroundPermissionsAsync(),
      Notifications.getPermissionsAsync(),
    ]);

    return {
      foregroundLocation: toState(foreground),
      // iOS reports background as denied until foreground is granted; don't
      // surface that as a hard "blocked" while the first step is still pending.
      backgroundLocation:
        foreground.status !== 'granted' && background.status !== 'granted'
          ? 'unknown'
          : toState(background),
      notifications: toState(notifications),
    };
  },

  /** "While using the app" location. Must be granted before background can be asked. */
  async requestForegroundLocation(): Promise<PermissionState> {
    const response = await Location.requestForegroundPermissionsAsync();
    log.debug('permissions', `foreground location -> ${response.status}`);
    return toState(response);
  },

  /**
   * "Always" (iOS) / "Allow all the time" (Android) location.
   *
   * Platform notes that shape the UX:
   *  - iOS shows a *provisional* "Always" prompt only after the app has been
   *    using location; the reliable path is asking here and, if the user picked
   *    "While Using", deep-linking them to Settings.
   *  - Android 11+ never shows an in-app dialog for background location: the
   *    request opens the system settings page. Both cases end in the same place,
   *    which is why the primer screen explains it before we call this.
   */
  async requestBackgroundLocation(): Promise<PermissionState> {
    const foreground = await Location.getForegroundPermissionsAsync();
    if (foreground.status !== 'granted') {
      const granted = await PermissionsService.requestForegroundLocation();
      if (granted !== 'granted') return granted;
    }

    const response = await Location.requestBackgroundPermissionsAsync();
    log.debug('permissions', `background location -> ${response.status}`);
    return toState(response);
  },

  async requestNotifications(): Promise<PermissionState> {
    const response = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowSound: true,
        allowBadge: true,
        // Note: `allowCriticalAlerts` (bypasses the mute switch and Focus modes)
        // is deliberately NOT requested — it needs an entitlement Apple grants
        // by application only, and asking for it without one makes the whole
        // request fail. See docs/PLATFORM-LIMITS.md.
        provideAppNotificationSettings: true,
      },
    });
    log.debug('permissions', `notifications -> ${response.status}`);
    return toState(response);
  },

  /** Whether the device's location services (GPS master switch) are on at all. */
  async areLocationServicesEnabled(): Promise<boolean> {
    try {
      return await Location.hasServicesEnabledAsync();
    } catch (error) {
      log.warn('permissions', 'hasServicesEnabledAsync failed', error);
      return true;
    }
  },

  /**
   * True when the alarm can actually fire with the phone locked.
   * Notifications are non-negotiable; background location is what lets the OS
   * wake us at all.
   */
  isReadyForBackgroundAlarm(snapshot: PermissionsSnapshot): boolean {
    return snapshot.backgroundLocation === 'granted' && snapshot.notifications === 'granted';
  },

  /** Minimum to let someone try the app: pick a destination, see the map. */
  canUseMap(snapshot: PermissionsSnapshot): boolean {
    return snapshot.foregroundLocation === 'granted';
  },

  openSystemSettings(): void {
    if (Platform.OS === 'ios') {
      void Linking.openURL('app-settings:');
      return;
    }
    void Linking.openSettings();
  },
};
