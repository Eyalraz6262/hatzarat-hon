import { forwardRef, useImperativeHandle, useMemo, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';

import { t } from '../../i18n';
import { space, useTheme } from '../../theme';
import type { Destination, LatLng } from '../../types';
import { Txt } from '../ui';

export type RouteMapHandle = {
  frameRoute: (from: LatLng | null, to: Destination, radiusM: number) => void;
  frameUser: (coords: LatLng) => void;
};

type Props = {
  initialRegion: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number };
  destination: Destination | null;
  radiusM: number;
  here: LatLng | null;
  mode: 'picker' | 'band';
  onPickPoint: (coords: LatLng) => void;
};

/**
 * The map, in a browser.
 *
 * `react-native-maps` is a wrapper around MapKit and the Google Maps SDK and
 * has no web implementation at all — importing it into a web bundle fails at
 * `codegenNativeComponent`, before anything renders. So the web build gets
 * this instead.
 *
 * It is deliberately a DIAGRAM rather than a fake map. Drawing invented streets
 * under a real coordinate system would be the same mistake as the stop list:
 * a picture that looks like knowledge and is not. What it shows is only what
 * the app actually knows — where you are, where the destination is, the ring
 * at its true radius relative to the distance between them — and it says so.
 *
 * Tapping still picks a destination, so the whole flow can be operated.
 */
