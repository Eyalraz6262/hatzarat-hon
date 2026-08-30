import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useKeepAwake } from 'expo-keep-awake';

import { t } from '../i18n';
import { colors, spacing, typography } from '../theme';
import type { Destination } from '../types';
import { PrimaryButton } from '../components/ui';

type Props = {
  destination: Destination;
  onDismiss: () => void;
};

/**
 * The wake-up screen.
 *
 * Shown full-bleed over everything else the moment we detect arrival. Designed to
 * be readable by someone who just opened their eyes: one message, one enormous
 * button, maximum contrast, nothing else to parse or accidentally tap.
 */
export function AlarmScreen({ destination, onDismiss }: Props) {
  // Someone woken by this must be able to read it without the screen dimming out
  // from under them.
  useKeepAwake();

  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 700,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] });

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.content}>
          <View style={styles.beaconWrap}>
            <Animated.View style={[styles.beaconRing, { transform: [{ scale }], opacity }]} />
            <View style={styles.beacon}>
              <Text style={styles.beaconEmoji}>🚨</Text>
            </View>
          </View>

          <Text style={styles.title}>{t('alarm.title')}</Text>
          <Text style={styles.subtitle}>{t('alarm.subtitle')}</Text>
          <Text style={styles.destination} numberOfLines={2}>
            {t('alarm.destination', { destination: destination.label })}
          </Text>
        </View>

        <PrimaryButton
          label={t('alarm.dismiss')}
          tone="alert"
          onPress={onDismiss}
          style={styles.dismissButton}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.bg,
  },
  safe: {
    flex: 1,
    padding: spacing.xl,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  beaconWrap: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  beaconRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.alert,
  },
  beacon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.alertSoft,
    borderWidth: 2,
    borderColor: colors.alert,
    alignItems: 'center',
    justifyContent: 'center',
  },
  beaconEmoji: {
    fontSize: 56,
  },
  title: {
    ...typography.display,
    fontSize: 40,
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.title,
    color: colors.textMuted,
    textAlign: 'center',
  },
  destination: {
    ...typography.body,
    color: colors.textFaint,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  dismissButton: {
    height: 72,
  },
});
