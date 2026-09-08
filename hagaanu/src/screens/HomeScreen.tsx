import LocateFixed from 'lucide-react-native/icons/locate-fixed';
import Settings from 'lucide-react-native/icons/settings';
import X from 'lucide-react-native/icons/x';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FALLBACK_REGION } from '../constants/config';
import { t } from '../i18n';
import { RouteMap, type RouteMapHandle } from '../components/map/RouteMap';
import { SearchField } from '../components/map/SearchField';
import { RangePicker } from '../components/route/RangePicker';
import { RouteRail } from '../components/route/RouteRail';
import { buildRail } from '../components/route/rail';
import { SavedList } from '../components/route/SavedList';
import {
  Card,
  GhostButton,
  PrimaryButton,
  Touch,
  Txt,
  row,
} from '../components/ui';
import { Feedback } from '../services/feedback/Haptics';
import { useAlarmStore } from '../state/useAlarmStore';
import { usePermissionsStore } from '../state/usePermissionsStore';
import { elevation, hitSlop, icon, radius, space, useTheme } from '../theme';

/**
 * Everything before the alarm is armed.
 *
 * Two states on one screen, because a route transition between "pick a place"
 * and "confirm the place" would spend the ten-second budget this product is
 * built around:
 *
 *   no destination   the map fills the screen and takes a tap; search and the
 *                    saved list float over it
 *   destination set  the map shrinks to a band and the rail takes over, which
 *                    is where the decision actually gets made
 *
 * The map shrinking is the whole argument of this design in one move: once you
 * know where you are going, the useful question stops being "where am I" and
 * becomes "how many stops until I need to stand up".
 */
