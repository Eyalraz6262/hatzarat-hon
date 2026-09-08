import { forwardRef, useImperativeHandle, useMemo, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';

import { t } from '../../i18n';
import { space, useTheme } from '../../theme';
import type { Destination, LatLng } from '../../types';
import { formatDistance } from '../../utils/geo';
import { stopsIn, townMarks, urbanCells } from '../../services/places/stops';
import { LAKE_RINGS, LAND_RINGS } from './coastline.generated';
import { LIGHT_RAIL, ROADS } from './network.generated';
import { Txt, row } from '../ui';

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
/**
 * The idle frame: Nahariya down to the northern Negev, sized to the part of the
 * map the bottom sheet leaves visible.
 *
 * Not the whole country. Framing all of it down to Eilat spends a third of the
 * screen on the Arava, where there is nothing to be woken for — this holds the
 * populated corridor the app is actually about, and still shows enough coast,
 * the Dead Sea and the Sea of Galilee to be recognisable at a glance.
 */
const IDLE_SPAN = 5;
const IDLE_CENTRE = { latitude: 31.95, longitude: 34.95 };

export const RouteMap = forwardRef<RouteMapHandle, Props>(function RouteMapWeb(
  { destination, radiusM, here, mode, onPickPoint },
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
    // No destination: the whole country, framed to the part of the map the
    // sheet is not covering. Recognising the shape is the point — a closer
    // view of one stretch of coast could be anywhere.
    if (!destination) return IDLE_SPAN;
    // Roughly six ring-widths across, so the circle owns about a third of it.
    return Math.max((radiusM * 6) / 111_000, 0.004);
  }, [destination, radiusM]);

  // Centred on the coastal corridor until there is somewhere to go.
  // With nothing chosen, the map shows the country rather than following the
  // user: at this scale their own dot is a few pixels either way, and what is
  // worth looking at is the shape they are somewhere inside. Once there is a
  // destination the view belongs to it.
  const centre = destination?.coords ?? IDLE_CENTRE;

  /**
   * The destination sits above the middle, not at it: the sheet covers the
   * lower half of the map, and a ring centred in the viewport is a ring you
   * are looking at the top edge of.
   */
  // The sheet covers the bottom of the map, so neither view is centred on the
  // middle of the screen: both aim at the middle of what can actually be seen.
  const focusY = size.height * (destination ? 0.27 : 0.33);

  const project = (p: LatLng) => ({
    left: size.width / 2 + ((p.longitude - centre.longitude) * 0.85 / span) * size.height,
    top: focusY - ((p.latitude - centre.latitude) / span) * size.height,
  });

  const unproject = (x: number, y: number): LatLng => ({
    latitude: centre.latitude + ((focusY - y) / size.height) * span,
    longitude: centre.longitude + ((x - size.width / 2) / size.height) * span / 0.85,
  });

  // One degree of latitude is ~111 km everywhere, which is all this needs.
  /**
   * How much of the map is worth drawing at this zoom.
   *
   * Every real map does this. A kilometre-square settlement cell is a third of
   * the screen when you are looking at one street, and an individual bus stop
   * is a sub-pixel smudge when you are looking at the country — so each layer
   * appears only across the range where it says something. The thresholds are
   * in degrees of latitude across the viewport, which is what `span` is.
   */
  const detail = useMemo(
    () => ({
      urban: span > 0.12,
      stops: span < 0.12,
      towns: span > 0.02,
      // Roads keep a constant apparent width rather than a constant real one:
      // a hairline at country scale, a street you could drive down up close.
      roadWidth: span > 1.2 ? 1 : span > 0.3 ? 1.6 : span > 0.06 ? 3 : 5,
      // Labelling every village at country scale is illegible; the cut rises
      // as the view widens, and the collision pass thins whatever survives it.
      minStops: span > 2 ? 240 : span > 0.8 ? 60 : span > 0.25 ? 18 : 1,
    }),
    [span]
  );

  /**
   * A packed "lat,lon,…" line as one SVG subpath.
   *
   * Everything drawn here — coast, lakes, roads, rail — ships in that one
   * format, and every layer is a single <path> made of many subpaths rather
   * than many nodes: the browser has 320 road corridors to draw and no reason
   * to keep 320 elements around to do it.
   */
  const subpath = (packed: string, close: boolean, latFirst: boolean): string => {
    const flat = packed.split(',');
    let d = '';
    for (let i = 0; i < flat.length; i += 2) {
      const at = project({
        latitude: Number(flat[latFirst ? i : i + 1]),
        longitude: Number(flat[latFirst ? i + 1 : i]),
      });
      d += `${i === 0 ? 'M' : 'L'}${at.left.toFixed(1)} ${at.top.toFixed(1)}`;
    }
    return close ? `${d}Z` : d;
  };

  const ringPath = (rings: string[]) => rings.map((r) => subpath(r, true, false)).join('');
  const linePath = (lines: string[]) => lines.map((l) => subpath(l, false, true)).join('');

  /**
   * Roads, clipped to what is on screen before anything is measured.
   *
   * At street zoom all but a handful of the corridors are somewhere else in the
   * country, and projecting fifteen thousand points to discover that is work
   * done for nothing on every frame.
   */
  const roadPath = useMemo(() => {
    const margin = span * 0.6;
    let d = '';
    for (const line of ROADS) {
      const flat = line.split(',');
      let visible = false;
      for (let i = 0; i < flat.length && !visible; i += 2) {
        const dLat = Math.abs(Number(flat[i]) - centre.latitude);
        const dLon = Math.abs(Number(flat[i + 1]) - centre.longitude);
        visible = dLat < span / 2 + margin && dLon < span / 2 + margin;
      }
      if (visible) d += subpath(line, false, true);
    }
    return d;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [span, centre.latitude, centre.longitude, focusY, size.width, size.height]);

  /** The settlement layer: one square per kilometre cell that has a stop in it. */
  const urbanPath = useMemo(() => {
    if (!detail.urban) return '';
    const side = Math.max((0.01 / span) * size.height, 1.5);
    let d = '';
    for (const cell of urbanCells()) {
      if (Math.abs(cell.lat - centre.latitude) > span) continue;
      if (Math.abs(cell.lon - centre.longitude) > span) continue;
      const at = project({ latitude: cell.lat, longitude: cell.lon });
      d += `M${(at.left - side / 2).toFixed(1)} ${(at.top - side / 2).toFixed(1)}h${side.toFixed(1)}v${side.toFixed(1)}h${(-side).toFixed(1)}Z`;
    }
    return d;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail.urban, span, centre.latitude, centre.longitude, focusY, size.width, size.height]);

  const nearbyStops = useMemo(() => {
    if (!detail.stops || !size.height) return [];
    const half = span * 0.7;
    return stopsIn(
      centre.latitude - half,
      centre.longitude - half,
      centre.latitude + half,
      centre.longitude + half,
      200
    );
  }, [detail.stops, span, centre.latitude, centre.longitude, size.height]);

  const ringPx = (radiusM / (span * 111_000)) * size.height;

  // A round number of metres that lands near a sixth of the width.
  const metresPerPx = (span * 111_000) / Math.max(size.height, 1);
  const rough = metresPerPx * (size.width / 6);
  const scaleBarM = [100, 200, 500, 1_000, 2_000, 5_000, 10_000, 20_000, 50_000, 100_000].reduce(
    (best, step) => (Math.abs(step - rough) < Math.abs(best - rough) ? step : best),
    100
  );
  const scaleBarPx = scaleBarM / metresPerPx;

  const goal = destination ? project(destination.coords) : null;

  /**
   * Which place labels get drawn, and how loudly.
   *
   * Fifteen hand-listed landmarks is not a labelling scheme, it is a caption.
   * Every town in the country is a candidate now, placed at the middle of its
   * own stops and ranked by how many it has — the closest thing this app has to
   * how big somewhere is, out of the same data as the rest of the map.
   *
   * Two passes, in that order, because that is what makes a map legible: take
   * them biggest first so the name that matters wins the space, then drop any
   * that would land inside a box already claimed.
   */
  const placed = useMemo(() => {
    const taken: { left: number; top: number }[] = [];
    const out: { name: string; major: boolean; at: { left: number; top: number } }[] = [];

    for (const mark of townMarks()) {
      // Sorted biggest first, so nothing after the first miss can qualify.
      if (mark.stops < detail.minStops) break;
      const at = project(mark.coords);
      if (at.left < 8 || at.left > size.width - 8) continue;
      if (at.top < 8 || at.top > size.height - 8) continue;
      // The chosen destination has its own pin and label; the town name printed
      // under it is the same thing said twice.
      if (goal && Math.abs(at.left - goal.left) < 30 && Math.abs(at.top - goal.top) < 30) continue;
      if (taken.some((p) => Math.abs(p.left - at.left) < 62 && Math.abs(p.top - at.top) < 26)) {
        continue;
      }
      taken.push(at);
      out.push({ name: mark.name, major: mark.stops >= detail.minStops * 4, at });
      if (out.length >= 26) break;
    }
    return out;
    // `project` closes over exactly these, and rebuilding on every render would
    // re-measure every label for a frame that has not moved.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail.minStops, size.width, size.height, span, centre.latitude, centre.longitude, focusY, goal?.left, goal?.top]);
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
      style={[styles.ground, { backgroundColor: s.water }]}
    >
      {/*
        The map, drawn rather than fetched.

        react-native-maps has no web build and this page cannot load a tile from
        anywhere, so the alternative to drawing it is not having one. This file
        renders through react-dom — react-native-web *is* react-dom — so an
        <svg> is an ordinary element here in a way it would not be on a device.

        Painter's order, and each layer is real data rather than decoration:
        land from Natural Earth, the built-up areas from where the country's
        26,699 bus stops actually are, roads from the paths those buses drive,
        and the light rail from its own published geometry.
      */}
      {size.width > 0 ? (
        <svg
          width={size.width}
          height={size.height}
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
          aria-hidden="true"
        >
          <path d={ringPath(LAND_RINGS)} fill={s.land} />

          {/* Where people are. Square cells, because that is the honest shape
              of the evidence — one stop somewhere in this kilometre. */}
          {detail.urban ? <path d={urbanPath} fill={s.urban} /> : null}

          <path d={ringPath(LAKE_RINGS)} fill={s.water} />
          <path
            d={ringPath(LAND_RINGS) + ringPath(LAKE_RINGS)}
            fill="none"
            stroke={s.coast}
            strokeWidth={1}
          />

          {/* Casing under fill: a road reads as a road because it has an edge. */}
          <path
            d={roadPath}
            fill="none"
            stroke={s.roadCase}
            strokeWidth={detail.roadWidth + 2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={roadPath}
            fill="none"
            stroke={s.road}
            strokeWidth={detail.roadWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={linePath(LIGHT_RAIL)}
            fill="none"
            stroke={s.rail}
            strokeWidth={1.4}
            strokeDasharray="5 3"
            strokeLinecap="round"
          />

          {/* Close in, the stops themselves — which is the one thing on this
              map the user can actually be woken at. */}
          {detail.stops
            ? nearbyStops.map((stop) => {
                const at = project(stop.coords);
                return (
                  <circle
                    key={`${stop.name}-${at.left}-${at.top}`}
                    cx={at.left}
                    cy={at.top}
                    r={2.4}
                    fill={s.rail}
                  />
                );
              })
            : null}
        </svg>
      ) : null}

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

      {/*
        Real places at their real coordinates. Not decoration and not invented
        cartography: the tiles a map would normally draw cannot be loaded here,
        so what is drawn is the part that can be drawn truthfully.
      */}
      {detail.towns
        ? placed.map(({ name, major, at }) => (
            <View
              key={name}
              pointerEvents="none"
              style={[styles.landmark, { left: at.left, top: at.top }]}
            >
              <View
                style={[
                  styles.landmarkDot,
                  {
                    backgroundColor: major ? s.ink : s.inkMuted,
                    width: major ? 5 : 4,
                    height: major ? 5 : 4,
                  },
                ]}
              />
              <Txt
                numberOfLines={1}
                style={[
                  styles.landmarkName,
                  {
                    color: major ? s.ink : s.inkMuted,
                    fontWeight: major ? '600' : '400',
                    fontSize: major ? 12 : 10.5,
                  },
                ]}
              >
                {name}
              </Txt>
            </View>
          ))
        : null}

      {goal ? (
        <>
          <View
            pointerEvents="none"
            style={[
              styles.ring,
              {
                borderColor: s.primary.base,
                backgroundColor: s.primary.soft,
                // The ring covers the ground the user most wants to look at —
                // which streets are inside it — so it tints the map rather than
                // replacing it. The border is what carries the edge.
                opacity: 0.55,
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

      {/* What a distance on this map actually is. */}
      {size.height > 0 ? (
        <View pointerEvents="none" style={[styles.scale, { flexDirection: row() }]}>
          <View style={[styles.scaleBar, { borderColor: s.inkMuted, width: scaleBarPx }]} />
          <Txt variant="caption" tone="muted" nums>
            {formatDistance(scaleBarM)}
          </Txt>
        </View>
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
  leg: { position: 'absolute', height: 2, borderRadius: 2, opacity: 0.42 },
  ring: { position: 'absolute', borderWidth: 2 },
  goal: { position: 'absolute', width: 18, height: 18, borderRadius: 9, borderWidth: 4 },
  me: { position: 'absolute', width: 14, height: 14, borderRadius: 7, borderWidth: 3 },
  landmark: {
    position: 'absolute',
    alignItems: 'center',
    marginLeft: -40,
    marginTop: -4,
    width: 80,
    gap: 2,
  },
  landmarkDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  landmarkName: { textAlign: 'center' },
  scale: {
    position: 'absolute',
    // Top, not bottom: the sheet owns the lower half of this screen and a
    // scale bar down there is a scale bar nobody ever sees.
    top: 96,
    left: 16,
    alignItems: 'center',
    gap: 6,
  },
  scaleBar: {
    height: 7,
    borderBottomWidth: 1.5,
    borderLeftWidth: 1.5,
    borderRightWidth: 1.5,
  },
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
