import { useCallback, useMemo, useRef, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { useReducedMotion } from '../../hooks/useReducedMotion';
import { isRTL } from '../../i18n';
import { Feedback } from '../../services/feedback/Haptics';
import { HIT_SIZE, spacing, type, useTheme, type Scheme, type Surface } from '../../theme';

/**
 * The primitives the signage system is built from.
 *
 * Everything here is square, because that single rule is what stops the app
 * reading as a generic card template. The only circles in the app are station
 * nodes and perforation punches, which are circles by nature.
 *
 * Colour comes from the active scheme at render time; layout and type stay in
 * a static StyleSheet. That split is deliberate — geometry does not change
 * between night and day, so only the values that do are recomputed.
 */

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Row direction for the active language. */
export const row = (): ViewStyle['flexDirection'] => (isRTL() ? 'row-reverse' : 'row');

/** Text alignment for the active language. */
export const align = (): TextStyle['textAlign'] => (isRTL() ? 'right' : 'left');

/**
 * Physical press feedback: the control gives under the thumb and springs back.
 *
 * Colour-only pressed states read as a state change; a scale reads as a button
 * being pushed, which is the difference between an interface that responds and
 * one that feels built. Fast down (90ms) and slower up (170ms) — the asymmetry
 * is what makes it feel like weight rather than a blink.
 *
 * Runs on the native driver, and collapses to a no-op under reduce motion.
 */
function usePressScale(to = 0.97) {
  const scale = useRef(new Animated.Value(1)).current;
  const reduced = useReducedMotion();

  const animate = useCallback(
    (value: number, duration: number) => {
      if (reduced) return;
      Animated.timing(scale, {
        toValue: value,
        duration,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
    },
    [scale, reduced]
  );

  return {
    style: { transform: [{ scale }] },
    onPressIn: () => animate(to, 90),
    onPressOut: () => animate(1, 170),
  };
}

/* ------------------------------------------------------------------ *
 * Buttons
 * ------------------------------------------------------------------ */

type SignalButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  /** `signal` on any normal surface, or `ink` when it sits on the alarm flood. */
  tone?: 'signal' | 'ink';
  style?: StyleProp<ViewStyle>;
};

/**
 * The primary action. There is exactly one of these on any screen — it is the
 * screen's single orange, and it is what the ten-second promise rests on.
 */
export function SignalButton({
  label,
  onPress,
  disabled,
  loading,
  tone = 'signal',
  style,
}: SignalButtonProps) {
  const theme = useTheme();
  const inert = disabled || loading;
  const onInk = tone === 'ink';
  const press = usePressScale();

  const base = onInk ? theme.alarm.ink : theme.accent.base;
  const pressedBg = onInk ? theme.world.raised : theme.accent.pressed;
  const labelColor = onInk ? theme.accent.base : theme.accent.contrast;

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(inert) }}
      onPressIn={inert ? undefined : press.onPressIn}
      onPressOut={inert ? undefined : press.onPressOut}
      onPress={
        inert
          ? undefined
          : () => {
              Feedback.tick();
              onPress();
            }
      }
      style={({ pressed }) => [
        styles.signalButton,
        { backgroundColor: inert ? theme.world.divider : pressed ? pressedBg : base },
        press.style,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={labelColor} />
      ) : (
        <Text
          style={[styles.signalButtonLabel, { color: inert ? theme.world.textMuted : labelColor }]}
        >
          {label}
        </Text>
      )}
    </AnimatedPressable>
  );
}

/** The quiet counterpart: an outlined action, drawn on whichever surface it sits on. */
export function OutlineButton({
  label,
  onPress,
  surface,
  style,
}: {
  label: string;
  onPress: () => void;
  surface: Surface;
  style?: StyleProp<ViewStyle>;
}) {
  const press = usePressScale(0.98);
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={({ pressed }) => [
        styles.outlineButton,
        { borderColor: surface.border, backgroundColor: pressed ? surface.pressed : 'transparent' },
        press.style,
        style,
      ]}
    >
      <Text style={[styles.outlineButtonLabel, { color: surface.textPrimary }]}>{label}</Text>
    </AnimatedPressable>
  );
}

/** Text-only, for "not now" and other dismissals. */
export function GhostButton({
  label,
  onPress,
  surface,
  style,
}: {
  label: string;
  onPress: () => void;
  surface: Surface;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.ghostButton,
        pressed ? { backgroundColor: surface.pressed } : null,
        style,
      ]}
    >
      <Text style={[styles.ghostButtonLabel, { color: surface.textMuted }]}>{label}</Text>
    </Pressable>
  );
}

/* ------------------------------------------------------------------ *
 * Signage type
 * ------------------------------------------------------------------ */

/**
 * A Hebrew label. Assistant, no tracking.
 *
 * Kept separate from `Plate` on purpose: the two look interchangeable in a
 * component tree and are not. Passing Hebrew to the mono face silently falls
 * back to a system font while keeping tracking meant for Latin caps.
 */
export function Label({
  children,
  color,
  style,
}: {
  children: ReactNode;
  color: string;
  style?: StyleProp<TextStyle>;
}) {
  return (
    <Text style={[type.labelHe, { color, textAlign: align() }, style]} numberOfLines={1}>
      {children}
    </Text>
  );
}

