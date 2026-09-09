import BellRing from 'lucide-react-native/icons/bell-ring';
import CircleSlash from 'lucide-react-native/icons/circle-slash';
import RotateCcw from 'lucide-react-native/icons/rotate-ccw';
import Radio from 'lucide-react-native/icons/radio';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GhostButton, Touch, Txt, align, row } from '../components/ui';
import { t } from '../i18n';
import { Feedback } from '../services/feedback/Haptics';
import type { Trip, TripOutcome } from '../services/storage/TripStorage';
import { useAlarmStore } from '../state/useAlarmStore';
import { icon, radius, space, useTheme } from '../theme';
import { formatDistance } from '../utils/geo';

/**
 * Every alarm this device has set.
 *
 * Local only, and it says so: there is no account behind this app and the
 * history is a convenience, not a record the user has entrusted to anyone.
 *
 * Tapping a trip sets it up again rather than opening a detail screen. There
 * is nothing to read about a past trip that this row does not already say, and
 * "the same journey home as yesterday" is the one thing anybody would come
 * here to do.
 */

const OUTCOME: Record<TripOutcome, { key: string; Icon: typeof BellRing }> = {
  woken: { key: 'trips.woken', Icon: BellRing },
  cancelled: { key: 'trips.cancelled', Icon: CircleSlash },
  open: { key: 'trips.open', Icon: Radio },
};

/**
 * When it was, in the least ceremonious form that is still unambiguous.
 *
 * Today and yesterday are named because that is how someone would say it; past
 * that a date is shorter than counting days back, and the device's own locale
 * knows how to write one.
 */
function whenLabel(at: number): string {
  const then = new Date(at);
  const midnight = new Date();
  midnight.setHours(0, 0, 0, 0);
  const dayMs = 86_400_000;

  const time = then.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  if (at >= midnight.getTime()) return `${t('trips.today')} · ${time}`;
  if (at >= midnight.getTime() - dayMs) return `${t('trips.yesterday')} · ${time}`;
  return `${then.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} · ${time}`;
}

export function HistoryScreen({ onPicked }: { onPicked: () => void }) {
  const s = useTheme();
  const trips = useAlarmStore((state) => state.trips);
  const clearTrips = useAlarmStore((state) => state.clearTrips);
  const setDestination = useAlarmStore((state) => state.setDestination);
  const setRadius = useAlarmStore((state) => state.setRadius);

  const again = (trip: Trip) => {
    Feedback.tick();
    setDestination(trip.destination);
    setRadius(trip.radiusM);
    onPicked();
  };

  const confirmClear = () => {
    Alert.alert(t('trips.clearConfirm'), undefined, [
      { text: t('trips.clear'), style: 'destructive', onPress: () => void clearTrips() },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  return (
    <View style={[styles.screen, { backgroundColor: s.bg }]}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.head}>
          <Txt variant="title" style={{ textAlign: align() }}>
            {t('trips.title')}
          </Txt>
          <Txt variant="body" tone="muted" style={{ textAlign: align() }}>
            {t('trips.subtitle')}
          </Txt>
        </View>

        {trips.length === 0 ? (
          <View style={styles.empty}>
            <View style={[styles.emptyMark, { backgroundColor: s.sunk }]}>
              <RotateCcw size={30} strokeWidth={1.8} color={s.inkFaint} />
            </View>
            <Txt variant="heading" style={styles.centre}>
              {t('trips.emptyTitle')}
            </Txt>
            <Txt variant="body" tone="muted" style={styles.centre}>
              {t('trips.emptyBody')}
            </Txt>
            <GhostButton label={t('places.goToMap')} onPress={onPicked} style={styles.emptyCta} />
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.body}
            showsVerticalScrollIndicator={false}
          >
            <View>
              {trips.map((trip, index) => {
                const { key, Icon } = OUTCOME[trip.outcome];
                const live = trip.outcome === 'open';
                return (
                  <Touch
                    key={trip.id}
                    accessibilityRole="button"
                    accessibilityLabel={`${trip.destination.label}, ${t(key as 'trips.woken')}`}
                    onPress={() => again(trip)}
                    style={({ pressed }) => [
                      styles.rowItem,
                      {
                        flexDirection: row(),
                        backgroundColor: pressed ? s.sunk : 'transparent',
                        borderTopWidth: index === 0 ? 0 : StyleSheet.hairlineWidth,
                        borderTopColor: s.line,
                      },
                    ]}
                  >
                    <View style={styles.grow}>
                      <Txt variant="labelStrong" numberOfLines={1} style={{ textAlign: align() }}>
                        {trip.destination.label}
                      </Txt>
                      <View style={[styles.meta, { flexDirection: row() }]}>
                        <Icon
                          size={icon.sm}
                          strokeWidth={icon.stroke}
                          color={live ? s.success.text : s.inkFaint}
                        />
                        <Txt variant="caption" tone={live ? 'success' : 'faint'} numberOfLines={1}>
                          {t(key as 'trips.woken')}
                        </Txt>
                        <Txt variant="caption" tone="faint" nums numberOfLines={1}>
                          {`· ${t('trips.radius', { distance: formatDistance(trip.radiusM) })}`}
                        </Txt>
                      </View>
                    </View>

                    <Txt variant="caption" tone="faint" nums style={styles.when}>
                      {whenLabel(trip.armedAt)}
                    </Txt>
                  </Touch>
                );
              })}
            </View>

            {/* Quiet, and only once there is enough history for clearing it
                to be a thing anyone wants. A full-width button under a single
                row shouts louder than the row. */}
            {trips.length >= 3 ? (
              <Touch
                accessibilityRole="button"
                accessibilityLabel={t('trips.clear')}
                onPress={confirmClear}
                style={({ pressed }) => [styles.clear, { opacity: pressed ? 0.6 : 1 }]}
              >
                <Txt variant="caption" tone="faint">
                  {t('trips.clear')}
                </Txt>
              </Touch>
            ) : null}
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1 },
  head: { paddingHorizontal: space.screen, paddingVertical: space.lg, gap: space.xs },
  scroll: { flex: 1 },
  body: { paddingHorizontal: space.screen, paddingBottom: space.huge, gap: space.xxl },
  rowItem: {
    minHeight: 60,
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.sm + 2,
  },
  grow: { flex: 1, gap: 2 },
  meta: { alignItems: 'center', gap: space.xs },
  when: { minWidth: 92, textAlign: 'right' },
  clear: { alignSelf: 'center', paddingVertical: space.md },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
    paddingHorizontal: space.xxl,
  },
  emptyMark: {
    width: 64,
    height: 64,
    borderRadius: radius.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.xs,
  },
  centre: { textAlign: 'center' },
  emptyCta: { marginTop: space.md },
});
