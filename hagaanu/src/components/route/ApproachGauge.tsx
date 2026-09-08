import { StyleSheet, View } from 'react-native';

import { t } from '../../i18n';
import { radius, space, useTheme } from '../../theme';
import { formatDistance } from '../../utils/geo';
import { Txt, row } from '../ui';
import { positionOf, type Approach } from './approach';

/**
 * The last stretch, drawn to scale.
 *
 * Everything on it is measured: the band is the radius the user picked, the
 * mark is the last GPS fix, and the height between them is the real ratio
 * between the two. Nothing is inferred from a route, a timetable or a vehicle,
 * because the app knows none of those.
 *
 * It is drawn only in the `closing` phase. Further out, a 500 m ring inside a
 * 54 km trip is nine tenths of one percent of the height — a hairline — and a
 * gauge whose most important mark is invisible is worse than no gauge. That is
 * also the honest thing: there is nothing to decide until you are close.
 *
 * The window is stated on the gauge itself. A drawing that silently changes
 * scale is the same class of lie as a stop count that is really a sample.
 */

const HEIGHT = 172;
const TRACK_W = 4;
const COLUMN = 30;

export function ApproachGauge({ approach }: { approach: Approach }) {
  const s = useTheme();

  const { windowM, hereM, herePosition, marks } = approach;
  const band = marks[0];
  if (!band || herePosition === null || hereM === null) return null;

  // Where the band starts, as a fraction from the top. It runs from there to
  // the bottom, because anywhere inside the ring is the same thing.
  const bandTop = positionOf(band.radiusM, windowM);

  return (
    <View style={styles.wrap}>
      <View style={[styles.head, { flexDirection: row() }]}>
        <Txt variant="caption" tone="muted" nums>
          {t('approach.window', { distance: formatDistance(windowM) })}
        </Txt>
      </View>

      <View style={[styles.gauge, { height: HEIGHT }]}>
        {/*
          The wake band, spanning the whole gauge rather than the track's own
          column. It is a REGION — the alarm fires anywhere inside it, not at
          one depth — and a band the width of a line reads as another line.
          Its top edge is the only hard threshold, so that edge is the only
          part drawn as one.
        */}
        <View
          style={[
            styles.band,
            { top: `${bandTop * 100}%`, backgroundColor: s.accent.soft, borderTopColor: s.accent.base },
          ]}
        />

        <View style={[styles.rowInner, { flexDirection: row() }]}>
        <View style={[styles.column, { height: HEIGHT }]}>
          <View style={[styles.track, { backgroundColor: s.line }]} />

          {/* The stretch already behind you. */}
          <View
            style={[
              styles.track,
              { backgroundColor: s.accent.base, bottom: undefined, height: `${herePosition * 100}%` },
            ]}
          />

          <View style={[styles.here, { top: `${herePosition * 100}%` }]}>
            <View style={[styles.hereDot, { backgroundColor: s.accent.base, borderColor: s.surface }]} />
          </View>
        </View>

        <View style={styles.labels}>
          <View style={[styles.bandLabel, { top: bandTop * HEIGHT }]}>
            <Txt variant="captionStrong" tone="accent" nums>
              {t('approach.wakeBand', { distance: formatDistance(band.radiusM) })}
            </Txt>
          </View>
        </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm },
  head: { alignItems: 'center' },
  gauge: { position: 'relative' },
  rowInner: { flex: 1, gap: space.md },
  column: {
    width: COLUMN,
    alignItems: 'center',
  },
  track: {
    position: 'absolute',
    width: TRACK_W,
    borderRadius: TRACK_W,
    top: 0,
    bottom: 0,
    left: COLUMN / 2 - TRACK_W / 2,
  },
  band: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 2,
    borderBottomLeftRadius: radius.control,
    borderBottomRightRadius: radius.control,
  },
  here: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    marginTop: -7,
  },
  hereDot: {
    width: 14,
    height: 14,
    borderRadius: 999,
    borderWidth: 3,
  },
  labels: { flex: 1, height: HEIGHT },
  bandLabel: {
    position: 'absolute',
    left: 0,
    right: 0,
    marginTop: 3,
  },
});
