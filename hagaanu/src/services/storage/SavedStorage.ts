import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Destination } from '../../types';
import { log } from '../../utils/logger';

const KEY = '@hagaanu/saved-destinations/v1';
const MAX = 12;

/** The drawn mark a saved destination is filed under. */
export type SavedKind = 'home' | 'work' | 'station' | 'favourite';

export type SavedDestination = {
  id: string;
  name: string;
  kind: SavedKind;
  destination: Destination;
  radiusM: number;
  /** Epoch ms, so the list can lead with what the user actually uses. */
  lastUsedAt: number;
};

/**
 * Saved destinations.
 *
 * The whole point is the repeat commuter: someone riding the same line every
 * morning should arm tomorrow's alarm in one tap, not five. So the list is
 * ordered by last use rather than by creation — the trip you took yesterday is
 * the one you are most likely taking now.
 *
 * Capped at MAX. A saved-places list that grows without limit stops being a
 * shortcut and becomes another thing to search.
 */
export const SavedStorage = {
  async readAll(): Promise<SavedDestination[]> {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as SavedDestination[];
      return Array.isArray(parsed)
        ? [...parsed].sort((a, b) => b.lastUsedAt - a.lastUsedAt)
        : [];
    } catch (error) {
      log.error('store', 'failed to read saved destinations', error);
      return [];
    }
  },

  async save(entry: Omit<SavedDestination, 'id' | 'lastUsedAt'>): Promise<SavedDestination[]> {
    const existing = await SavedStorage.readAll();
    const record: SavedDestination = {
      ...entry,
      id: `${Date.now()}`,
      lastUsedAt: Date.now(),
    };
    // Drop the oldest-used when the cap is reached, never the newest.
    const next = [record, ...existing].slice(0, MAX);
    await SavedStorage.write(next);
    return next;
  },

  async touch(id: string): Promise<SavedDestination[]> {
    const existing = await SavedStorage.readAll();
    const next = existing.map((item) =>
      item.id === id ? { ...item, lastUsedAt: Date.now() } : item
    );
    await SavedStorage.write(next);
    return next.sort((a, b) => b.lastUsedAt - a.lastUsedAt);
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
