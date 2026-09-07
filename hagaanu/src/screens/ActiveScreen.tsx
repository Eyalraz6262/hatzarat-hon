import { useMemo } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { t } from '../i18n';
import { RouteRail } from '../components/route/RouteRail';
import { buildRail } from '../components/route/rail';
import { Card, Chip, DangerButton, GhostButton, Row, Txt, row } from '../components/ui';
import { Feedback } from '../services/feedback/Haptics';
import type { StopsResult, TransitStop } from '../services/transit/StopsService';
import { space, useTheme } from '../theme';
import type { Destination, LatLng } from '../types';
import { formatDistance } from '../utils/geo';

type Props = {
  destination: Destination;
  radiusM: number;
  distanceM: number | null;
  here: LatLng | null;
  stops: TransitStop[];
  stopsFallback: Extract<StopsResult, { ok: false }>['reason'] | null;
  onCancel: () => void;
  /** Development only — fires the full arrival path without travelling. */
  onSimulateArrival?: () => void;
};

/**
 * The armed state.
 *
 * This is the last screen the user looks at before the phone goes in a pocket,
 * so its whole job is reassurance, and the rail does most of it: the same
 * object from the previous screen, still there, with the passenger's dot on
 * it. Nothing was thrown away and re-drawn; the journey simply continues.
 *
 * The headline is a count of stops rather than a distance because that is the
 * unit the answer arrives in. "Three stops" tells you whether to keep reading
 * your book. "4.3 km" does not.
 */
export function ActiveScreen({
  destination,
  radiusM,
  distanceM,
  here,
  stops,
  stopsFallback,
  onCancel,
  onSimulateArrival,
}: Props) {
  const s = useTheme();

  const rail = useMemo(
    () => buildRail(stops, here, destination, radiusM),
    [stops, here, destination, radiusM]
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

  return (
    <View style={[styles.screen, { backgroundColor: s.bg }]}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.head}>
            <Chip label={t('active.statusActive')} live />
            <Txt variant="display">{t('active.title')}</Txt>
            <Txt variant="body" tone="muted">
              {t('active.body')}
            </Txt>
          </View>

          <Counter stopsToGo={rail.stopsToGo} distanceM={distanceM} radiusM={radiusM} />

          <Card>
            <RouteRail rail={rail} fallback={stopsFallback} loading={false} />
          </Card>

          <Card>
            <Row label={t('active.destination')} first>
              <Txt variant="labelStrong" numberOfLines={1}>
                {destination.label}
              </Txt>
            </Row>
            <Row label={t('active.distanceLeft')}>
              <Txt variant="labelStrong" nums>
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

/**
 * The one number on the screen.
 *
 * Falls back to distance when there is no stop list, and to a plain "any
 * moment now" when the passenger is already inside the ring, because "0 stops
 * to go" reads like the alarm failed rather than like it is about to fire.
 */
function Counter({
  stopsToGo,
  distanceM,
  radiusM,
}: {
  stopsToGo: number | null;
  distanceM: number | null;
  radiusM: number;
}) {
  if (distanceM !== null && distanceM <= radiusM) {
    return (
      <View style={styles.counter}>
        <Txt variant="title" tone="accent">
          {t('active.almostThere')}
        </Txt>
      </View>
    );
  }

  if (stopsToGo === null || stopsToGo === 0) {
    return (
      <View style={[styles.counter, styles.counterRow, { flexDirection: row() }]}>
        <Txt variant="counter" tone="accent" nums>
          {distanceM === null ? '·' : formatDistance(distanceM).replace(/[^\d.,]/g, '')}
        </Txt>
        <Txt variant="label" tone="muted" style={styles.counterUnit}>
          {distanceM === null ? t('active.waitingFix') : t('active.distanceLeft')}
        </Txt>
      </View>
    );
  }

  return (
    <View style={[styles.counter, styles.counterRow, { flexDirection: row() }]}>
      <Txt variant="counter" tone="accent" nums>
        {stopsToGo}
      </Txt>
      <Txt variant="label" tone="muted" style={styles.counterUnit}>
        {stopsToGo === 1 ? t('active.stopsToGoOne') : t('active.stopsToGo')}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  body: {
    padding: space.screen,
    gap: space.xl,
  },
  head: {
    gap: space.md,
  },
  counter: {
    paddingVertical: space.sm,
  },
  counterRow: {
    alignItems: 'baseline',
    gap: space.md,
  },
  counterUnit: {
    flexShrink: 1,
  },
  dock: {
    paddingHorizontal: space.screen,
    paddingTop: space.lg,
    paddingBottom: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: space.md,
  },
});
