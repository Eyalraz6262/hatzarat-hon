import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useKeepAwake } from 'expo-keep-awake';

import { useBackGuard } from '../hooks/useBackGuard';
import { t } from '../i18n';
import { Feedback } from '../services/feedback/Haptics';
import { colors, spacing, type } from '../theme';
import type { Destination } from '../types';
import { SignalBurst } from '../components/icons';
import { SignalButton, row } from '../components/ui';

type Props = {
  destination: Destination;
  onDismiss: () => void;
};

/**
 * The wake screen.
 *
 * The one place the accent takes the whole surface. Every other screen rations
 * orange to a single mark, which is exactly what makes this flood read as an
 * alarm — recognisable through half-open eyes before any word is parsed.
 *
 * Everything on it is sized for someone who just woke up: one message, one
 * enormous button, maximum contrast, nothing else to parse or mis-tap.
 */
export function AlarmScreen({ destination, onDismiss }: Props) {
  // Someone woken by this must be able to read it without the screen dimming
  // out from under them.
  useKeepAwake();
  // ...or accidentally dismiss it with a reflex back press.
  useBackGuard(true);

  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 1400,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.5] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] });

  return (
    <View style={styles.screen}>
      {/* Platform-edge hazard marking. */}
      <View style={styles.hazard}>
        {Array.from({ length: 30 }, (_, index) => (
          <View key={index} style={styles.hazardTick} />
        ))}
      </View>

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={[styles.plateRow, { flexDirection: row() }]}>
          <View style={styles.plateDot} />
          <Text style={styles.plate}>{t('plate.alarm')}</Text>
        </View>

        <View style={styles.body}>
          <View style={styles.beacon}>
            <Animated.View
              style={[styles.ring, { transform: [{ scale }], opacity }]}
              pointerEvents="none"
            />
            <SignalBurst size={168} color={colors.ink} />
          </View>

          <Text style={styles.title}>{t('alarm.title')}</Text>
          <Text style={styles.subtitle}>{t('alarm.subtitle')}</Text>

          <View style={[styles.destination, { flexDirection: row() }]}>
            <Text style={styles.destinationLabel}>{t('active.destination')}</Text>
            <Text style={styles.destinationName} numberOfLines={1}>
              {destination.label}
            </Text>
          </View>
        </View>

        <SignalButton
          label={t('alarm.dismiss')}
          tone="ink"
          onPress={() => {
            Feedback.release();
            onDismiss();
          }}
          style={styles.dismiss}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.signal,
  },
  hazard: {
    position: 'absolute',
    top: 0,
    start: 0,
    end: 0,
    height: 14,
    flexDirection: 'row',
    gap: 13,
    overflow: 'hidden',
  },
  hazardTick: {
    width: 9,
    height: 14,
    backgroundColor: colors.ink,
    transform: [{ skewX: '-25deg' }],
  },
  safe: {
    flex: 1,
    paddingHorizontal: 26,
    paddingBottom: spacing.xl,
    justifyContent: 'space-between',
  },
  plateRow: {
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.xl,
  },
  plateDot: {
    width: 8,
    height: 8,
    backgroundColor: colors.ink,
  },
  plate: {
    ...type.labelStrong,
    color: colors.ink,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
  },
  beacon: {
    width: 168,
    height: 168,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: 116,
    height: 116,
    borderRadius: 58,
    backgroundColor: colors.ink,
  },
  title: {
    ...type.heroAlarm,
    color: colors.ink,
    textAlign: 'center',
  },
  subtitle: {
    ...type.subtitle,
    fontSize: 24,
    color: colors.ink,
    textAlign: 'center',
  },
  destination: {
    alignItems: 'center',
    gap: spacing.sm,
    borderTopWidth: 1.5,
    borderTopColor: colors.inkOnSignalLine,
    paddingTop: 14,
    maxWidth: '100%',
  },
  destinationLabel: {
    ...type.labelHe,
    color: colors.inkOnSignal,
  },
  destinationName: {
    ...type.bodyStrong,
    color: colors.ink,
    flexShrink: 1,
  },
  dismiss: {
    height: 76,
  },
});
