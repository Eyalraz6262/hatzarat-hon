import type { PermissionState, PermissionsSnapshot } from '../../types';

/**
 * Permissions, in a browser.
 *
 * A browser has no "always" location and no notification channel that survives
 * a closed tab, so the real prompts would either fail or grant something that
 * does not mean what it means on a phone. The demo grants everything and the
 * banner on the home screen says plainly that this is a demo — which is more
 * honest than showing a permission flow whose answers change nothing.
 *
 * The priming screens themselves are still reachable and still render; this
 * only removes the wait for a system dialog that will not come.
 */
const ALL_GRANTED: PermissionsSnapshot = {
  foregroundLocation: 'granted',
  backgroundLocation: 'granted',
  notifications: 'granted',
};

export const PermissionsService = {
  async snapshot(): Promise<PermissionsSnapshot> {
    return ALL_GRANTED;
  },
  async requestForegroundLocation(): Promise<PermissionState> {
    return 'granted';
  },
  async requestBackgroundLocation(): Promise<PermissionState> {
    return 'granted';
  },
  async requestNotifications(): Promise<PermissionState> {
    return 'granted';
  },
  async areLocationServicesEnabled(): Promise<boolean> {
    return true;
  },
};