/**
 * A Latin signage plate — mono, all caps, wide tracking. LATIN ONLY: these are
 * the printed codes on a ticket ("DESTINATION", "WAKE PASS") and stay Latin in
 * every language. For Hebrew use `Label`.
 */
export function Plate({
  children,
  color,
  style,
}: {
  children: ReactNode;
  color: string;
  style?: StyleProp<TextStyle>;
}) {
  return (
    <Text style={[type.label, { color, textAlign: align() }, style]} numberOfLines={1}>
      {children}
    </Text>
  );
}

/**
 * A departures-board readout: a large mono figure with its unit set small
 * beside it, so a column of them lines up on the digits.
 */
export function Readout({
  value,
  unit,
  color,
  unitColor,
  size = 'large',
}: {
  value: string;
  unit?: string;
  color: string;
  unitColor: string;
  size?: 'large' | 'small';
}) {
  return (
    <View style={[styles.readout, { flexDirection: row() }]}>
      <Text style={[size === 'large' ? type.readout : type.readoutSmall, { color }]}>{value}</Text>
      {unit ? <Text style={[styles.readoutUnit, { color: unitColor }]}>{unit}</Text> : null}
    </View>
  );
}

/* ------------------------------------------------------------------ *
 * Ticket furniture
 * ------------------------------------------------------------------ */

/**
 * A tear line: two punched notches and a run of dashes.
 *
 * `behind` is the colour showing through the punches — the world outside the
 * ticket. On a full-bleed pass the notches sit half off-screen and read as two
 * bites taken out of the paper's edge, which is the printed-ticket effect
 * intended.
 */
export function Perforation({ behind, dashes }: { behind: string; dashes: string }) {
  return (
    <View style={styles.perforation}>
      <View style={[styles.notch, styles.notchStart, { backgroundColor: behind }]} />
      <View style={[styles.notch, styles.notchEnd, { backgroundColor: behind }]} />
      <View style={styles.perfDashes}>
        {Array.from({ length: 26 }, (_, index) => (
          <View key={index} style={[styles.perfDash, { backgroundColor: dashes }]} />
        ))}
      </View>
    </View>
  );
}

/** The dotted leader between a timetable label and its value. */
export function DottedLeader({ color }: { color: string }) {
  return (
    <View style={styles.leader}>
      {Array.from({ length: 40 }, (_, index) => (
        <View key={index} style={[styles.leaderDot, { backgroundColor: color }]} />
      ))}
    </View>
  );
}

/**
 * One row of the departures board: label, leader, value.
 * `children` is the value side, so it can be a Readout or plain heading text.
 */
export function BoardRow({
  label,
  surface,
  children,
  divided = true,
}: {
  label: string;
  surface: Surface;
  children: ReactNode;
  divided?: boolean;
}) {
  return (
    <View
      style={[
        styles.boardRow,
        { flexDirection: row() },
        divided ? { borderTopWidth: 1, borderTopColor: surface.divider } : null,
      ]}
    >
      <Label color={surface.textMuted} style={styles.boardLabel}>
        {label}
      </Label>
      <DottedLeader color={surface.faint} />
      <View style={styles.boardValue}>{children}</View>
    </View>
  );
}

/** The live-status mark: a solid signal dot with a tracked caption. */
export function StatusMark({ label, surface }: { label: string; surface: Surface }) {
  const theme = useTheme();
  return (
    <View style={[styles.statusMark, { flexDirection: row() }]}>
      <View style={[styles.statusDot, { backgroundColor: theme.accent.base }]} />
      <Text style={[styles.statusLabel, { color: surface.textPrimary }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/**
 * Convenience for a screen that needs the whole scheme plus one surface.
 * Saves every screen writing the same two lines.
 */
export function useScreenTheme(which: 'world' | 'ticket'): { theme: Scheme; surface: Surface } {
  const theme = useTheme();
  return useMemo(() => ({ theme, surface: theme[which] }), [theme, which]);
}

const styles = StyleSheet.create({
  signalButton: {
    height: 62,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  signalButtonLabel: {
    ...type.button,
  },

  outlineButton: {
    height: 52,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  outlineButtonLabel: {
    ...type.buttonSmall,
  },

  ghostButton: {
    height: HIT_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  ghostButtonLabel: {
    ...type.buttonSmall,
  },

  readout: {
    alignItems: 'baseline',
    gap: 4,
  },
  readoutUnit: {
    fontFamily: type.labelHe.fontFamily,
    fontSize: type.labelHe.fontSize,
  },

  perforation: {
    height: 2,
    justifyContent: 'center',
  },
  notch: {
    position: 'absolute',
    top: -13,
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  notchStart: { start: -13 },
  notchEnd: { end: -13 },
  perfDashes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 16,
  },
  perfDash: {
    width: 6,
    height: 2,
  },

  leader: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    overflow: 'hidden',
    transform: [{ translateY: -3 }],
  },
  leaderDot: {
    width: 1,
    height: 1,
  },

  boardRow: {
    alignItems: 'baseline',
    gap: spacing.sm,
    paddingVertical: 12,
  },
  boardLabel: {
    flexShrink: 0,
  },
  boardValue: {
    flexShrink: 1,
  },

  statusMark: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  statusLabel: {
    ...type.labelHe,
  },
});
