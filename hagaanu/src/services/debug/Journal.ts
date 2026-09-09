import AsyncStorage from '@react-native-async-storage/async-storage';

import { appendEntry, mergeEntries, type JournalEntry, type JournalKind } from './entries';

export type { JournalEntry, JournalKind } from './entries';
export { ago, stamp, JOURNAL_MAX } from './entries';

const KEY = '@hagaanu/journal/v1';

/**
 * Reads and writes the trip journal.
 *
 * Two properties matter more than anything else here:
 *
 *   It never throws. This is instrumentation; a failure to record what
 *   happened must never become the reason something stops happening. Every
 *   path swallows its error and returns.
 *
 *   It never blocks the caller. `record` is fire-and-forget from the alarm
 *   path's point of view — an await on a disk write has no business sitting
 *   between a geofence event and the sound.
 */
export const Journal = {
  async read(): Promise<JournalEntry[]> {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as JournalEntry[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  /**
   * Writes one line.
   *
   * Re-reads immediately before writing and merges, because the background
   * task and the foreground app are separate JS contexts that can both hold a
   * copy of this list. That is not a theoretical race here — it is the normal
   * case, since the lines worth having are written while the app is asleep.
   */
  async record(kind: JournalKind, text: string): Promise<void> {
    try {
      const entry: JournalEntry = { at: Date.now(), kind, text };
      const existing = await Journal.read();
      await AsyncStorage.setItem(KEY, JSON.stringify(appendEntry(existing, entry)));
    } catch {
      // Instrumentation never breaks the thing it is instrumenting.
    }
  },

  /** Folds in entries held in memory elsewhere, keeping both sides. */
  async merge(entries: JournalEntry[]): Promise<JournalEntry[]> {
    try {
      const next = mergeEntries(await Journal.read(), entries);
      await AsyncStorage.setItem(KEY, JSON.stringify(next));
      return next;
    } catch {
      return entries;
    }
  },

  async clear(): Promise<void> {
    try {
      await AsyncStorage.removeItem(KEY);
    } catch {
      // As above.
    }
  },
};
