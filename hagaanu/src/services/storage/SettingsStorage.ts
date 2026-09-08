import AsyncStorage from '@react-native-async-storage/async-storage';

import { normaliseSettings, DEFAULT_SETTINGS, type Settings } from './settings';
import { log } from '../../utils/logger';

/**
 * Reading and writing preferences.
 *
 * The rules live in `settings.ts`; this file is only the I/O. One key rather
 * than one per preference: the object is small, and separate keys would make a
 * half-written settings state possible for no benefit.
 */

const KEY = 'hagaanu:settings:v1';

export const SettingsStorage = {
  /** Never rejects. A failed read means defaults, not a broken app. */
  async read(): Promise<Settings> {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (!raw) return { ...DEFAULT_SETTINGS };
      return normaliseSettings(JSON.parse(raw));
    } catch (error) {
      log.warn('store', 'settings read failed, using defaults', error);
      return { ...DEFAULT_SETTINGS };
    }
  },

  async write(settings: Settings): Promise<void> {
    try {
      await AsyncStorage.setItem(KEY, JSON.stringify(settings));
    } catch (error) {
      log.error('store', 'settings write failed', error);
    }
  },
};
