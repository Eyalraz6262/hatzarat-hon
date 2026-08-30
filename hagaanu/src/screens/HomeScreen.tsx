import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { Region } from 'react-native-maps';

import { DestinationMap, type DestinationMapHandle } from '../components/map/DestinationMap';
import { SearchBar } from '../components/map/SearchBar';
import { ActiveSheet } from '../components/sheets/ActiveSheet';
import { SetupSheet } from '../components/sheets/SetupSheet';
import { rowDirection, textAlign } from '../components/ui';
import { t, type TranslationKey } from '../i18n';
import { useLocationTracking } from '../hooks/useLocationTracking';
import { GeocodingService } from '../services/location/GeocodingService';
import { useAlarmStore } from '../state/useAlarmStore';
import { usePermissionsStore } from '../state/usePermissionsStore';
import { colors, radii, spacing, typography } from '../theme';
import type { LatLng } from '../types';

/**
 * The one screen that matters.
 *
 * Layout priority, top to bottom: map (biggest thing on screen), search, then a
 * docked card that is either "pick a radius and arm" or "you can sleep". There is
 * no navigation, no tab bar and no menu — the whole flow is map → radius → button.
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
  const cancel = useAlarmStore((state) => state.cancel);

  const backgroundGranted = usePermissionsStore(
    (state) => state.snapshot.backgroundLocation === 'granted'
  );
  const locationServicesEnabled = usePermissionsStore((state) => state.locationServicesEnabled);

  useLocationTracking();

  const mapRef = useRef<DestinationMapHandle>(null);
  // The map's starting region is captured once: re-deriving it from a moving
  // position prop would fight the user every time they pan.
  const [initialRegion, setInitialRegion] = useState<Region | undefined>(undefined);
  // The docked card's height changes with its content (empty prompt vs. armed
  // stats), so the "my location" button is positioned from a measured value
  // rather than a guessed constant.
  const [sheetHeight, setSheetHeight] = useState(0);

  useEffect(() => {
    if (initialRegion || !position) return;
    setInitialRegion({ ...position.coords, latitudeDelta: 0.03, longitudeDelta: 0.03 });
  }, [position, initialRegion]);

  const armed = status === 'armed';

  const pickPoint = useCallback(
    (coords: LatLng) => {
      // Show the pin immediately with a placeholder label, then fill in the real
      // address when the geocoder answers — the map must never feel laggy.
      setDestination({ coords, label: t('errors.unknownPlace') });
      void (async () => {
        const label = await GeocodingService.describe(coords);
        const current = useAlarmStore.getState().destination;
        if (current && current.coords.latitude === coords.latitude && current.coords.longitude === coords.longitude) {
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

  const recenter = useCallback(() => {
    if (position) mapRef.current?.focusUser(position.coords);
  }, [position]);

  const changeRadius = useCallback(
    (next: number) => {
      setRadius(next);
      if (destination) mapRef.current?.focusDestination(destination, next);
    },
    [setRadius, destination]
  );

  const banner = useMemo<{ key: TranslationKey; tone: 'warning' | 'alert' } | null>(() => {
    if (!locationServicesEnabled) return { key: 'errors.servicesDisabled', tone: 'alert' };
    if (error) return { key: error as TranslationKey, tone: 'alert' };
    if (!backgroundGranted) return { key: 'warnings.foregroundOnly', tone: 'warning' };
    return null;
  }, [locationServicesEnabled, error, backgroundGranted]);

  return (
    <View style={styles.container}>
      <DestinationMap
        ref={mapRef}
        initialRegion={initialRegion}
        destination={destination}
        radiusM={radiusM}
        interactive={!armed}
        onPickPoint={pickPoint}
      />

      <SafeAreaView style={styles.overlay} edges={['top']} pointerEvents="box-none">
        <View style={styles.topBar} pointerEvents="box-none">
          <View style={[styles.brandRow, { flexDirection: rowDirection() }]} pointerEvents="none">
            <Text style={styles.brand}>{t('brand.name')}</Text>
            <Text style={styles.slogan}>{t('brand.slogan')}</Text>
          </View>

          {!armed ? <SearchBar onSelect={selectSearchResult} /> : null}

          {banner ? (
            <View
              style={[
                styles.banner,
                { flexDirection: rowDirection() },
                banner.tone === 'alert' ? styles.bannerAlert : styles.bannerWarning,
              ]}
            >
              <Ionicons
                name="alert-circle-outline"
                size={18}
                color={banner.tone === 'alert' ? colors.alert : colors.warning}
              />
              <Text style={[styles.bannerText, { textAlign: textAlign() }]}>{t(banner.key)}</Text>
            </View>
          ) : null}
        </View>

        <View
          style={[styles.mapControls, { paddingBottom: sheetHeight + spacing.lg }]}
          pointerEvents="box-none"
        >
          <Pressable
            onPress={recenter}
            style={({ pressed }) => [styles.fab, pressed ? styles.fabPressed : null]}
            accessibilityRole="button"
            accessibilityLabel={t('home.recenter')}
          >
            <Ionicons name="locate" size={22} color={colors.text} />
          </Pressable>
        </View>
      </SafeAreaView>

      <View
        style={styles.sheetHost}
        onLayout={(event) => setSheetHeight(event.nativeEvent.layout.height)}
      >
        {armed && destination ? (
          <ActiveSheet
            destination={destination}
            radiusM={radiusM}
            distanceM={distanceM}
            onCancel={() => void cancel()}
          />
        ) : (
          <SetupSheet
            destination={destination}
            radiusM={radiusM}
            distanceM={distanceM}
            busy={busy}
            onChangeRadius={changeRadius}
            onClearDestination={() => setDestination(null)}
            onArm={() => void arm()}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'space-between',
  },
  topBar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  brandRow: {
    alignItems: 'baseline',
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  brand: {
    ...typography.title,
    color: colors.text,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowRadius: 8,
  },
  slogan: {
    ...typography.caption,
    color: colors.textMuted,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowRadius: 8,
  },
  banner: {
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  bannerWarning: {
    backgroundColor: colors.warningSoft,
    borderColor: colors.warning,
  },
  bannerAlert: {
    backgroundColor: colors.alertSoft,
    borderColor: colors.alert,
  },
  bannerText: {
    flex: 1,
    ...typography.caption,
    color: colors.text,
  },
  mapControls: {
    alignItems: 'flex-end',
    paddingHorizontal: spacing.lg,
  },
  fab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabPressed: {
    backgroundColor: colors.surfaceAlt,
  },
  sheetHost: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
});
