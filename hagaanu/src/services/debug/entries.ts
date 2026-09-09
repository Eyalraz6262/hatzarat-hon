/**
 * The trip journal — the rules, without the storage.
 *
 * A transit alarm fails in the one situation where nobody can watch it: the
 * phone is locked, in a pocket, and the process may not even be alive. By the
 * time the user notices, the evidence is gone. `console.log` does not help —
 * those lines need a cable, and the JS context the OS spins up to deliver a
 * geofence event is not the one the dev menu is attached to.
 *
 * So the moments that matter are written down instead, and the debug screen
 * reads them back. Low volume by design: a handful of lines per trip, not one
 * per fix.
 */

export type JournalKind =
  | 'armed'
  | 'fix'
  | 'geofence'
  | 'alarm'
  | 'early'
  | 'stale'
  | 'repair'
  | 'leg'
  | 'stood-down';

export type JournalEntry = {
  at: number;
  kind: JournalKind;
  /** One line, already formatted. Read on a phone, not parsed. */
  text: string;
};

/**
 * How many entries are kept.
 *
 * Enough for a long trip with a change, small enough that the whole thing is
 * one AsyncStorage read and fits on a screen you can scroll in a few flicks.
 */
export const JOURNAL_MAX = 120;

/**
 * Newest first, capped.
 *
 * Newest first because the question being asked is always "what just
 * happened" — a debug screen that opens on the oldest line is a debug screen
 * that gets scrolled before it gets read.
 */
export function appendEntry(
  entries: JournalEntry[],
  entry: JournalEntry,
  max: number = JOURNAL_MAX
): JournalEntry[] {
  return [entry, ...entries].slice(0, max);
}

/**
 * Merges what another JS context wrote while we were not running.
 *
 * The foreground app and the background task can each hold a copy of this list
 * and write it back, so the loser of that race would otherwise erase the
 * other's lines — which are exactly the lines worth having, since they are the
 * ones nobody could watch. Merging by timestamp and text rather than trusting
 * either copy makes the write order stop mattering.
 */
export function mergeEntries(
  a: JournalEntry[],
  b: JournalEntry[],
  max: number = JOURNAL_MAX
): JournalEntry[] {
  const seen = new Set<string>();
  const merged: JournalEntry[] = [];

  for (const entry of [...a, ...b].sort((x, y) => y.at - x.at)) {
    const key = `${entry.at}|${entry.kind}|${entry.text}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(entry);
  }

  return merged.slice(0, max);
}

/** `14:32:07`, in the phone's own zone — the format the tester's watch shows. */
export function stamp(at: number): string {
  const d = new Date(at);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** `4m 12s` — how long ago, for the ages the debug screen leads with. */
export function ago(ms: number): string {
  if (ms < 0) return '0s';
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}
