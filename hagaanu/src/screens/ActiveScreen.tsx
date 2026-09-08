import { useMemo } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ApproachGauge } from '../components/route/ApproachGauge';
import { buildApproach } from '../components/route/approach';
import { Card, Chip, DangerButton, GhostButton, Row, Touch, Txt, row } from '../components/ui';
import { t } from '../i18n';
import { Feedback } from '../services/feedback/Haptics';
import { space, useTheme } from '../theme';
import type { Destination, LatLng, Leg } from '../types';
import { formatDistance } from '../utils/geo';

type Props = {
  destination: Destination;
  radiusM: number;
  distanceM: number | null;
  here: LatLng | null;
  /** Legs still to come. Present only on a journey with a change. */
  remaining: Leg[];
  /** True while the fix has gone stale and the distance below is not current. */
  stale: boolean;
  /** True once we caught the OS tearing our monitors down mid-trip. */
  killed: boolean;
  onDismissKilled: () => void;
  onOpenBatterySettings: () => void;
  onCancel: () => void;
  /** Development only — fires the full arrival path without travelling. */
  onSimulateArrival?: () => void;
};

/**
 * The armed state.
 *
 * The screen wakes up before the passenger does. For most of a trip it is
 * almost empty — one number and a sentence saying they can sleep — and it
 * becomes more present as the moment approaches. That progression is the
 * design, and it comes from taking the honest position seriously: far from the
 * destination there is genuinely nothing to decide, and a screen that fills
 * that stretch with things to read is a screen that gets closed before the
 * part that matters.
 *
 * It used to lead with "3 stops to go", counted from transit stops near the
 * straight line to the destination. The app has no idea which line the
 * passenger is on, whether it is a bus, a train or a shuttle, or which stops
 * that vehicle serves — so the most confident number on the screen was the
 * least reliable thing in the app. It is gone. What is left is measured.
 */
