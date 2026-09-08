import LocateFixed from 'lucide-react-native/icons/locate-fixed';
import X from 'lucide-react-native/icons/x';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DemoBanner } from '../components/DemoBanner';
import { RouteMap, type RouteMapHandle } from '../components/map/RouteMap';
import { SearchField } from '../components/map/SearchField';
import { labelFor, nearestPlace } from '../services/places/match';
import { warmStops } from '../services/places/stops';
import { ApproachGauge } from '../components/route/ApproachGauge';
import { RangeSlider } from '../components/route/RangeSlider';
import { buildApproach } from '../components/route/approach';
import { BottomSheet, useSheetHeight, type Snap } from '../components/sheet/BottomSheet';
import { Chip, DangerButton, PrimaryButton, Touch, Txt, row } from '../components/ui';
import { FALLBACK_REGION } from '../constants/config';
import { t } from '../i18n';
import { Feedback } from '../services/feedback/Haptics';
import { GeocodingService } from '../services/location/GeocodingService';
import { useAlarmStore } from '../state/useAlarmStore';
import { usePermissionsStore } from '../state/usePermissionsStore';
import { elevation, hitSlop, icon, radius, space, useTheme } from '../theme';
import type { Destination, LatLng } from '../types';
import { formatDistance } from '../utils/geo';

/**
 * The map is the app.
 *
 * There is one screen, and the sheet over it changes shape as the journey does.
 * That is deliberate: a stack of screens for "search / confirm / armed" would
 * throw the map away and rebuild it three times, and the map is the thing that
 * makes the range mean something. Choosing 2 km instead of 500 m is a circle
 * growing over the station you are looking at, not a number in a list.
 *
 *   idle     the sheet is a hint. The map has the screen.
 *   chosen   the sheet grows to hold the one decision left, and the ring on the
 *            map follows the slider live.
 *   armed    the sheet becomes the reassurance, and everything else goes away.
 */
