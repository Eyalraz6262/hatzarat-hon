import { StyleSheet, View } from 'react-native';

import { t } from '../../i18n';
import { radius, space, useTheme } from '../../theme';
import { formatDistance } from '../../utils/geo';
import { Txt, row } from '../ui';
import { positionOf, type Approach } from './approach';

/**
 * The last stretch, drawn to scale.
 *
 * Everything on it is measured: the wake band is the radius the user picked,
 * the mark is the last GPS fix, and the height between them is the real ratio
 * between the two. Nothing here is inferred from a route, a timetable or a
 * vehicle, because the app knows none of those.
 *
 * It is drawn only in the `closing` phase. Further out, a 500 m ring inside a
 * 54 km trip is nine tenths of one percent of the height — a hairline — and a
 * gauge whose most important mark is invisible is worse than no gauge. So the
 * screen shows nothing at all during that stretch, which is also the honest
 * thing: there is nothing to decide until you are close.
 *
 * The window is stated on the gauge itself. A drawing that silently changes
 * scale is the same class of lie as a stop count that is really a sample.
 */

const HEIGHT = 208;
const TRACK_W = 3;

export function ApproachGauge({ approach }: { approach: Approach }) {
  const s = useTheme();

  const { windowM, hereM, herePosition, marks } = approach;
  const band = marks[0];
  if (!band || herePosition === null || hereM === null) return null;

  // Top of the wake band, as a fraction of the gauge. The band runs from there
  // to the bottom, because being anywhere inside the ring is the same thing.
  const bandTop = positionOf(band.radiusM, windowM);

  return (
    <View style={styles.wrap}>
      <View style={[styles.scale, { height: HEIGHT }]}>
        <View style={[styles.track, { backgroundColor: s.line }]} />

        {/* The part already behind you. */}
        <View
          style={[
            styles.track,
            {
              backgroundColor: s.accent.base,
              top: 0,
              height: `${herePosition * 100}%`,
            },
          ]}
        />

        {/* The wake band: real radius, real proportion of the real window. */}
        <View
          style={[
            styles.band,
            {
              top: `${bandTop * 100}%`,
              backgroundColor: s.accent.soft,
              borderColor: s.accent.base,
            },
          ]}
        />

        <View style={[styles.here, { top: `${herePosition * 100}%` }]}>
          <View style={[styles.hereDot, { backgroundColor: s.accent.base, borderColor: s.bg }]} />
        </View>
      </View>

      <View style={styles.labels}>
        <View style={[styles.labelRow, { flexDirection: row() }]}>
          <Txt variant="caption" tone="muted" nums>
            {t('approach.window', { distance: formatDistance(windowM) })}
          </Txt>
        </View>

        <View style={[styles.bandLabel, { top: bandTop * HEIGHT }]}>
          <Txt variant="captionStrong" tone="accent" nums>
            {t('approach.wakeBand', { distance: formatDistance(band.radiusM) })}
          </Txt>
        </View>

        <View style={[styles.labelRow, styles.bottom, { flexDirection: row() }]}>
          <Txt variant="captionStrong" numberOfLines={1}>
            {band.label}
          </Txt>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    gap: space.lg,
    paddingVertical: space.sm,
  },
  scale: {
    width: 22,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  track: {
    position: 'absolute',
    width: TRACK_W,
    borderRadius: TRACK_W,
    top: 0,
    bottom: 0,
    left: '50%',
    marginLeft: -TRACK_W / 2,
  },
  band: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 2,
    borderRadius: radius.control,
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
  labels: {
    flex: 1,
    height: HEIGHT,
  },
  labelRow: {
    alignItems: 'center',
  },
  bandLabel: {
    position: 'absolute',
    left: 0,
    right: 0,
    marginTop: 2,
  },
  bottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
});
