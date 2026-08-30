import { forwardRef, useImperativeHandle, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import MapView, { Circle, Marker, PROVIDER_DEFAULT, PROVIDER_GOOGLE, type Region } from 'react-native-maps';

import { colors, darkMapStyle } from '../../theme';
import type { Destination, LatLng } from '../../types';
import { regionForRadius } from '../../utils/geo';

export type DestinationMapHandle = {
  /** Animates to frame the destination circle. */
  focusDestination: (destination: Destination, radiusM: number) => void;
  /** Animates back to the user's own position. */
  focusUser: (coords: LatLng) => void;
};

type Props = {
  /** Always set — falls back to a country-wide view of Israel before the first fix. */
  initialRegion: Region;
  destination: Destination | null;
  radiusM: number;
  /** Whether the destination pin can still be moved (false once armed). */
  interactive: boolean;
  onPickPoint: (coords: LatLng) => void;
};

/**
 * The map.
 *
 * Provider choice is per-platform and deliberate:
 *  - iOS uses Apple Maps (PROVIDER_DEFAULT), which needs no API key, no billing
 *    account and no attribution work. Hebrew labels come for free from the OS.
 *  - Android has no built-in alternative, so it uses Google Maps and does need a
 *    key (see README). This is the only external credential in the project.
 */
export const DestinationMap = forwardRef<DestinationMapHandle, Props>(function DestinationMap(
  { initialRegion, destination, radiusM, interactive, onPickPoint },
  ref
) {
  const mapRef = useRef<MapView>(null);

  useImperativeHandle(ref, () => ({
    focusDestination(target, radius) {
      mapRef.current?.animateToRegion(regionForRadius(target.coords, radius), 450);
    },
    focusUser(coords) {
      mapRef.current?.animateToRegion(
        { ...coords, latitudeDelta: 0.02, longitudeDelta: 0.02 },
        450
      );
    },
  }));

  return (
    <MapView
      ref={mapRef}
      style={StyleSheet.absoluteFill}
      provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
      customMapStyle={Platform.OS === 'android' ? darkMapStyle : undefined}
      userInterfaceStyle="dark"
      initialRegion={initialRegion}
      showsUserLocation
      showsMyLocationButton={false}
      showsCompass={false}
      showsScale={false}
      toolbarEnabled={false}
      rotateEnabled={false}
      pitchEnabled={false}
      onPress={interactive ? (event) => onPickPoint(event.nativeEvent.coordinate) : undefined}
      onPoiClick={interactive ? (event) => onPickPoint(event.nativeEvent.coordinate) : undefined}
    >
      {destination ? (
        <>
          <Circle
            center={destination.coords}
            radius={radiusM}
            strokeWidth={2}
            strokeColor={colors.accent}
            fillColor={colors.accentSoft}
          />
          <Marker
            coordinate={destination.coords}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
            title={destination.label}
          >
            {/* Custom pin: a target ring, quieter than the platform default and
                readable against the circle it sits inside. */}
            <View style={styles.pinOuter}>
              <View style={styles.pinInner} />
            </View>
          </Marker>
        </>
      ) : null}
    </MapView>
  );
});

const styles = StyleSheet.create({
  pinOuter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
  pinInner: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.accent,
  },
});
