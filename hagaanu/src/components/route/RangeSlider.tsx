import { useCallback, useRef, useState } from 'react';
import { PanResponder, StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { RADIUS_PRESETS } from '../../constants/config';
import { isRTL, t } from '../../i18n';
import { Feedback } from '../../services/feedback/Haptics';
import { space, useTheme } from '../../theme';
import { formatDistance } from '../../utils/geo';
import { Txt, row } from '../ui';

/**
 * How early to wake up.
 *
 * A slider, and it snaps. The steps are the same handful of distances the app
 * has always offered, laid out evenly rather than by their real spacing — 300 m
 * and 5 km on a linear axis would leave the first three steps stacked on top of
 * each other and unusable with a thumb.
 *
 * Snapping is what makes a slider acceptable here at all. The app is used one
 * handed on a moving vehicle, and a control that can land on 437 m asks for a
 * precision neither the GPS nor the passenger has. Every step is a real answer,
 * and each one lands with a tick you can feel, so the value can be changed
 * without looking at it.
 *
 * The map's ring follows this live. That is the point of the control: the
 * number means nothing on its own, and the circle growing over the destination
 * is what the choice actually is.
 */
export function RangeSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (radiusM: number) => void;
}) {
  const s = useTheme();
  const [width, setWidth] = useState(0);
  const last = useRef(value);

  const steps = RADIUS_PRESETS;
  const index = Math.max(0, steps.indexOf(value as (typeof steps)[number]));
  const ratio = steps.length > 1 ? index / (steps.length - 1) : 0;

  /**
   * Absolute positions are computed as PHYSICAL percentages rather than left to
   * `start`/`end`, which the two platforms resolve differently for absolutely
   * positioned children: the filled rail mirrored correctly and the thumb did
   * not, and they ended up symmetric about the centre instead of on top of each
   * other. One rule, applied by hand, is worth more here than two that disagree.
   */
  const rtl = isRTL();
  const physical = (fraction: number) => `${(rtl ? 1 - fraction : fraction) * 100}%`;

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const pick = useCallback(
    (x: number) => {
      if (width <= 0) return;
      /**
       * `locationX` is measured from the physical left edge, which is the END
       * of the track in Hebrew. Everything else on this control is positioned
       * with `start`/`end` so the platform mirrors it; this one number has to
       * be mirrored by hand, because a touch coordinate has no direction.
       */
      const physical = Math.min(Math.max(x / width, 0), 1);
      const fraction = isRTL() ? 1 - physical : physical;
      const i = Math.round(fraction * (steps.length - 1));
      const next = steps[i];
      if (next === last.current) return;
      last.current = next;
      Feedback.tick();
      onChange(next);
    },
    [width, steps, onChange]
  );

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => pick(e.nativeEvent.locationX),
      onPanResponderMove: (e) => pick(e.nativeEvent.locationX),
    })
  ).current;

  return (
    <View style={styles.wrap}>
      <View style={[styles.head, { flexDirection: row() }]}>
        <Txt variant="heading" style={styles.grow}>
          {t('route.wakeRange')}
        </Txt>
        <Txt variant="heading" tone="primary" nums>
          {formatDistance(value)}
        </Txt>
      </View>

      <View
        style={styles.track}
        onLayout={onLayout}
        {...pan.panHandlers}
        accessibilityRole="adjustable"
        accessibilityLabel={t('route.wakeRange')}
        accessibilityValue={{ text: formatDistance(value) }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => {
          const step = e.nativeEvent.actionName === 'increment' ? 1 : -1;
          const i = Math.min(Math.max(index + step, 0), steps.length - 1);
          if (steps[i] !== value) {
            last.current = steps[i];
            onChange(steps[i]);
          }
        }}
      >
        <View style={[styles.rail, { backgroundColor: s.sunk }]} />
        <View
          style={[
            styles.rail,
            {
              backgroundColor: s.primary.base,
              width: `${ratio * 100}%`,
              left: rtl ? undefined : 0,
              right: rtl ? 0 : undefined,
            },
          ]}
        />

        {steps.map((step, i) => (
          <View
            key={step}
            style={[
              styles.notch,
              {
                left: physical(i / (steps.length - 1)) as unknown as number,
                backgroundColor: i <= index ? s.primary.on : s.lineStrong,
              },
            ]}
          />
        ))}

        <View
          style={[
            styles.thumb,
            {
              left: physical(ratio) as unknown as number,
              backgroundColor: s.surface,
              borderColor: s.primary.base,
            },
          ]}
          pointerEvents="none"
        />
      </View>

      <View style={[styles.scale, { flexDirection: row() }]}>
        {steps.map((step) => (
          <Txt
            key={step}
            variant="caption"
            tone={step === value ? 'primary' : 'muted'}
            nums
            style={styles.scaleLabel}
          >
            {formatDistance(step)}
          </Txt>
        ))}
      </View>
    </View>
  );
}

const THUMB = 28;

const styles = StyleSheet.create({
  wrap: { gap: space.md },
  head: { alignItems: 'baseline', gap: space.md },
  grow: { flexGrow: 1, flexShrink: 1 },
  track: {
    height: 44, // the touch target, not the rail
    justifyContent: 'center',
  },
  rail: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 6,
    borderRadius: 999,
  },
  notch: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 999,
    marginLeft: -2,
  },
  thumb: {
    position: 'absolute',
    width: THUMB,
    height: THUMB,
    marginLeft: -THUMB / 2,
    borderRadius: 999,
    borderWidth: 4,
  },
  scale: { justifyContent: 'space-between' },
  scaleLabel: { flexShrink: 1 },
});
