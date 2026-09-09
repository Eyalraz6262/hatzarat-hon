import { I18nManager } from 'react-native';

import { isRTLLanguage, type Language } from './index';

/**
 * Tells the platform which way the interface runs.
 *
 * Our own components never wait for this — `row()` and `align()` read the
 * language directly, so the first frame of the first launch is already
 * correct. This is for the parts we do not draw: the caret in a `TextInput`,
 * the button order in an `Alert`.
 *
 * On a device it only takes effect on the NEXT launch, because React Native
 * fixes layout direction at native startup. The settings screen says so rather
 * than reloading the app under the user.
 */
export function applyDirection(language: Language): void {
  const rtl = isRTLLanguage(language);
  if (I18nManager.isRTL !== rtl) I18nManager.forceRTL(rtl);
}
