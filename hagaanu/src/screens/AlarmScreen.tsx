import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useKeepAwake } from 'expo-keep-awake';

import { useBackGuard } from '../hooks/useBackGuard';
import { t } from '../i18n';
import { Feedback } from '../services/feedback/Haptics';
import { MAX_DISPLAY_SCALE, spacing, type, useTheme } from '../theme';
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
  // The alarm does not follow the scheme. It is an event, not a surface: the
  // same orange flood at 05:40 in winter dark and at 07:20 in summer light.
  const { alarm } = useTheme();
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
    <View style={[styles.screen, { backgroundColor: alarm.bg }]}>
      {/* Platform-edge hazard marking. */}
      <View style={styles.hazard}>
        {Array.from({ length: 30 }, (_, index) => (
          <View key={index} style={[styles.hazardTick, { backgroundColor: alarm.ink }]} />
        ))}
      </View>

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={[styles.plateRow, { flexDirection: row() }]}>
          <View style={[styles.plateDot, { backgroundColor: alarm.ink }]} />
          <Text style={[styles.plate, { color: alarm.ink }]}>{t('plate.alarm')}</Text>
        </View>

        <View style={styles.body}>
          <View style={styles.beacon}>
            <Animated.View
              style={[styles.ring, { backgroundColor: alarm.ink, transform: [{ scale }], opacity }]}
              pointerEvents="none"
            />
            <SignalBurst size={168} color={alarm.ink} />
          </View>

          <Text style={[styles.title, { color: alarm.ink }]} maxFontSizeMultiplier={MAX_DISPLAY_SCALE}>
            {t('alarm.title')}
          </Text>
          <Text style={[styles.subtitle, { color: alarm.ink }]} maxFontSizeMultiplier={MAX_DISPLAY_SCALE}>
            {t('alarm.subtitle')}
          </Text>

          <View style={[styles.destination, { borderTopColor: alarm.line, flexDirection: row() }]}>
            <Text style={[styles.destinationLabel, { color: alarm.muted }]}>{t('active.destination')}</Text>
            <Text style={[styles.destinationName, { color: alarm.ink }]} numberOfLines={1}>
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
  },
  hazard: {
    position: 'absolute',
    top: 0,
    start: 0,
    end: 0,
    height: 14,
    flexDirection: 'row',
    gap: 12,
    overflow: 'hidden',
  },
  hazardTick: {
    width: 9,
    height: 14,
    transform: [{ skewX: '-25deg' }],
  },
  safe: {
    flex: 1,
    paddingHorizontal: 24,
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
  },
  plate: {
    ...type.labelStrong,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
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
  },
  title: {
    ...type.heroAlarm,
    textAlign: 'center',
  },
  subtitle: {
    ...type.subtitle,
    textAlign: 'center',
  },
  destination: {
    alignItems: 'center',
    gap: spacing.sm,
    borderTopWidth: 1.5,
    paddingTop: 16,
    maxWidth: '100%',
  },
  destinationLabel: {
    ...type.labelHe,
  },
  destinationName: {
    ...type.bodyStrong,
    flexShrink: 1,
  },
  dismiss: {
    height: 76,
  },
});
