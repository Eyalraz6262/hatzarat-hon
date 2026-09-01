import { useEffect, useRef } from 'react';
import { Alert, Animated, Easing, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { t } from '../i18n';
import { Feedback } from '../services/feedback/Haptics';
import { MAX_DISPLAY_SCALE, spacing, type, useTheme } from '../theme';
import type { Destination } from '../types';
import { formatDistance } from '../utils/geo';
import { Barcode, BrandGlyph, Crescent } from '../components/icons';
import { PaperGrain } from '../components/ui/PaperGrain';
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
  const theme = useTheme();
  // The pass is a paper object end to end, so every colour on it comes from
  // the ticket surface — the world only shows through the perforation punches.
  const s = theme.ticket;
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
    <View style={[styles.screen, { backgroundColor: s.bg }]}>
      <PaperGrain />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* stub */}
        <View style={[styles.stub, { flexDirection: row() }]}>
          <BrandGlyph size={28} />
          <Text style={[styles.brand, { color: s.textPrimary }]}>{t('brand.name')}</Text>
          <Text style={[styles.plate, { color: s.textMuted }]}>{t('plate.wakePass')}</Text>
        </View>

        <Perforation behind={theme.world.bg} dashes={s.faint} />

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
            <Crescent size={300} color={s.raised} nodeColor={s.raised} showNode={false} />
          </Animated.View>

          <View style={styles.headline}>
            <StatusMark label={t('active.statusActive')} surface={s} />
            <Text
              style={[styles.title, { color: s.textPrimary, textAlign: align() }]}
              maxFontSizeMultiplier={MAX_DISPLAY_SCALE}
            >
              {t('active.sleepTitle')}
            </Text>
            <Text style={[styles.subtitle, { color: s.textSecondary, textAlign: align() }]}>
              {t('active.sleepSubtitle')}
            </Text>
          </View>

          <View style={styles.board}>
            <BoardRow label={t('active.destination')} surface={s} divided={false}>
              <Text style={[styles.boardName, { color: s.textPrimary }]} numberOfLines={1}>
                {destination.label}
              </Text>
            </BoardRow>

            <BoardRow label={t('active.currentDistance')} surface={s}>
              {distanceM === null ? (
                <Text style={[styles.pending, { color: s.textMuted }]}>{t('active.statusWaitingFix')}</Text>
              ) : (
                <Readout
                  {...splitDistance(distanceM)}
                  color={s.textPrimary}
                  unitColor={s.textSecondary}
                />
              )}
            </BoardRow>

            <BoardRow label={t('active.alertRadius')} surface={s}>
              <Readout
                {...splitDistance(radiusM)}
                color={theme.accent.onPaper}
                unitColor={theme.accent.onPaper}
              />
            </BoardRow>
          </View>
        </ScrollView>

        {/* foot */}
        <View style={styles.foot}>
          <View style={[styles.code, { flexDirection: row() }]}>
            <Barcode width={176} height={38} color={s.textPrimary} />
            <Text style={[styles.codeText, { color: s.textMuted }]}>{t('alarm.ticketCode', { radius: radiusM })}</Text>
          </View>

          <OutlineButton label={t('active.cancelAlarm')} surface={s} onPress={confirmCancel} />

          {/* Development only. Fires the full arrival path — notification,
              sound, vibration, wake screen — without physically travelling. */}
          {__DEV__ && onSimulateArrival ? (
            <OutlineButton label="סימולציית הגעה · DEV" surface={s} onPress={onSimulateArrival} />
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
    overflow: 'hidden',
  },
  safe: {
    flex: 1,
  },
  stub: {
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  brand: {
    ...type.subtitle,
  },
  plate: {
    ...type.label,
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
  },
  subtitle: {
    ...type.body,
  },
  board: {
    marginTop: spacing.xxl,
  },
  boardName: {
    ...type.heading,
    // Was a hardcoded 190px, which truncated station names on wider phones for
    // no reason. The row's leader already absorbs the slack.
    flexShrink: 1,
  },
  pending: {
    ...type.labelHeSmall,
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
    marginStart: 'auto',
    paddingBottom: 4,
  },
});
