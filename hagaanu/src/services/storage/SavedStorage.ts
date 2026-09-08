import AsyncStorage from '@react-native-async-storage/async-storage';

import { log } from '../../utils/logger';
import { orderSaved, savedId, withSaved, type SavedDestination } from './saved';

export { orderSaved } from './saved';
export type { SavedDestination, SavedKind } from './saved';

const KEY = '@hagaanu/saved-destinations/v1';

/**
 * Saved destinations, on disk.
 *
 * The whole point is the repeat commuter: someone riding the same line every
 * morning should arm tomorrow's alarm in one tap, not five. So the list leads
 * with what the user actually uses rather than with what they created first —
 * and with what they pinned above even that.
 *
 * The ordering and the cap live in `./saved` so they can be tested on their
 * own; everything here is the read and the write around them.
 */
export const SavedStorage = {
  async readAll(): Promise<SavedDestination[]> {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as SavedDestination[];
      return Array.isArray(parsed) ? orderSaved(parsed) : [];
    } catch (error) {
      log.error('store', 'failed to read saved destinations', error);
      return [];
    }
  },

  async save(entry: Omit<SavedDestination, 'id' | 'lastUsedAt'>): Promise<SavedDestination[]> {
    const existing = await SavedStorage.readAll();
    const next = withSaved(existing, { ...entry, id: savedId(), lastUsedAt: Date.now() });
    await SavedStorage.write(next);
    return next;
  },

  async touch(id: string): Promise<SavedDestination[]> {
    const existing = await SavedStorage.readAll();
    const next = orderSaved(
      existing.map((item) => (item.id === id ? { ...item, lastUsedAt: Date.now() } : item))
    );
    await SavedStorage.write(next);
    return next;
  },

  /** Pins or unpins a saved route. */
  async setPinned(id: string, pinned: boolean): Promise<SavedDestination[]> {
    const existing = await SavedStorage.readAll();
    const next = orderSaved(existing.map((item) => (item.id === id ? { ...item, pinned } : item)));
    await SavedStorage.write(next);
    return next;
  },

  async remove(id: string): Promise<SavedDestination[]> {
    const next = (await SavedStorage.readAll()).filter((item) => item.id !== id);
    await SavedStorage.write(next);
    return next;
  },

  async write(items: SavedDestination[]): Promise<void> {
    try {
      await AsyncStorage.setItem(KEY, JSON.stringify(items));
    } catch (error) {
      log.error('store', 'failed to write saved destinations', error);
    }
  },
};
