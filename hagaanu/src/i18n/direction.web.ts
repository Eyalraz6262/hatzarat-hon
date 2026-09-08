import { isRTLLanguage, type Language } from './index';

/**
 * The same job, in a browser, where it is immediate.
 *
 * `I18nManager.forceRTL` does nothing useful on react-native-web: the document
 * direction is read once at startup and the call needs a reload to matter. But
 * the browser has the real control, and setting it takes effect on the next
 * paint — so the web build gets right away what a device only gets on the next
 * launch.
 *
 * This matters for more than symmetry. The document direction is the base
 * direction for bidi resolution, so with it left-to-right a Hebrew sentence
 * ending in a number or a Latin word puts them on the wrong side.
 */
export function applyDirection(language: Language): void {
  const rtl = isRTLLanguage(language);
  if (typeof document === 'undefined') return;
  document.documentElement.dir = rtl ? 'rtl' : 'ltr';
  document.documentElement.lang = language;
}
