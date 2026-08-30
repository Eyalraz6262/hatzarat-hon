import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

import { log } from '../../utils/logger';

/**
 * Haptic vocabulary.
 *
 * Four distinct sensations, used consistently, so the phone in a pocket says
 * something specific rather than just buzzing:
 *
 *   tick    — a value changed under your thumb (radius, a chip)
 *   commit  — the alarm is armed. The last thing felt before the phone is
 *             pocketed, so it has to be unmistakable without looking.
 *   release — the alarm was cancelled or dismissed.
 *   reject  — something could not be done.
 *
 * Every call is fire-and-forget and swallows its own errors: a device without a
 * haptic engine, or one where the user disabled system haptics, must never
 * break a flow whose real job is waking someone up.
 */

function safely(run: () => Promise<void>): void {
  run().catch((error) => log.debug('app', 'haptic unavailable', error));
}

export const Feedback = {
  tick(): void {
    safely(() =>
      Platform.OS === 'ios'
        ? Haptics.selectionAsync()
        : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    );
  },

  commit(): void {
    safely(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
  },

  release(): void {
    safely(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
  },

  reject(): void {
    safely(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
  },
};
