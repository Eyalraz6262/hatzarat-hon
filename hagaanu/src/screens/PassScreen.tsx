import { useEffect, useRef } from 'react';
import { Alert, Animated, Easing, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { t } from '../i18n';
import { Feedback } from '../services/feedback/Haptics';
import { MAX_DISPLAY_SCALE, colors, spacing, type } from '../theme';
import type { Destination } from '../types';
import { formatDistance } from '../utils/geo';
import { Barcode, BrandGlyph, Crescent } from '../components/icons';
import {
  BoardRow,
  OutlineButton,
  Perforation,
  Readout,
  StatusMark,
  align,
  row,
} from '../components/ui';

type Props = {
  destination: Destination;
  radiusM: number;
  distanceM: number | null;
  onCancel: () => void;
  /** Development only — fires the full arrival path without travelling. */
  onSimulateArrival?: () => void;
};

/**
 * The armed state, as a wake pass.
 *
 * This is the screen the user looks at last before pocketing the phone, so its
 * whole job is reassurance: the promise in type large enough to read at arm's
 * length, then the three facts that prove it, set as a printed timetable.
 *
 * It takes the full screen rather than sitting over the map — once the alarm is
 * armed the map has nothing left to say, and a ticket is a thing you hold.
 */
export function PassScreen({
  destination,
  radiusM,
  distanceM,
  onCancel,
  onSimulateArrival,
}: Props) {
  const breath = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // A slow drift on the watermark — the only motion on the screen, and slow
    // enough to read as "running" rather than as something asking for attention.
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, {
          toValue: 1,
          duration: 5200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(breath, {
          toValue: 0,
          duration: 5200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [breath]);

  const watermarkScale = breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] });

  const confirmCancel = () => {
    Alert.alert(t('active.cancelConfirmTitle'), t('active.cancelConfirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('active.cancelConfirmYes'),
        style: 'destructive',
        onPress: () => {
          Feedback.release();
          onCancel();
        },
      },
    ]);
  };

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* stub */}
        <View style={[styles.stub, { flexDirection: row() }]}>
          <BrandGlyph size={28} />
          <Text style={styles.brand}>{t('brand.name')}</Text>
          <Text style={styles.plate}>{t('plate.wakePass')}</Text>
        </View>

        <Perforation behind={colors.ink} />

        {/*
          The promise. Scrolls because the 62px hero plus three data rows leave
          little slack, and a large system font scale would otherwise push the
          distance readout — the whole reason to look at this screen — off the
          bottom with no way to reach it.
        */}
        <ScrollView
          style={styles.bodyScroll}
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[styles.watermark, { transform: [{ scale: watermarkScale }] }]}
            pointerEvents="none"
          >
            <Crescent size={300} color={colors.paperWatermark} showNode={false} />
          </Animated.View>

          <View style={styles.headline}>
            <StatusMark label={t('active.statusActive')} />
            <Text
              style={[styles.title, { textAlign: align() }]}
              maxFontSizeMultiplier={MAX_DISPLAY_SCALE}
            >
              {t('active.sleepTitle')}
            </Text>
            <Text style={[styles.subtitle, { textAlign: align() }]}>
              {t('active.sleepSubtitle')}
            </Text>
          </View>

          <View style={styles.board}>
            <BoardRow label={t('active.destination')} divided={false}>
              <Text style={styles.boardName} numberOfLines={1}>
                {destination.label}
              </Text>
            </BoardRow>

            <BoardRow label={t('active.currentDistance')}>
              {distanceM === null ? (
                <Text style={styles.pending}>{t('active.statusWaitingFix')}</Text>
              ) : (
                <Readout {...splitDistance(distanceM)} tone="ink" />
              )}
            </BoardRow>

            <BoardRow label={t('active.alertRadius')}>
              <Readout {...splitDistance(radiusM)} tone="signal" />
            </BoardRow>
          </View>
        </ScrollView>

        {/* foot */}
        <View style={styles.foot}>
          <View style={[styles.code, { flexDirection: row() }]}>
            <Barcode width={176} height={38} color={colors.ink} />
            <Text style={styles.codeText}>{t('alarm.ticketCode', { radius: radiusM })}</Text>
          </View>

          <OutlineButton label={t('active.cancelAlarm')} onPress={confirmCancel} />

          {/* Development only. Fires the full arrival path — notification,
              sound, vibration, wake screen — without physically travelling. */}
          {__DEV__ && onSimulateArrival ? (
            <OutlineButton label="⚙︎ סימולציית הגעה (dev)" onPress={onSimulateArrival} />
          ) : null}
        </View>
      </SafeAreaView>
    </View>
  );
}

/**
 * Splits a formatted distance into figure and unit so the readout can set them
 * in different faces — the figure in mono, the unit in Hebrew.
 */
function splitDistance(meters: number): { value: string; unit: string } {
  const formatted = formatDistance(meters);
  const match = formatted.match(/^([\d.,]+)\s*(.*)$/);
  return match ? { value: match[1], unit: match[2] } : { value: formatted, unit: '' };
}

const styles = StyleSheet.create({
  screen: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.paper,
  },
  safe: {
    flex: 1,
  },
  stub: {
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  brand: {
    ...type.subtitle,
    color: colors.ink,
  },
  plate: {
    ...type.label,
    color: colors.paperMuted,
    marginStart: 'auto',
  },
  bodyScroll: {
    flex: 1,
  },
  body: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.lg,
  },
  watermark: {
    position: 'absolute',
    top: 12,
    end: -84,
  },
  headline: {
    gap: spacing.md,
  },
  title: {
    ...type.hero,
    color: colors.ink,
  },
  subtitle: {
    ...type.body,
    fontSize: 17,
    color: colors.rail,
  },
  board: {
    marginTop: spacing.xxl,
  },
  boardName: {
    ...type.heading,
    color: colors.ink,
    maxWidth: 190,
  },
  pending: {
    ...type.labelHeSmall,
    color: colors.paperSub,
  },
  foot: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.lg,
  },
  code: {
    alignItems: 'flex-end',
    gap: spacing.lg,
  },
  codeText: {
    ...type.label,
    color: colors.paperMuted,
    marginStart: 'auto',
    paddingBottom: 3,
  },
});