export const RouteMap = forwardRef<RouteMapHandle, Props>(function RouteMapWeb(
  { initialRegion, destination, radiusM, here, mode, onPickPoint },
  ref
) {
  const s = useTheme();
  const [size, setSize] = useState({ width: 0, height: 0 });

  useImperativeHandle(ref, () => ({ frameRoute() {}, frameUser() {} }));

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ width, height });
  };

  /**
   * The visible span, in degrees. Wide enough to hold both ends of the journey
   * with room around them, so the ring's drawn size stays a true fraction of
   * the drawn distance.
   */
  /**
   * Once a destination exists the view frames the RING, not the whole journey.
   *
   * Framing both ends looks reasonable and is useless: 500 m inside an 80 km
   * trip is six tenths of one percent of the width, so the one thing the map is
   * here to show — how big the range you picked actually is — becomes a dot.
   * A real map does the same thing when you drop a pin: it zooms to the pin.
   */
  const span = useMemo(() => {
    if (!destination) return initialRegion.latitudeDelta;
    // Roughly six ring-widths across, so the circle owns about a third of it.
    return Math.max((radiusM * 6) / 111_000, 0.004);
  }, [destination, radiusM, initialRegion.latitudeDelta]);

  const centre = destination?.coords ?? here ?? initialRegion;

  /**
   * The destination sits above the middle, not at it: the sheet covers the
   * lower half of the map, and a ring centred in the viewport is a ring you
   * are looking at the top edge of.
   */
  const focusY = destination ? size.height * 0.27 : size.height / 2;

  const project = (p: LatLng) => ({
    left: size.width / 2 + ((p.longitude - centre.longitude) * 0.85 / span) * size.height,
    top: focusY - ((p.latitude - centre.latitude) / span) * size.height,
  });

  const unproject = (x: number, y: number): LatLng => ({
    latitude: centre.latitude + ((focusY - y) / size.height) * span,
    longitude: centre.longitude + ((x - size.width / 2) / size.height) * span / 0.85,
  });

  // One degree of latitude is ~111 km everywhere, which is all this needs.
  const ringPx = (radiusM / (span * 111_000)) * size.height;

  const goal = destination ? project(destination.coords) : null;
  const me = here ? project(here) : null;

  return (
    <Pressable
      onLayout={onLayout}
      onPress={(e) => {
        if (mode !== 'picker' || !size.width || !size.height) return;

        /**
         * React Native Web does not put `locationX` on a mouse event the way a
         * native touch does — it is only present for real touches. Falling
         * through to the DOM offsets is what makes a click work on a desktop
         * browser, and without it every tap produced a NaN coordinate and a
         * destination whose distance rendered as an em-dash.
         */
        const native = e.nativeEvent as unknown as {
          locationX?: number;
          locationY?: number;
          offsetX?: number;
          offsetY?: number;
        };
        const x = native.locationX ?? native.offsetX;
        const y = native.locationY ?? native.offsetY;
        if (!Number.isFinite(x) || !Number.isFinite(y)) return;

        const picked = unproject(x as number, y as number);
        if (!Number.isFinite(picked.latitude) || !Number.isFinite(picked.longitude)) return;
        onPickPoint(picked);
      }}
      style={[styles.ground, { backgroundColor: s.sunk }]}
    >
      {/* A quiet grid. Not streets: a sheet of paper with a scale on it. */}
      {Array.from({ length: 9 }).map((_, i) => (
        <View
          key={`h${i}`}
          pointerEvents="none"
          style={[styles.grid, { backgroundColor: s.line, top: `${(i + 1) * 10}%`, height: 1 }]}
        />
      ))}
      {Array.from({ length: 9 }).map((_, i) => (
        <View
          key={`v${i}`}
          pointerEvents="none"
          style={[styles.grid, { backgroundColor: s.line, left: `${(i + 1) * 10}%`, width: 1 }]}
        />
      ))}

      {/*
        The line between the two points is drawn as a thin rotated bar rather
        than a bounding box. The box version degenerated into a vertical stripe
        the moment the two ends shared a longitude, which read as a pin on a
        stick rather than as a route.
      */}
      {goal && me ? (
        <View
          pointerEvents="none"
          style={[
            styles.leg,
            {
              backgroundColor: s.primary.base,
              left: (goal.left + me.left) / 2,
              top: (goal.top + me.top) / 2,
              width: Math.hypot(goal.left - me.left, goal.top - me.top),
              transform: [
                { translateX: -Math.hypot(goal.left - me.left, goal.top - me.top) / 2 },
                { rotate: `${Math.atan2(goal.top - me.top, goal.left - me.left)}rad` },
              ],
            },
          ]}
        />
      ) : null}

      {goal ? (
        <>
          <View
            pointerEvents="none"
            style={[
              styles.ring,
              {
                borderColor: s.primary.base,
                backgroundColor: s.primary.soft,
                width: Math.max(ringPx * 2, 12),
                height: Math.max(ringPx * 2, 12),
                left: goal.left - Math.max(ringPx, 6),
                top: goal.top - Math.max(ringPx, 6),
                borderRadius: Math.max(ringPx, 6),
              },
            ]}
          />
          <View
            pointerEvents="none"
            style={[
              styles.goal,
              { backgroundColor: s.bg, borderColor: s.primary.base, left: goal.left - 9, top: goal.top - 9 },
            ]}
          />
        </>
      ) : null}

      {me ? (
        <View
          pointerEvents="none"
          style={[styles.me, { backgroundColor: s.primary.text, borderColor: s.bg, left: me.left - 7, top: me.top - 7 }]}
        />
      ) : null}

      {mode === 'picker' ? (
        <View pointerEvents="none" style={[styles.hint, { backgroundColor: s.surface, borderColor: s.line }]}>
          <Txt variant="caption" tone="muted">
            {t('web.mapHint')}
          </Txt>
        </View>
      ) : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  ground: { ...StyleSheet.absoluteFill, overflow: 'hidden' },
  grid: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, opacity: 0.7 },
  leg: { position: 'absolute', height: 2, borderRadius: 2, opacity: 0.42 },
  ring: { position: 'absolute', borderWidth: 2 },
  goal: { position: 'absolute', width: 18, height: 18, borderRadius: 9, borderWidth: 4 },
  me: { position: 'absolute', width: 14, height: 14, borderRadius: 7, borderWidth: 3 },
  hint: {
    position: 'absolute',
    bottom: space.xxl,
    alignSelf: 'center',
    left: space.xxl,
    right: space.xxl,
    paddingVertical: space.sm,
    paddingHorizontal: space.lg,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
});
