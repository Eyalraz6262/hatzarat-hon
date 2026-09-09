import { he, type TranslationSchema } from './translations/he';
import { en } from './translations/en';
import { ar } from './translations/ar';
import { ru } from './translations/ru';

export type Language = 'he' | 'en' | 'ar' | 'ru';

const RESOURCES: Record<Language, TranslationSchema> = { he, en, ar, ru };

export const LANGUAGE_NAMES: Record<Language, string> = {
  he: 'עברית',
  en: 'English',
  ar: 'العربية',
  ru: 'Русский',
};

/** Languages that read right-to-left. */
const RTL_LANGUAGES: Language[] = ['he', 'ar'];

/**
 * Hebrew is the source language and the default.
 *
 * `t()` resolves this lazily on every call, so changing it repaints anything
 * that re-renders. What it does NOT do is change layout direction: React
 * Native decides LTR or RTL at native startup, and `I18nManager.forceRTL`
 * only takes effect after a restart. So a user switching between an RTL and an
 * LTR language gets translated strings immediately and correct mirroring on
 * the next launch — and the settings screen says so rather than leaving them
 * looking at a broken layout wondering what happened.
 */
let activeLanguage: Language = 'he';

export function getLanguage(): Language {
  return activeLanguage;
}

export function setLanguage(language: Language): void {
  activeLanguage = language;
}

export function isRTLLanguage(language: Language): boolean {
  return RTL_LANGUAGES.includes(language);
}

export function isRTL(): boolean {
  return RTL_LANGUAGES.includes(activeLanguage);
}

/**
 * Dot-path keys into the translation tree, e.g. `'alarm.title'`.
 * Typed so a renamed or removed key fails at compile time rather than rendering
 * the raw key to a user.
 */
type Leaves<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${Leaves<T[K]>}`;
}[keyof T & string];

export type TranslationKey = Leaves<TranslationSchema>;

type Params = Record<string, string | number>;

function resolve(language: Language, key: string): string | undefined {
  const value = key
    .split('.')
    .reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], RESOURCES[language]);
  return typeof value === 'string' ? value : undefined;
}

/**
 * Translate `key`, interpolating `{placeholders}` from `params`.
 * Falls back to Hebrew, then to the key itself, so a missing string is visible
 * in development instead of rendering as empty space.
 */
export function t(key: TranslationKey, params?: Params): string {
  const template = resolve(activeLanguage, key) ?? resolve('he', key) ?? key;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match
  );
}