export function MapScreen({ onOpenPlaces }: { onOpenPlaces: () => void }) {
  const s = useTheme();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<RouteMapHandle>(null);
  const [searching, setSearching] = useState(false);

  const status = useAlarmStore((state) => state.status);
  const destination = useAlarmStore((state) => state.destination);
  const radiusM = useAlarmStore((state) => state.radiusM);
  const position = useAlarmStore((state) => state.position);
  const distanceM = useAlarmStore((state) => state.distanceM);
  const busy = useAlarmStore((state) => state.busy);
  const error = useAlarmStore((state) => state.error);
  const stale = useAlarmStore((state) => state.stale);
  const session = useAlarmStore((state) => state.session);

  const setDestination = useAlarmStore((state) => state.setDestination);
  const setRadius = useAlarmStore((state) => state.setRadius);
  const setError = useAlarmStore((state) => state.setError);
  const arm = useAlarmStore((state) => state.arm);
  const cancel = useAlarmStore((state) => state.cancel);

  const locationGranted =
    usePermissionsStore((state) => state.snapshot.foregroundLocation) === 'granted';

  const armed = status === 'armed';

  useEffect(() => {
    if (destination) mapRef.current?.frameRoute(position?.coords ?? null, destination, radiusM);
    // Framing follows the destination and the range, never every fix: re-framing
    // on each fix would fight a user who has panned the map.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destination, radiusM]);

  const approach = useMemo(
    () =>
      destination
        ? buildApproach(position?.coords ?? null, destination, radiusM, session?.remaining ?? [])
        : null,
    [position, destination, radiusM, session]
  );

  /**
   * A tap on the map becomes a named place.
   *
   * The point is set immediately and the name filled in when the geocoder
   * answers, not the other way round: the ring and the distance are useful the
   * instant the point exists, and making someone wait on a lookup to see them
   * would spend the whole budget on a label.
   */
  const pickPoint = useCallback(
    (coords: LatLng) => {
      // A tap on a station takes its name straight away, and its coordinate:
      // the geofence should be centred where the search would have centred it,
      // not a few hundred metres off at wherever the finger landed.
      const near = nearestPlace(coords);
      if (near) {
        setDestination({ coords: near.coords, label: labelFor(near) });
        return;
      }
      setDestination({ coords, label: t('errors.unknownPlace') });
      void (async () => {
        const label = await GeocodingService.describe(coords);
        const current = useAlarmStore.getState().destination;
        if (current?.coords.latitude === coords.latitude && current.label !== label) {
          setDestination({ coords, label });
        }
      })();
    },
    [setDestination]
  );

  const onPick = useCallback(
    (place: Destination) => {
      setSearching(false);
      setDestination(place);
    },
    [setDestination]
  );

  const onArm = useCallback(() => {
    void (async () => {
      const ok = await arm();
      if (!ok) setError(t('errors.armFailed'));
    })();
  }, [arm, setError]);

  const confirmCancel = () => {
    Alert.alert(t('active.cancelConfirmTitle'), t('active.cancelConfirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('active.cancelConfirmYes'),
        style: 'destructive',
        onPress: () => {
          Feedback.release();
          void cancel();
        },
      },
    ]);
  };

  /**
   * The sheet's height follows the content, not the screen.
   *
   * Armed and far away there is a number and a sentence; armed and closing in
   * there is also a gauge, which is most of a panel on its own. Holding one
   * height for both meant the gauge ran off the bottom.
   */
  const snap: Snap = searching
    ? 'full'
    : armed
      ? approach && approach.phase !== 'far'
        ? 'full'
        : 'half'
      : destination
        ? 'half'
        : 'peek';

  const sheetH = useSheetHeight(snap);

  // The national stop index costs a couple of hundred milliseconds to build.
  // Spend it now, while the map is being looked at, rather than inside the
  // first keystroke of a search.
  useEffect(() => warmStops(), []);

  return (
    <View style={[styles.screen, { backgroundColor: s.bg }]}>
      <RouteMap
        ref={mapRef}
        initialRegion={FALLBACK_REGION}
        destination={destination}
        radiusM={radiusM}
        here={position?.coords ?? null}
        mode={armed ? 'band' : 'picker'}
        onPickPoint={pickPoint}
      />

      {/*
        Floating over the map. `zIndex` is load-bearing: the sheet is a later
        sibling, so without it the sheet paints over this layer and the search
        results — which drop down from the field — land behind it and are never
        seen. The tools are held clear of the sheet's top edge for the same
        reason, hence the sheet's own height rather than the bottom of the
        screen.
      */}
      <View
        style={[styles.overlay, { paddingTop: insets.top + space.sm, paddingBottom: sheetH }]}
        pointerEvents="box-none"
      >
        {!armed ? (
          <View style={styles.searchDock}>
            <SearchField
              near={position?.coords ?? null}
              onPick={onPick}
              onFocusChange={setSearching}
              onClear={destination ? () => setDestination(null) : undefined}
            />
          </View>
        ) : null}

        <View style={styles.spacer} pointerEvents="none" />

        <View style={[styles.mapTools, { flexDirection: row() }]} pointerEvents="box-none">
          <Touch
            accessibilityRole="button"
            accessibilityLabel={t('home.myLocation')}
            hitSlop={hitSlop}
            onPress={() => {
              Feedback.tick();
              if (position) mapRef.current?.frameUser(position.coords);
            }}
            style={[styles.round, elevation(1, s), { backgroundColor: s.surface }]}
          >
            <LocateFixed size={icon.md} strokeWidth={icon.stroke} color={s.ink} />
          </Touch>
        </View>
      </View>

      <BottomSheet
        snap={snap}
        onCollapse={searching ? () => setSearching(false) : undefined}
        footer={
          armed ? (
            <DangerButton label={t('active.cancel')} onPress={confirmCancel} />
          ) : destination ? (
            <PrimaryButton
              label={busy ? t('route.arming') : t('route.arm')}
              busy={busy}
              onPress={onArm}
            />
          ) : null
        }
      >
        <DemoBanner />

        {armed && approach ? (
          <ArmedPanel
            approach={approach}
            destination={destination!}
            radiusM={radiusM}
            distanceM={distanceM}
            stale={stale}
          />
        ) : destination ? (
          <ChosenPanel
            destination={destination}
            radiusM={radiusM}
            distanceM={distanceM}
            onRadius={setRadius}
            onClear={() => setDestination(null)}
            error={error}
          />
        ) : (
          <IdlePanel granted={locationGranted} locating={!position} onOpenPlaces={onOpenPlaces} />
        )}
      </BottomSheet>
    </View>
  );
}

/* ------------------------------------------------------------------ *
 * The three shapes the sheet takes
 * ------------------------------------------------------------------ */

/** Nothing chosen yet. One sentence, because the map is the instruction. */
function IdlePanel({
  granted,
  locating,
  onOpenPlaces,
}: {
  granted: boolean;
  locating: boolean;
  onOpenPlaces: () => void;
}) {
  const s = useTheme();

  if (!granted) {
    return (
      <View style={styles.state}>
        <Txt variant="heading" tone="danger">
          {t('status.locationDenied')}
        </Txt>
        <Txt variant="body" tone="muted">
          {t('status.locationDeniedBody')}
        </Txt>
      </View>
    );
  }

  return (
    <View style={styles.state}>
      <Txt variant="heading">{t('home.emptyTitle')}</Txt>
      <Txt variant="body" tone="muted">
        {locating ? t('status.locating') : t('home.emptyBody')}
      </Txt>
      <Touch
        accessibilityRole="button"
        accessibilityLabel={t('places.title')}
        onPress={onOpenPlaces}
        style={[styles.quietLink, { borderColor: s.line }]}
      >
        <Txt variant="labelStrong" tone="primary">
          {t('places.title')}
        </Txt>
      </Touch>
    </View>
  );
}

/** A destination exists. One decision left, and the map shows what it means. */
function ChosenPanel({
  destination,
  radiusM,
  distanceM,
  onRadius,
  onClear,
  error,
}: {
  destination: Destination;
  radiusM: number;
  distanceM: number | null;
  onRadius: (m: number) => void;
  onClear: () => void;
  error: string | null;
}) {
  const s = useTheme();
  return (
    <View style={styles.panel}>
      <View style={[styles.titleRow, { flexDirection: row() }]}>
        <View style={styles.grow}>
          <Txt variant="title" numberOfLines={1}>
            {destination.label}
          </Txt>
          {distanceM !== null ? (
            <Txt variant="caption" tone="muted" nums>
              {t('route.distanceNote', { distance: formatDistance(distanceM) })}
            </Txt>
          ) : null}
        </View>
        <Touch
          accessibilityRole="button"
          accessibilityLabel={t('route.changeDestination')}
          hitSlop={hitSlop}
          onPress={onClear}
          style={[styles.clear, { backgroundColor: s.sunk }]}
        >
          <X size={icon.sm} strokeWidth={2.4} color={s.inkMuted} />
        </Touch>
      </View>

      <RangeSlider value={radiusM} onChange={onRadius} />

      <Txt variant="body" tone="muted">
        {t('approach.preview', { distance: formatDistance(radiusM) })}
      </Txt>

      {error ? (
        <Txt variant="caption" tone="danger">
          {error}
        </Txt>
      ) : null}
    </View>
  );
}

/** Armed. The reassurance, and the number, and nothing to decide. */
function ArmedPanel({
  approach,
  destination,
  radiusM,
  distanceM,
  stale,
}: {
  approach: NonNullable<ReturnType<typeof buildApproach>>;
  destination: Destination;
  radiusM: number;
  distanceM: number | null;
  stale: boolean;
}) {
  const phase = stale ? 'far' : approach.phase;

  return (
    <View style={styles.panel}>
      <Chip
        tone={stale ? 'muted' : 'success'}
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

      <View style={styles.reading}>
        {distanceM === null || stale ? (
          <Txt variant="title" tone="muted">
            {stale ? t('active.noSignal') : t('active.waitingFix')}
          </Txt>
        ) : (
          <View style={[styles.readingRow, { flexDirection: row() }]}>
            <Txt variant="counter" tone="primary" nums>
              {formatDistance(approach.hereM ?? distanceM).replace(/[^\d.,]/g, '')}
            </Txt>
            <View style={styles.unit}>
              <Txt variant="labelStrong" tone="muted">
                {formatDistance(approach.hereM ?? distanceM).replace(/[\d.,\s]/g, '')}
              </Txt>
              <Txt variant="caption" tone="muted">
                {t('approach.toGo')}
              </Txt>
            </View>
          </View>
        )}

        <Txt variant="heading" numberOfLines={1}>
          {destination.label}
        </Txt>
        <Txt variant="body" tone="muted">
          {stale
            ? t('active.noSignalBody', {
                distance: distanceM === null ? '' : formatDistance(distanceM),
              })
            : t('approach.sleep')}
        </Txt>
      </View>

      {phase !== 'far' ? <ApproachGauge approach={approach} /> : null}

      <Txt variant="caption" tone="muted" nums>
        {t('approach.preview', { distance: formatDistance(radiusM) })}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFill,
    paddingHorizontal: space.screen,
    zIndex: 2,
  },
  searchDock: { width: '100%' },
  spacer: { flex: 1 },
  mapTools: {
    justifyContent: 'flex-end',
    paddingBottom: space.md,
  },
  round: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  panel: { gap: space.xl, paddingTop: space.sm },
  state: { gap: space.sm, paddingTop: space.sm },
  titleRow: { alignItems: 'flex-start', gap: space.md },
  grow: { flexGrow: 1, flexShrink: 1, gap: 2 },
  clear: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reading: { gap: space.xs },
  readingRow: { alignItems: 'flex-end', gap: space.md },
  unit: { paddingBottom: 8, gap: 1 },
  quietLink: {
    alignSelf: 'flex-start',
    marginTop: space.sm,
    paddingVertical: space.sm,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 40,
    justifyContent: 'center',
  },
});