export function HomeScreen({ onOpenSettings }: { onOpenSettings: () => void }) {
  const s = useTheme();
  const mapRef = useRef<RouteMapHandle>(null);

  const destination = useAlarmStore((state) => state.destination);
  const radiusM = useAlarmStore((state) => state.radiusM);
  const position = useAlarmStore((state) => state.position);
  const busy = useAlarmStore((state) => state.busy);
  const error = useAlarmStore((state) => state.error);
  const stops = useAlarmStore((state) => state.stops);
  const stopsState = useAlarmStore((state) => state.stopsState);
  const stopsFallback = useAlarmStore((state) => state.stopsFallback);
  const saved = useAlarmStore((state) => state.saved);

  const setDestination = useAlarmStore((state) => state.setDestination);
  const setRadius = useAlarmStore((state) => state.setRadius);
  const setError = useAlarmStore((state) => state.setError);
  const loadStops = useAlarmStore((state) => state.loadStops);
  const arm = useAlarmStore((state) => state.arm);
  const saveCurrent = useAlarmStore((state) => state.saveCurrent);
  const useSaved = useAlarmStore((state) => state.useSaved);
  const removeSaved = useAlarmStore((state) => state.removeSaved);

  const backgroundGranted =
    usePermissionsStore((state) => state.snapshot.backgroundLocation) === 'granted';

  // The stop list needs both a destination and a fix. Whichever arrives second
  // starts the fetch, which is why this watches both rather than firing inside
  // the destination setter.
  useEffect(() => {
    if (destination && position && stopsState === 'loading' && stops.length === 0) {
      void loadStops();
    }
  }, [destination, position, stopsState, stops.length, loadStops]);

  useEffect(() => {
    if (destination) mapRef.current?.frameRoute(position?.coords ?? null, destination, radiusM);
    // Framing follows the destination and the radius, not every position fix:
    // re-framing on each fix would fight the user panning the map.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destination, radiusM]);

  const rail = useMemo(
    () => (destination ? buildRail(stops, position?.coords ?? null, destination, radiusM) : null),
    [stops, position, destination, radiusM]
  );

  const onSave = useCallback(() => {
    if (!destination) return;
    void saveCurrent(destination.label, 'favourite');
    Feedback.tick();
  }, [destination, saveCurrent]);

  // A failure to arm is reported inline, next to the button that failed.
  // A modal alert for it would be one more thing to dismiss before retrying.
  const onArm = useCallback(() => {
    void (async () => {
      const ok = await arm();
      if (!ok) setError(t('errors.armFailed'));
    })();
  }, [arm, setError]);

  return (
    <View style={[styles.screen, { backgroundColor: s.bg }]}>
      <View style={destination ? styles.band : StyleSheet.absoluteFill}>
        <RouteMap
          ref={mapRef}
          initialRegion={FALLBACK_REGION}
          destination={destination}
          radiusM={radiusM}
          here={position?.coords ?? null}
          stops={stops}
          mode={destination ? 'band' : 'picker'}
          onPickPoint={(coords) =>
            setDestination({ coords, label: t('errors.unknownPlace') })
          }
        />
      </View>

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']} pointerEvents="box-none">
        {destination ? (
          <Chosen
            destinationLabel={destination.label}
            onClear={() => setDestination(null)}
          />
        ) : (
          <View style={styles.floating} pointerEvents="box-none">
            <View style={[styles.chrome, { flexDirection: row() }]}>
              <View style={styles.chromeSearch}>
                <SearchField onPick={setDestination} />
              </View>
              {/*
                Only on the empty state. Once a destination exists the screen
                has one job, and a settings button next to the arm button is an
                invitation to wander off in the middle of it.
              */}
              <Touch
                accessibilityRole="button"
                accessibilityLabel={t('home.settings')}
                hitSlop={hitSlop}
                onPress={onOpenSettings}
                style={[styles.gear, elevation(1, s), { backgroundColor: s.surface }]}
              >
                <Settings size={icon.md} strokeWidth={icon.stroke} color={s.inkMuted} />
              </Touch>
            </View>
            <View style={styles.spacer} pointerEvents="none" />
            <View style={[styles.locate, { flexDirection: row() }]} pointerEvents="box-none">
              <Touch
                accessibilityRole="button"
                accessibilityLabel={t('home.myLocation')}
                hitSlop={hitSlop}
                onPress={() => position && mapRef.current?.frameUser(position.coords)}
                style={[
                  styles.locateBtn,
                  elevation(1, s),
                  { backgroundColor: s.surface },
                ]}
              >
                <LocateFixed size={icon.lg} strokeWidth={icon.stroke} color={s.ink} />
              </Touch>
            </View>
          </View>
        )}

        {destination && rail ? (
          <ScrollView
            style={styles.sheetScroll}
            contentContainerStyle={styles.sheetBody}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Card>
              <Txt variant="label" tone="muted" style={styles.sheetTitle}>
                {t('route.title')}
              </Txt>
              <RouteRail
                rail={rail}
                fallback={stopsFallback}
                loading={stopsState === 'loading'}
              />
            </Card>

            <RangePicker value={radiusM} onChange={setRadius} />

            {!backgroundGranted ? (
              <View style={[styles.warn, { backgroundColor: s.sunk, flexDirection: row() }]}>
                <Txt variant="caption" tone="muted" style={styles.warnText}>
                  {t('warnings.foregroundOnly')}
                </Txt>
              </View>
            ) : null}

            {error ? (
              <Txt variant="caption" tone="danger">
                {error}
              </Txt>
            ) : null}
          </ScrollView>
        ) : (
          <View style={styles.savedDock} pointerEvents="box-none">
            <SavedList items={saved} onPick={useSaved} onRemove={removeSaved} />
          </View>
        )}

        {destination ? (
          <View style={[styles.dock, { backgroundColor: s.bg, borderTopColor: s.line }]}>
            <PrimaryButton
              label={busy ? t('route.arming') : t('route.arm')}
              busy={busy}
              onPress={onArm}
            />
            <GhostButton label={t('route.saveDestination')} onPress={onSave} style={styles.saveBtn} />
          </View>
        ) : null}
      </SafeAreaView>
    </View>
  );
}

/** The chosen destination, docked under the map band. */
function Chosen({
  destinationLabel,
  onClear,
}: {
  destinationLabel: string;
  onClear: () => void;
}) {
  const s = useTheme();
  return (
    <View style={[styles.chosen, { flexDirection: row() }]}>
      <View style={[styles.chosenCard, elevation(1, s), { backgroundColor: s.surface, flexDirection: row() }]}>
        <Txt variant="heading" numberOfLines={1} style={styles.chosenName}>
          {destinationLabel}
        </Txt>
        <Touch
          accessibilityRole="button"
          accessibilityLabel={t('route.changeDestination')}
          hitSlop={hitSlop}
          onPress={onClear}
          style={[styles.chosenX, { backgroundColor: s.sunk }]}
        >
          <X size={icon.md} strokeWidth={icon.stroke} color={s.inkMuted} />
        </Touch>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  band: {
    height: '30%',
    minHeight: 190,
  },
  safe: {
    flex: 1,
  },
  chrome: {
    alignItems: 'flex-start',
    gap: space.md,
  },
  chromeSearch: {
    flex: 1,
  },
  gear: {
    width: 52,
    height: 52,
    borderRadius: radius.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floating: {
    flex: 1,
    paddingHorizontal: space.screen,
    paddingTop: space.md,
  },
  spacer: {
    flex: 1,
  },
  locate: {
    justifyContent: 'flex-end',
    paddingBottom: space.md,
  },
  locateBtn: {
    width: 52,
    height: 52,
    borderRadius: radius.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedDock: {
    paddingHorizontal: space.screen,
    paddingBottom: space.md,
  },
  chosen: {
    paddingHorizontal: space.screen,
    marginTop: space.md,
  },
  chosenCard: {
    flex: 1,
    alignItems: 'center',
    gap: space.md,
    minHeight: 60,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    borderRadius: radius.card,
  },
  chosenName: {
    flexShrink: 1,
    flexGrow: 1,
  },
  chosenX: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetScroll: {
    flex: 1,
  },
  sheetBody: {
    padding: space.screen,
    gap: space.xl,
  },
  sheetTitle: {
    marginBottom: space.lg,
  },
  warn: {
    borderRadius: radius.control,
    padding: space.lg,
    gap: space.md,
  },
  warnText: {
    flexShrink: 1,
  },
  dock: {
    paddingHorizontal: space.screen,
    paddingTop: space.lg,
    paddingBottom: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: space.md,
  },
  saveBtn: {
    minHeight: 48,
  },
});
