import AsyncStorage from '@react-native-async-storage/async-storage';

import type { AlarmSession } from '../../types';
import { log } from '../../utils/logger';

const KEY = '@hagaanu/alarm-session/v1';

/**
 * Disk-backed store for the armed alarm.
 *
 * Why this exists instead of only React state: a geofence event can wake the app
 * process while no UI is mounted (screen off, app swiped away). The background
 * task needs to know *which* destination is armed, and the UI needs to learn on
 * next launch that the alarm already fired. Disk is the only shared ground.
 */
export const AlarmStorage = {
  async read(): Promise<AlarmSession | null> {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (!raw) return null;
      return JSON.parse(raw) as AlarmSession;
    } catch (error) {
      log.error('store', 'failed to read alarm session', error);
      return null;
    }
  },

  async write(session: AlarmSession): Promise<void> {
    try {
      await AsyncStorage.setItem(KEY, JSON.stringify(session));
    } catch (error) {
      log.error('store', 'failed to write alarm session', error);
    }
  },

  /** Read-modify-write. Returns the updated session, or null if none was armed. */
  async patch(patch: Partial<AlarmSession>): Promise<AlarmSession | null> {
    const current = await AlarmStorage.read();
    if (!current) return null;
    const next = { ...current, ...patch };
    await AlarmStorage.write(next);
    return next;
  },

  async clear(): Promise<void> {
    try {
      await AsyncStorage.removeItem(KEY);
    } catch (error) {
      log.error('store', 'failed to clear alarm session', error);
    }
  },
};
