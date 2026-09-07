import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useKeepAwake } from 'expo-keep-awake';

import { t } from '../i18n';
import { useBackGuard } from '../hooks/useBackGuard';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { Touch, Txt } from '../components/ui';
import { Feedback } from '../services/feedback/Haptics';
import { motion, radius, space, type, useTheme } from '../theme';
import type { Destination } from '../types';

/**
 * Arrival.
 *
 * The only screen in the app that abandons the design system, and it does so
 * on purpose: the accent stops being an accent and becomes the entire surface.
 * Nothing else in the app is ever a flood of colour, so when this appears
 * there is no ambiguity about what happened, even to someone opening their
 * eyes for the first time in twenty minutes.
 *
 * One target, and it is enormous. A tired person reaching for a phone in a
 * moving vehicle should not have to aim.
 */
export function AlarmScreen({
  destination,
  onDismiss,
}: {
  destination: Destination;
  onDismiss: () => void;
}) {
  const s = useTheme();
  const reduced = useReducedMotion();
  const pulse = useRef(new Animated.Value(0)).current;

  // The screen must stay lit: this is an alarm, and a display that sleeps
  // three seconds in defeats the entire purpose.
  useKeepAwake();

  // Android back must not dismiss the alarm by reflex. Consumed here and
  // nowhere else in the app.
  useBackGuard(true);

  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: motion.pulse / 2,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: motion.pulse / 2,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, reduced]);

  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] });
  const ringFade = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] });

  return (
    <View
      style={[styles.screen, { backgroundColor: s.alarm.bg }]}
      accessibilityViewIsModal
      accessibilityLiveRegion="assertive"
    >
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.body}>
          <View style={styles.beacon}>
            <Animated.View
              style={[
                styles.ring,
                { borderColor: s.alarm.ink, opacity: ringFade, transform: [{ scale: ringScale }] },
              ]}
              pointerEvents="none"
            />
            <View style={[styles.core, { backgroundColor: s.alarm.ink }]} />
          </View>

          <View style={styles.copy}>
            <Txt variant="display" tone="onAlarm" style={styles.title}>
              {t('alarm.title')}
            </Txt>
            <Txt variant="body" tone="alarmDim" style={styles.title}>
              {t('alarm.body', { destination: destination.label })}
            </Txt>
          </View>
        </View>

        <Touch
          accessibilityRole="button"
          accessibilityLabel={t('alarm.dismiss')}
          onPress={() => {
            Feedback.release();
            onDismiss();
          }}
          scaleTo={0.985}
          style={({ pressed }) => [
            styles.dismiss,
            {
              backgroundColor: s.alarm.ink,
              opacity: pressed ? 0.86 : 1,
            },
          ]}
        >
          <Txt style={[type.button, styles.dismissLabel, { color: s.alarm.bg }]}>
            {t('alarm.dismiss')}
          </Txt>
        </Touch>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    ...StyleSheet.absoluteFill,
    zIndex: 100,
  },
  safe: {
    flex: 1,
    paddingHorizontal: space.screen,
    paddingBottom: space.xl,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.huge,
  },
  beacon: {
    width: 132,
    height: 132,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: 132,
    height: 132,
    borderRadius: 66,
    borderWidth: 3,
  },
  core: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  copy: {
    gap: space.md,
    alignItems: 'center',
  },
  title: {
    textAlign: 'center',
  },
  /**
   * 88pt tall. Far past the 44pt floor, because the person pressing it was
   * asleep four seconds ago and the vehicle is moving.
   */
  dismiss: {
    minHeight: 88,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissLabel: {
    textAlign: 'center',
  },
});
