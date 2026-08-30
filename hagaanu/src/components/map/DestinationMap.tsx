import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import MapView, {
  Marker,
  Polyline,
  PROVIDER_DEFAULT,
  PROVIDER_GOOGLE,
  type Region,
} from 'react-native-maps';

import { colors, darkMapStyle } from '../../theme';
import type { Destination, LatLng } from '../../types';
import { dimensionLine, regionForRadius, ringPoints, ringTicks } from '../../utils/geo';

export type DestinationMapHandle = {
  focusDestination: (destination: Destination, radiusM: number) => void;
  focusUser: (coords: LatLng) => void;
};

type Props = {
  /** Always set — falls back to a country-wide view of Israel before the first fix. */
  initialRegion: Region;
  destination: Destination | null;
  radiusM: number;
  /** Whether the destination can still be moved (false once armed). */
  interactive: boolean;
  onPickPoint: (coords: LatLng) => void;
};

/**
 * The map.
 *
 * Provider choice is per-platform and deliberate: iOS uses Apple Maps
 * (PROVIDER_DEFAULT) — no key, no billing account, Hebrew labels from the OS.
 * Android has no built-in alternative and uses Google Maps, which is the only
 * external credential in the project (see README).
 *
 * The alert zone is NOT a map Circle. Neither platform's Circle overlay can be
 * dashed, and a solid translucent disc is the generic treatment the whole design
 * direction exists to get away from. Instead it is drawn from polylines as a
 * survey diagram: a dashed ring, twelve azimuth ticks, and a dimension line
 * calling the radius — the vocabulary of a rail plan, in the map's own space, so
 * it stays geographically true at every zoom.
 */
export const DestinationMap = forwardRef<DestinationMapHandle, Props>(function DestinationMap(
  { initialRegion, destination, radiusM, interactive, onPickPoint },
  ref
) {
  const mapRef = useRef<MapView>(null);

  useImperativeHandle(ref, () => ({
    focusDestination(target, radius) {
      mapRef.current?.animateToRegion(regionForRadius(target.coords, radius), 480);
    },
    focusUser(coords) {
      mapRef.current?.animateToRegion({ ...coords, latitudeDelta: 0.02, longitudeDelta: 0.02 }, 480);
    },
  }));

  // Recomputed only when the zone itself changes — not on every pan.
  const zone = useMemo(() => {
    if (!destination) return null;
    return {
      ring: ringPoints(destination.coords, radiusM),
      ticks: ringTicks(destination.coords, radiusM),
      ...dimensionLine(destination.coords, radiusM),
    };
  }, [destination, radiusM]);

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
      showsBuildings={false}
      showsTraffic={false}
      toolbarEnabled={false}
      rotateEnabled={false}
      pitchEnabled={false}
      onPress={interactive ? (event) => onPickPoint(event.nativeEvent.coordinate) : undefined}
      onPoiClick={interactive ? (event) => onPickPoint(event.nativeEvent.coordinate) : undefined}
    >
      {destination && zone ? (
        <>
          <Polyline
            coordinates={zone.ring}
            strokeColor={colors.signal}
            strokeWidth={2}
            lineDashPattern={[7, 6]}
            lineCap="butt"
          />

          {zone.ticks.map((tick, index) => (
            <Polyline
              key={`tick-${index}`}
              coordinates={tick}
              strokeColor={colors.signal}
              strokeWidth={2}
              lineCap="round"
            />
          ))}

          <Polyline coordinates={zone.line} strokeColor={colors.signal} strokeWidth={1.5} />
          <Polyline coordinates={zone.cap} strokeColor={colors.signal} strokeWidth={1.5} />

          {/*
            The interchange marker of a transit diagram — the same object the
            sheet and the saved list use, so a destination always looks like a
            destination. `tracksViewChanges` off after first paint: a custom
            marker view that keeps re-rasterising is a well-known Android
            frame-rate sink.
          */}
          <Marker
            coordinate={destination.coords}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
            title={destination.label}
          >
            <View style={styles.node}>
              <View style={styles.nodeCore} />
            </View>
          </Marker>
        </>
      ) : null}
    </MapView>
  );
});

const styles = StyleSheet.create({
  node: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.signal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeCore: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.ink,
  },
});
