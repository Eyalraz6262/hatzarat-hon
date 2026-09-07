import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import MapView, {
  Circle,
  Marker,
  PROVIDER_DEFAULT,
  PROVIDER_GOOGLE,
  Polyline,
  type Region,
} from 'react-native-maps';

import type { TransitStop } from '../../services/transit/StopsService';
import { mapStyleFor, useTheme } from '../../theme';
import type { Destination, LatLng } from '../../types';
import { regionForRadius } from '../../utils/geo';

export type RouteMapHandle = {
  frameRoute: (from: LatLng | null, to: Destination, radiusM: number) => void;
  frameUser: (coords: LatLng) => void;
};

type Props = {
  initialRegion: Region;
  destination: Destination | null;
  radiusM: number;
  here: LatLng | null;
  stops: TransitStop[];
  /** Full-bleed picker, or the quiet band above the rail. */
  mode: 'picker' | 'band';
  onPickPoint: (coords: LatLng) => void;
};

/**
 * The map.
 *
 * Deliberately NOT the star of this design. In "picker" mode it fills the
 * screen and takes a tap; once a destination exists it becomes a band above
 * the rail, which is where the actual decisions happen. A map that stays
 * dominant after the destination is set would compete with the stop list for
 * the same glance, and the stop list wins that argument every time.
 *
 * Provider choice is per-platform and deliberate: iOS uses Apple Maps
 * (PROVIDER_DEFAULT), which needs no key, no billing account and speaks Hebrew
 * from the OS. Android has no built-in alternative and uses Google Maps, the
 * only external credential in the project (see README).
 */
export const RouteMap = forwardRef<RouteMapHandle, Props>(function RouteMap(
  { initialRegion, destination, radiusM, here, stops, mode, onPickPoint },
  ref
) {
  const s = useTheme();
  const mapRef = useRef<MapView>(null);

  useImperativeHandle(ref, () => ({
    frameRoute(from, to, radius) {
      // With a fix, frame the whole journey; without one, frame the ring. The
      // second case matters more than it looks: before the first fix, framing
      // "everything" would mean framing a route with one known end.
      if (from) {
        mapRef.current?.fitToCoordinates([from, to.coords], {
          edgePadding: { top: 64, right: 56, bottom: 64, left: 56 },
          animated: true,
        });
      } else {
        mapRef.current?.animateToRegion(regionForRadius(to.coords, radius), 460);
      }
    },
    frameUser(coords) {
      mapRef.current?.animateToRegion({ ...coords, latitudeDelta: 0.03, longitudeDelta: 0.03 }, 460);
    },
  }));

  // Only recomputed when the route itself changes, not on every pan or fix.
  const leg = useMemo(
    () => (here && destination ? [here, destination.coords] : null),
    [here, destination]
  );

  return (
    <MapView
      ref={mapRef}
      style={StyleSheet.absoluteFill}
      provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
      customMapStyle={Platform.OS === 'android' ? mapStyleFor(s) : undefined}
      userInterfaceStyle={s.name}
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
      scrollEnabled={mode === 'picker'}
      zoomEnabled={mode === 'picker'}
      onPress={mode === 'picker' ? (e) => onPickPoint(e.nativeEvent.coordinate) : undefined}
      onPoiClick={mode === 'picker' ? (e) => onPickPoint(e.nativeEvent.coordinate) : undefined}
    >
      {leg ? (
        <Polyline
          coordinates={leg}
          strokeColor={s.accent.base}
          strokeWidth={3}
          lineCap="round"
          // A straight line between two points, not a driving route: this app
          // has no routing engine and drawing one would be a claim it cannot
          // back. It reads as "the direction of travel", which is true.
          lineDashPattern={[10, 8]}
        />
      ) : null}

      {destination ? (
        <>
          <Circle
            center={destination.coords}
            radius={radiusM}
            strokeColor={s.accent.base}
            strokeWidth={2}
            fillColor={s.accent.soft}
          />
          <Marker
            coordinate={destination.coords}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
            title={destination.label}
          >
            {/*
              tracksViewChanges off after first paint: a custom marker view
              that keeps re-rasterising is a well-known Android frame sink.
            */}
            <View style={[styles.goal, { backgroundColor: s.bg, borderColor: s.accent.base }]} />
          </Marker>
        </>
      ) : null}

      {stops.map((stop) => (
        <Marker
          key={stop.id}
          coordinate={stop.coords}
          anchor={{ x: 0.5, y: 0.5 }}
          tracksViewChanges={false}
          title={stop.name}
        >
          <View style={[styles.stop, { backgroundColor: s.surface, borderColor: s.inkMuted }]} />
        </Marker>
      ))}
    </MapView>
  );
});

const styles = StyleSheet.create({
  goal: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 4,
  },
  stop: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
  },
});
