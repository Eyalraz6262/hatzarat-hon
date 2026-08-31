import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Region } from 'react-native-maps';

import { FALLBACK_REGION } from '../constants/config';
import { t, type TranslationKey } from '../i18n';
import { GeocodingService } from '../services/location/GeocodingService';
import { useAlarmStore } from '../state/useAlarmStore';
import { usePermissionsStore } from '../state/usePermissionsStore';
import { colors, spacing, type } from '../theme';
import type { LatLng } from '../types';
import { DestinationMap, type DestinationMapHandle } from '../components/map/DestinationMap';
import { SearchBar } from '../components/map/SearchBar';
import { SetupSheet } from '../components/sheets/SetupSheet';
import { BrandGlyph, LocateIcon } from '../components/icons';
import { align, row } from '../components/ui';

/**
 * The one screen that matters.
 *
 * Layout priority, top to bottom: map (the biggest thing on screen), the paper
 * search field, then a docked ticket stub carrying the radius and the button.
 * No navigation, no tab bar, no menu — the whole flow is map → radius → arm.
 */
export function HomeScreen() {
  const status = useAlarmStore((state) => state.status);
  const destination = useAlarmStore((state) => state.destination);
  const radiusM = useAlarmStore((state) => state.radiusM);
  const distanceM = useAlarmStore((state) => state.distanceM);
  const position = useAlarmStore((state) => state.position);
  const busy = useAlarmStore((state) => state.busy);
  const error = useAlarmStore((state) => state.error);

  const setDestination = useAlarmStore((state) => state.setDestination);
  const setRadius = useAlarmStore((state) => state.setRadius);
  const arm = useAlarmStore((state) => state.arm);

  const backgroundGranted = usePermissionsStore(
    (state) => state.snapshot.backgroundLocation === 'granted'
  );
  const locationServicesEnabled = usePermissionsStore((state) => state.locationServicesEnabled);

  const mapRef = useRef<DestinationMapHandle>(null);
  const [initialRegion] = useState<Region>(FALLBACK_REGION);
  // The stub's height changes with its content, so the locate button is placed
  // from a measured value rather than a guessed constant.
  const [stubHeight, setStubHeight] = useState(0);

  // Swap the country-wide fallback for the user's surroundings on the first fix
  // — once only, so later fixes don't yank a map the user has panned.
  const framedOnUser = useRef(false);
  useEffect(() => {
    if (framedOnUser.current || !position) return;
    // Latch only once the command has somewhere to go. Setting the flag before
    // the native view exists would strand the map on the country-wide fallback
    // for the rest of the session.
    const map = mapRef.current;
    if (!map) return;
    framedOnUser.current = true;
    map.focusUser(position.coords);
  }, [position]);

  const pickPoint = useCallback(
    (coords: LatLng) => {
      // Show the node immediately with a placeholder label, then fill in the
      // real address when the geocoder answers — the map must never feel laggy.
      setDestination({ coords, label: t('errors.unknownPlace') });
      void (async () => {
        const label = await GeocodingService.describe(coords);
        const current = useAlarmStore.getState().destination;
        if (
          current &&
          current.coords.latitude === coords.latitude &&
          current.coords.longitude === coords.longitude
        ) {
          setDestination({ coords, label });
        }
      })();
    },
    [setDestination]
  );

  const selectSearchResult = useCallback(
    (result: Parameters<typeof setDestination>[0]) => {
      setDestination(result);
      if (result) mapRef.current?.focusDestination(result, useAlarmStore.getState().radiusM);
    },
    [setDestination]
  );

  const changeRadius = useCallback(
    (next: number) => {
      setRadius(next);
      if (destination) mapRef.current?.focusDestination(destination, next);
    },
    [setRadius, destination]
  );

  const recentre = useCallback(() => {
    if (position) mapRef.current?.focusUser(position.coords);
  }, [position]);

  const banner = useMemo<{ key: TranslationKey; tone: 'warning' | 'alert' } | null>(() => {
    if (!locationServicesEnabled) return { key: 'errors.servicesDisabled', tone: 'alert' };
    if (error) return { key: error as TranslationKey, tone: 'alert' };
    if (!backgroundGranted) return { key: 'warnings.foregroundOnly', tone: 'warning' };
    return null;
  }, [locationServicesEnabled, error, backgroundGranted]);

  return (
    <View style={styles.screen}>
      <DestinationMap
        ref={mapRef}
        initialRegion={initialRegion}
        destination={destination}
        radiusM={radiusM}
        interactive={status !== 'armed'}
        onPickPoint={pickPoint}
      />

      <SafeAreaView style={styles.overlay} edges={['top']} pointerEvents="box-none">
        <View style={styles.chrome} pointerEvents="box-none">
          <View style={[styles.lockup, { flexDirection: row() }]} pointerEvents="none">
            <BrandGlyph size={30} />
            <Text style={styles.brand}>{t('brand.name')}</Text>
            <Text style={styles.live}>{t('plate.live')}</Text>
          </View>

          <SearchBar onSelect={selectSearchResult} />

          {banner ? (
            <View
              style={[
                styles.banner,
                { flexDirection: row() },
                banner.tone === 'alert' ? styles.bannerAlert : null,
              ]}
            >
              <Text style={styles.bannerMark}>!</Text>
              <Text style={[styles.bannerText, { textAlign: align() }]}>{t(banner.key)}</Text>
            </View>
          ) : null}
        </View>

        <View
          style={[styles.controls, { paddingBottom: stubHeight + spacing.lg }]}
          pointerEvents="box-none"
        >
          <Pressable
            onPress={recentre}
            accessibilityRole="button"
            accessibilityLabel={t('home.recenter')}
            style={({ pressed }) => [styles.locate, pressed ? styles.locatePressed : null]}
          >
            <LocateIcon size={21} color={colors.paper} />
          </Pressable>
        </View>
      </SafeAreaView>

      <View
        style={styles.stubHost}
        onLayout={(event) => setStubHeight(event.nativeEvent.layout.height)}
      >
        <SetupSheet
          destination={destination}
          radiusM={radiusM}
          distanceM={distanceM}
          busy={busy}
          onChangeRadius={changeRadius}
          onClearDestination={() => setDestination(null)}
          onArm={() => void arm()}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.ink,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'space-between',
  },
  chrome: {
    paddingHorizontal: 20,
    paddingTop: spacing.sm,
    gap: spacing.lg,
  },
  lockup: {
    alignItems: 'center',
    gap: spacing.md,
  },
  brand: {
    ...type.subtitle,
    color: colors.paper,
    // The lockup sits over the map, so it needs its own contrast.
    textShadowColor: colors.scrimStrong,
    textShadowRadius: 10,
  },
  live: {
    ...type.label,
    color: colors.rail,
    marginStart: 'auto',
  },
  banner: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.inkRaised,
    borderStartWidth: 3,
    borderStartColor: colors.signal,
  },
  bannerAlert: {
    borderStartColor: colors.signalDeep,
  },
  bannerMark: {
    ...type.labelStrong,
    color: colors.signal,
  },
  bannerText: {
    flex: 1,
    ...type.labelHeSmall,
    lineHeight: 19,
    color: colors.paper,
  },
  controls: {
    alignItems: 'flex-start',
    paddingHorizontal: 20,
  },
  locate: {
    width: 48,
    height: 48,
    backgroundColor: colors.inkRaised,
    borderWidth: 1,
    borderColor: colors.inkLine,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locatePressed: {
    backgroundColor: colors.inkLine,
  },
  stubHost: {
    position: 'absolute',
    start: 0,
    end: 0,
    bottom: 0,
  },
});
