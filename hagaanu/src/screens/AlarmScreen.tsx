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
import type { AlarmReason, Destination } from '../types';
import { formatDistance } from '../utils/geo';

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
  reason = 'arrived',
  lastDistanceM = null,
  onDismiss,
  onSnooze,
}: {
  destination: Destination;
  /** Why we are ringing. Changes what the screen says, not how loud it is. */
  reason?: AlarmReason;
  /** The last distance we actually measured, for the lost-signal message. */
  lastDistanceM?: number | null;
  onDismiss: () => void;
  /** Silences it and rings again in two minutes. */
  onSnooze?: () => void;
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
                { borderColor: s.alarm.on, opacity: ringFade, transform: [{ scale: ringScale }] },
              ]}
              pointerEvents="none"
            />
            <View style={[styles.core, { backgroundColor: s.alarm.on }]} />
          </View>

          <View style={styles.copy}>
            <Txt variant="display" tone="onAlarm" style={styles.title}>
              {headline(reason)}
            </Txt>
            <Txt variant="body" tone="alarmDim" style={styles.title}>
              {detail(reason, destination.label, lastDistanceM)}
            </Txt>
          </View>
        </View>

        {/*
          Snooze is offered on every reason, because "two more minutes" is a
          request about the person, not about the trip: they heard it, they are
          not ready, and two minutes is short enough that it cannot outlast the
          stop it was pressed at.
        */}
        {onSnooze ? (
          <Touch
            accessibilityRole="button"
            accessibilityLabel={t('snooze.action')}
            onPress={() => {
              Feedback.tick();
              onSnooze();
            }}
            style={[styles.again, { borderColor: s.alarm.line }]}
          >
            <Txt variant="captionStrong" tone="onAlarm">
              {t('snooze.action')}
            </Txt>
          </Touch>
        ) : null}

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
              backgroundColor: s.alarm.on,
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

/**
 * What the screen says.
 *
 * Three reasons, three headlines. Someone opening their eyes to "you are here"
 * stands up; to "you went past" checks the window; to "we lost signal" looks
 * outside before doing anything. Collapsing them into one line would make the
 * app confidently wrong two times out of three.
 */
function headline(reason: AlarmReason): string {
  if (reason === 'overshot') return t('alarm.overshotScreenTitle');
  if (reason === 'stale') return t('alarm.staleScreenTitle');
  return t('alarm.title');
}

function detail(reason: AlarmReason, destination: string, lastDistanceM: number | null): string {
  if (reason === 'overshot') return t('alarm.overshotScreenBody', { destination });
  if (reason === 'stale') {
    const where = t('alarm.staleScreenBody', { destination });
    // The last measured distance is the one honest fact we have here, so it is
    // said out loud rather than left implied.
    return lastDistanceM === null
      ? where
      : `${where} ${t('alarm.staleBody', { distance: formatDistance(lastDistanceM) })}`;
  }
  return t('alarm.body', { destination });
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
  /**
   * The secondary action, and deliberately quiet: outlined rather than filled,
   * and above the dismiss target rather than beside it. On this screen there
   * is one thing to press, and everything else must stay out of its way.
   */
  again: {
    minHeight: 52,
    marginBottom: space.md,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