export function ActiveScreen({
  destination,
  radiusM,
  distanceM,
  here,
  remaining,
  stale,
  killed,
  onDismissKilled,
  onOpenBatterySettings,
  onCancel,
  onSimulateArrival,
}: Props) {
  const s = useTheme();

  const approach = useMemo(
    () => buildApproach(here, destination, radiusM, remaining),
    [here, destination, radiusM, remaining]
  );

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

  const phase = stale ? 'far' : approach.phase;
  const next = remaining.length ? remaining[remaining.length - 1].destination : null;

  return (
    <View style={[styles.screen, { backgroundColor: s.bg }]}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
        >
          {/*
            Above everything, because "the system stopped your alarm last time"
            outranks anything else here. Dismissible, and only offered after a
            real failure — never during onboarding.
          */}
          {killed ? (
            <Card style={{ borderColor: s.danger, borderWidth: 1.5 }}>
              <Txt variant="labelStrong" tone="danger">
                {t('active.killedTitle')}
              </Txt>
              <Txt variant="caption" tone="muted" style={styles.noticeBody}>
                {t('active.killedBody')}
              </Txt>
              <View style={[styles.noticeActions, { flexDirection: row() }]}>
                <Touch
                  accessibilityRole="button"
                  accessibilityLabel={t('active.killedAction')}
                  onPress={onOpenBatterySettings}
                >
                  <Txt variant="captionStrong" tone="accent">
                    {t('active.killedAction')}
                  </Txt>
                </Touch>
                <Touch
                  accessibilityRole="button"
                  accessibilityLabel={t('common.close')}
                  onPress={onDismissKilled}
                >
                  <Txt variant="captionStrong" tone="muted">
                    {t('common.close')}
                  </Txt>
                </Touch>
              </View>
            </Card>
          ) : null}

          <Chip
            label={
              stale
                ? t('active.noSignal')
                : phase === 'arriving'
                  ? t('approach.almost')
                  : phase === 'closing'
                    ? t('approach.closing')
                    : t('active.statusActive')
            }
            live={!stale}
          />

          {/*
            The one number. It is the distance to the thing we will wake you
            for next — the transfer on the first leg of a journey with a
            change, the destination otherwise — because that is the only
            distance that decides anything.
          */}
          <View style={styles.headline}>
            {distanceM === null || stale ? (
              <Txt variant="title" tone="muted">
                {stale ? t('active.noSignal') : t('active.waitingFix')}
              </Txt>
            ) : (
              <View style={[styles.reading, { flexDirection: row() }]}>
                <Txt variant="counter" tone="accent" nums>
                  {formatDistance(approach.hereM ?? distanceM).replace(/[^\d.,]/g, '')}
                </Txt>
                <Txt variant="label" tone="muted" style={styles.unit}>
                  {unitOf(approach.hereM ?? distanceM)}
                  {'\n'}
                  {next ? t('approach.toTransfer') : t('approach.toGo')}
                </Txt>
              </View>
            )}

            <Txt variant="body" tone="muted" style={styles.reassure}>
              {stale
                ? t('active.noSignalBody', {
                    distance: distanceM === null ? '' : formatDistance(distanceM),
                  })
                : phase === 'arriving'
                  ? t('active.body')
                  : t('approach.sleep') + ' · ' + t('active.body')}
            </Txt>
          </View>

          {/*
            Drawn only once it can be drawn truthfully. Further out a 500 m
            ring inside a 40 km trip is a hairline, and a gauge whose most
            important mark is invisible is worse than no gauge at all.
          */}
          {phase !== 'far' ? (
            <Card>
              <ApproachGauge approach={approach} />
            </Card>
          ) : null}

          <Card>
            <Row label={t('active.destination')} first>
              <Txt variant="labelStrong" numberOfLines={1}>
                {destination.label}
              </Txt>
            </Row>
            {next ? (
              <Row label={t('approach.then')}>
                <Txt variant="labelStrong" numberOfLines={1}>
                  {next.label}
                </Txt>
              </Row>
            ) : null}
            <Row label={t('active.distanceLeft')}>
              {/*
                A stale distance is shown muted rather than hidden: the last
                thing we actually measured is useful, and presenting it as live
                would be the app quietly lying.
              */}
              <Txt variant="labelStrong" tone={stale ? 'muted' : 'ink'} nums>
                {distanceM === null ? t('active.waitingFix') : formatDistance(distanceM)}
              </Txt>
            </Row>
            <Row label={t('active.wakeRange')}>
              <Txt variant="labelStrong" tone="accent" nums>
                {formatDistance(radiusM)}
              </Txt>
            </Row>
          </Card>
        </ScrollView>

        <View style={[styles.dock, { borderTopColor: s.line }]}>
          <DangerButton label={t('active.cancel')} onPress={confirmCancel} />

          {/* Development only. Fires the full arrival path — notification,
              sound, vibration, wake screen — without physically travelling. */}
          {__DEV__ && onSimulateArrival ? (
            <GhostButton label="סימולציית הגעה · DEV" onPress={onSimulateArrival} />
          ) : null}
        </View>
      </SafeAreaView>
    </View>
  );
}

/** The unit `formatDistance` chose, split off so the number can be set larger. */
function unitOf(metres: number): string {
  return formatDistance(metres).replace(/[\d.,\s]/g, '');
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1 },
  scroll: { flex: 1 },
  body: {
    paddingHorizontal: space.screen,
    paddingTop: space.lg,
    paddingBottom: space.xxxl,
    gap: space.lg,
  },
  headline: {
    gap: space.md,
  },
  reading: {
    alignItems: 'flex-end',
    gap: space.md,
  },
  unit: {
    paddingBottom: 6,
  },
  reassure: {
    maxWidth: '92%',
  },
  noticeBody: {
    marginTop: space.xs,
  },
  noticeActions: {
    marginTop: space.md,
    gap: space.xl,
  },
  dock: {
    paddingHorizontal: space.screen,
    paddingTop: space.md,
    paddingBottom: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: space.sm,
  },
});
