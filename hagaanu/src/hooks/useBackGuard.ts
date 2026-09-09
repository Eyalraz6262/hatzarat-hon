import { useEffect } from 'react';
import { BackHandler, Platform } from 'react-native';

/**
 * Consumes the Android hardware back press while `active`.
 *
 * Used by exactly one screen: the alarm. Someone shaken awake at 05:40 presses
 * back reflexively, and the RN default would background the app — taking away
 * the one screen whose entire job is to tell them where they are and let them
 * say they are awake. The sound would keep playing from a screen they can no
 * longer see.
 *
 * Deliberately NOT applied to the wake pass: the alarm survives backgrounding
 * by design, so trapping someone on that screen would be the worse bug.
 *
 * No-op on iOS, which has no hardware back.
 */
export function useBackGuard(active: boolean): void {
  useEffect(() => {
    if (!active || Platform.OS !== 'android') return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => subscription.remove();
  }, [active]);
}
