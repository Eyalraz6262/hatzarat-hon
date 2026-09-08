import { getLocales } from 'expo-localization';

import { setLanguage, type Language } from './index';
import { log } from '../utils/logger';

const SUPPORTED: Language[] = ['he', 'en', 'ar', 'ru'];

/**
 * Picks the language for this launch.
 *
 * An explicit choice in settings always wins. Otherwise the device's preferred
 * languages are walked in order and the first one the app ships is used —
 * walked rather than just reading the first, because a phone set to
 * German-then-Russian should get Russian rather than falling all the way
 * through to Hebrew.
 *
 * Falls back to Hebrew, which is the source language and the launch market.
 *
 * What this deliberately does NOT do is call `I18nManager.forceRTL`. React
 * Native fixes layout direction at native startup, so forcing it here would
 * either do nothing or require an immediate restart; the settings screen tells
 * the user a restart is needed instead of the app silently reloading under them.
 */
export function resolveLanguage(preference: Language | null | undefined): Language {
  if (preference && SUPPORTED.includes(preference)) {
    setLanguage(preference);
    return preference;
  }

  try {
    for (const locale of getLocales()) {
      const code = locale.languageCode?.toLowerCase();
      if (code && SUPPORTED.includes(code as Language)) {
        setLanguage(code as Language);
        return code as Language;
      }
    }
  } catch (error) {
    log.warn('app', 'could not read device locales', error);
  }

  setLanguage('he');
  return 'he';
}
