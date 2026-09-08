import { create } from 'zustand';

import { SettingsStorage } from '../services/storage/SettingsStorage';
import { DEFAULT_SETTINGS, type Settings } from '../services/storage/settings';

/**
 * Preferences, in memory.
 *
 * Every setter writes through to disk immediately rather than debouncing. The
 * volume of writes is a handful per session, and the alternative is a user who
 * changes the alarm tone, force-quits, and finds the old one at 03:00.
 *
 * `ready` exists so the app can hold the splash until preferences are loaded:
 * rendering with defaults and then swapping to the real theme is a visible
 * flash on every cold start.
 */

type SettingsState = Settings & {
  ready: boolean;
  hydrate: () => Promise<void>;
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...DEFAULT_SETTINGS,
  ready: false,

  async hydrate() {
    const stored = await SettingsStorage.read();
    set({ ...stored, ready: true });
  },

  set(key, value) {
    set({ [key]: value } as Pick<Settings, typeof key>);
    const { ready, hydrate, set: _set, ...rest } = get();
    void SettingsStorage.write(rest as Settings);
  },
}));

/**
 * Reads the current settings outside React.
 *
 * The alarm can start from a background task with no component mounted, so the
 * services that need a preference read it this way rather than through a hook.
 */
export function currentSettings(): Settings {
  const { ready, hydrate, set, ...rest } = useSettingsStore.getState();
  return rest as Settings;
}
