import { useEffect, useRef } from 'react';
import { Alert, Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { t } from '../../i18n';
import { colors, spacing, typography } from '../../theme';
import type { Destination } from '../../types';
import { formatDistance } from '../../utils/geo';
import { ArrivalCoordinator } from '../../services/alarm/ArrivalCoordinator';
import { Divider, SecondaryButton, StatRow, StatusPill } from '../ui';
import { BottomSheet } from './BottomSheet';

type Props = {
  destination: Destination;
  radiusM: number;
  distanceM: number | null;
  onCancel: () => void;
};

/**
 * Armed state: the reassurance screen.
 *
 * Everything here answers one question — "is it safe to close my eyes?" — so the
 * status indicator and the live distance are the only moving parts, and the
 * single action is cancelling.
 */
export function ActiveSheet({ destination, radiusM, distanceM, onCancel }: Props) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Slow breathing motion on the emoji — a calm "we're awake so you don't
    // have to be" signal rather than an attention-grabbing animation.
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });

  const confirmCancel = () => {
    Alert.alert(t('active.cancelConfirmTitle'), t('active.cancelConfirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('active.cancelConfirmYes'), style: 'destructive', onPress: onCancel },
    ]);
  };

  return (
    <BottomSheet>
      <View style={styles.hero}>
        <Animated.Text style={[styles.emoji, { transform: [{ scale }] }]}>
          {t('active.sleepEmoji')}
        </Animated.Text>
        <Text style={styles.heroTitle}>{t('active.sleepTitle')}</Text>
        <Text style={styles.heroSubtitle}>{t('active.sleepSubtitle')}</Text>
      </View>

      <StatusPill
        label={distanceM === null ? t('active.statusWaitingFix') : t('active.statusActive')}
        tone={distanceM === null ? 'warning' : 'calm'}
      />

      <View>
        <StatRow label={t('active.destination')} value={destination.label} />
        <Divider />
        <StatRow
          label={t('active.currentDistance')}
          value={distanceM === null ? '—' : formatDistance(distanceM)}
        />
        <Divider />
        <StatRow label={t('active.alertRadius')} value={formatDistance(radiusM)} tone="calm" />
      </View>

      <SecondaryButton label={t('active.cancelAlarm')} tone="alert" onPress={confirmCancel} />

      {/* Development only. Fires the full arrival path — notification, sound,
          vibration, wake screen — without needing to physically travel to the
          destination. Stripped from release builds by the __DEV__ constant. */}
      {__DEV__ ? (
        <SecondaryButton
          label="⚙︎ סימולציית הגעה (dev)"
          onPress={() => void ArrivalCoordinator.trigger('manual')}
        />
      ) : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  emoji: {
    fontSize: 44,
    marginBottom: spacing.xs,
  },
  heroTitle: {
    ...typography.title,
    color: colors.text,
    textAlign: 'center',
  },
  heroSubtitle: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
