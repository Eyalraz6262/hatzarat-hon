import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Region } from 'react-native-maps';

import { FALLBACK_REGION } from '../constants/config';
import { t, type TranslationKey } from '../i18n';
import { GeocodingService } from '../services/location/GeocodingService';
import { useAlarmStore } from '../state/useAlarmStore';
import { usePermissionsStore } from '../state/usePermissionsStore';
import { spacing, type, useTheme } from '../theme';
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
  const saved = useAlarmStore((state) => state.saved);
  const useSaved = useAlarmStore((state) => state.useSaved);
  const saveCurrent = useAlarmStore((state) => state.saveCurrent);
  const removeSaved = useAlarmStore((state) => state.removeSaved);

  const backgroundGranted = usePermissionsStore(
    (state) => state.snapshot.backgroundLocation === 'granted'
  );
  const locationServicesEnabled = usePermissionsStore((state) => state.locationServicesEnabled);

  const theme = useTheme();
  const w = theme.world;
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
    <View style={[styles.screen, { backgroundColor: w.bg }]}>
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
            <Text style={[styles.brand, { color: w.textPrimary, textShadowColor: theme.scrimStrong }]}>{t('brand.name')}</Text>
            <Text style={[styles.live, { color: w.textMuted }]}>{t('plate.live')}</Text>
          </View>

          <SearchBar onSelect={selectSearchResult} />

          {banner ? (
            <View
              style={[
                styles.banner,
                {
                  backgroundColor: w.raised,
                  borderStartColor:
                    banner.tone === 'alert' ? theme.accent.pressed : theme.accent.base,
                  flexDirection: row(),
                },
              ]}
            >
              <Text style={[styles.bannerMark, { color: theme.accent.base }]}>!</Text>
              <Text style={[styles.bannerText, { color: w.textPrimary, textAlign: align() }]}>{t(banner.key)}</Text>
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
            style={({ pressed }) => [
              styles.locate,
              { backgroundColor: pressed ? w.pressed : w.raised, borderColor: w.divider },
            ]}
          >
            <LocateIcon size={21} color={w.textPrimary} />
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
          saved={saved}
          onChangeRadius={changeRadius}
          onClearDestination={() => setDestination(null)}
          onArm={() => void arm()}
          onPickSaved={(item) => {
            void useSaved(item);
            mapRef.current?.focusDestination(item.destination, item.radiusM);
          }}
          onRemoveSaved={(item) => void removeSaved(item.id)}
          onSaveCurrent={(name) => void saveCurrent(name, 'favourite')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
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
    // The lockup sits over the map, so it needs its own contrast.
    textShadowRadius: 10,
  },
  live: {
    ...type.label,
    marginStart: 'auto',
  },
  banner: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderStartWidth: 3,
  },
  bannerMark: {
    ...type.labelStrong,
  },
  bannerText: {
    flex: 1,
    ...type.labelHeSmall,
    lineHeight: 19,
  },
  controls: {
    alignItems: 'flex-start',
    paddingHorizontal: 20,
  },
  locate: {
    width: 48,
    height: 48,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stubHost: {
    position: 'absolute',
    start: 0,
    end: 0,
    bottom: 0,
  },
});
