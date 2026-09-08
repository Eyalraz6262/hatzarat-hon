import { DEFAULT_RADIUS_M, RADIUS_PRESETS } from '../../constants/config';
import { DEFAULT_SOUND_ID, isAlarmSoundId, type AlarmSoundId } from '../audio/catalog';

/**
 * The settings shape, its defaults, and the rule for reading one off disk.
 *
 * Pure: no storage, no assets, no platform. `SettingsStorage` next door does
 * the I/O. Everything worth testing is here, and the rule it enforces is that
 * NO value on disk — missing, stale, half-written, corrupt — can produce a
 * settings object that crashes a screen or silences an alarm. That matters
 * more here than in most preference files: a garbage `soundId` read at 03:00
 * has to degrade to the default tone, not to no tone.
 */

export type ThemeMode = 'system' | 'light' | 'dark';
export type LanguageCode = 'he' | 'en' | 'ar' | 'ru';

export type Settings = {
  soundId: AlarmSoundId;
  vibrate: boolean;
  /**
   * Playback gain, 0.2 to 1.0.
   *
   * This is the app's own player level, NOT the device volume. No app can set
   * system volume on iOS, and doing it to the alarm stream on Android would be
   * hostile. The settings screen says so in as many words rather than letting
   * the control imply a power it does not have.
   */
  volume: number;
  defaultRadiusM: number;
  theme: ThemeMode;
  /** Null means "follow the device language". */
  language: LanguageCode | null;
  crashReports: boolean;
  /** True once the first-run demo has played, so it is not offered twice. */
  demoSeen: boolean;
  /** True once the Android battery-optimisation note has been shown. */
  batteryNoticeSeen: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
  soundId: DEFAULT_SOUND_ID,
  vibrate: true,
  volume: 1.0,
  defaultRadiusM: DEFAULT_RADIUS_M,
  theme: 'system',
  language: null,
  crashReports: true,
  demoSeen: false,
  batteryNoticeSeen: false,
};

export const MIN_VOLUME = 0.2;

const THEMES: ThemeMode[] = ['system', 'light', 'dark'];
export const LANGUAGES: LanguageCode[] = ['he', 'en', 'ar', 'ru'];

function bool(value: unknown, fallback: boolean): boolean {
  // Only a real boolean counts. A string "false" from a bad round trip must
  // not read as true, which is what a truthiness check would do.
  return typeof value === 'boolean' ? value : fallback;
}

export function normaliseSettings(raw: unknown): Settings {
  const r = (raw ?? {}) as Partial<Settings>;

  const radius = Number(r.defaultRadiusM);
  const volume = Number(r.volume);

  return {
    soundId: isAlarmSoundId(r.soundId) ? r.soundId : DEFAULT_SETTINGS.soundId,
    vibrate: bool(r.vibrate, DEFAULT_SETTINGS.vibrate),
    volume: Number.isFinite(volume)
      ? Math.min(1, Math.max(MIN_VOLUME, volume))
      : DEFAULT_SETTINGS.volume,
    defaultRadiusM: (RADIUS_PRESETS as readonly number[]).includes(radius)
      ? radius
      : DEFAULT_SETTINGS.defaultRadiusM,
    theme: THEMES.includes(r.theme as ThemeMode) ? (r.theme as ThemeMode) : DEFAULT_SETTINGS.theme,
    language: LANGUAGES.includes(r.language as LanguageCode) ? (r.language as LanguageCode) : null,
    crashReports: bool(r.crashReports, DEFAULT_SETTINGS.crashReports),
    demoSeen: bool(r.demoSeen, DEFAULT_SETTINGS.demoSeen),
    batteryNoticeSeen: bool(r.batteryNoticeSeen, DEFAULT_SETTINGS.batteryNoticeSeen),
  };
}
