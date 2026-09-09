import { useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text as RNText,
  View,
  type PressableProps,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { useReducedMotion } from '../../hooks/useReducedMotion';
import { isRTL } from '../../i18n';
import {
  HIT,
  MAX_CHROME_SCALE,
  elevation,
  motion,
  radius,
  space,
  tabular,
  type,
  useTheme,
  type Scheme,
} from '../../theme';

/**
 * The primitives.
 *
 * Every visible surface in the app is built from what is in this file, which
 * is how the shape, spacing and press behaviour stay identical across screens.
 * Nothing here takes a colour: each component reads the active scheme itself,
 * so a screen cannot hand a component the wrong theme.
 */

/* ------------------------------------------------------------------ *
 * Direction
 * ------------------------------------------------------------------ */

/**
 * The app is Hebrew-first, so RTL is the normal case rather than a mode.
 *
 * These follow the LANGUAGE rather than `I18nManager.isRTL`, and the
 * difference is not academic. React Native fixes the native flag at startup
 * from whatever the previous launch wrote, so reading it gets the app wrong
 * twice: a Hebrew user's very first launch renders left-to-right because
 * nothing has written the flag yet, and an English or Russian user renders
 * mirrored from their second launch onward because a previous launch wrote
 * RTL. The language is known before the first frame and is always right.
 *
 * The native flag still matters for views we do not draw — the caret in a
 * `TextInput`, the button order in an `Alert` — and `App` writes it from the
 * resolved language so those converge on the next launch.
 */
export const align = (): TextStyle['textAlign'] => (isRTL() ? 'right' : 'left');

/**
 * `row-reverse` on a device, plain `row` in a browser — and the difference is
 * not a quirk to paper over.
 *
 * React Native only mirrors a `row` when its own RTL flag was set at native
 * startup, which is exactly the flag we cannot trust, so the direction has to
 * be spelled out. CSS mirrors a `row` whenever the document direction is rtl,
 * which the web build sets from the language on the first paint. Spelling it
 * out there as well would reverse an already-reversed row and hand every
 * screen back to left-to-right.
 */
export const row = (): ViewStyle['flexDirection'] =>
  Platform.OS === 'web' ? 'row' : isRTL() ? 'row-reverse' : 'row';

/* ------------------------------------------------------------------ *
 * Text
 * ------------------------------------------------------------------ */

type Variant = keyof typeof type;
/**
 * The text colours, by role rather than by value.
 *
 * `primary` is the brand and appears on one thing per screen. `success` says
 * the alarm is armed and nothing else. `danger` says cancel and nothing else.
 * Anything else is the neutral ramp, which is most of the app.
 */
type Tone =
  | 'ink'
  | 'muted'
  | 'faint'
  | 'primary'
  | 'success'
  | 'danger'
  | 'onPrimary'
  | 'onAlarm'
  | 'alarmDim';

function toneColor(tone: Tone, s: Scheme): string {
  switch (tone) {
    case 'muted':
      return s.inkMuted;
    case 'faint':
      return s.inkFaint;
    case 'primary':
      return s.primary.text;
    case 'success':
      return s.success.text;
    case 'danger':
      return s.danger.text;
    case 'onPrimary':
      return s.primary.on;
    case 'onAlarm':
      return s.alarm.on;
    case 'alarmDim':
      return s.alarm.dim;
    default:
      return s.ink;
  }
}

type TxtProps = TextProps & {
  variant?: Variant;
  tone?: Tone;
  /** Digits that line up in a column. */
  nums?: boolean;
  children?: ReactNode;
};

/**
 * The only way text is set in this app.
 *
 * `maxFontSizeMultiplier` is applied to chrome sizes but never to body copy:
 * a button label that grows past its pill becomes unreadable, while a
 * paragraph that grows is exactly what the setting is for.
 */
export function Txt({ variant = 'body', tone = 'ink', nums, style, ...rest }: TxtProps) {
  const scheme = useTheme();
  const isChrome = variant === 'button' || variant === 'caption' || variant === 'captionStrong';
  return (
    <RNText
      maxFontSizeMultiplier={isChrome ? MAX_CHROME_SCALE : undefined}
      style={[
        type[variant],
        { color: toneColor(tone, scheme), textAlign: align() },
        nums ? tabular : null,
        style,
      ]}
      {...rest}
    />
  );
}

/* ------------------------------------------------------------------ *
 * Press
 * ------------------------------------------------------------------ */

/**
 * The press scale, native-driven, on every touchable in the app.
 *
 * Down is faster than up on purpose: the finger arrives instantly and leaves
 * gradually, and matching that is the difference between a control that feels
 * responsive and one that feels springy.
 */
function usePressScale(to = 0.97) {
  const scale = useRef(new Animated.Value(1)).current;
  const reduced = useReducedMotion();

  const run = useCallback(
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

  return useMemo(
    () => ({
      style: { transform: [{ scale }] },
      onPressIn: () => run(to, motion.pressIn),
      onPressOut: () => run(1, motion.pressOut),
    }),
    [scale, run, to]
  );
}

type TouchProps = PressableProps & {
  /** This Touch is a flex child and should share its row equally. */
  fill?: boolean;
  scaleTo?: number;
  children: ReactNode;
};

/** A Pressable with the app's press feedback already on it. */
export function Touch({ style, scaleTo, fill, children, ...rest }: TouchProps) {
  const press = usePressScale(scaleTo);
  return (
    /**
     * The press scale lives on a wrapper, and a wrapper is not transparent to
     * layout: a `flex: 1` on the Pressable inside it does nothing, because the
     * wrapper is the flex child and it sizes to its content. That is why `fill`
     * exists — every Touch that has to share a row equally (a tab bar, a
     * segmented control) sets it, and the flex lands on the node that is
     * actually being laid out.
     */
    <Animated.View style={[press.style, fill ? styles.fill : null]}>
      <Pressable style={style} onPressIn={press.onPressIn} onPressOut={press.onPressOut} {...rest}>
        {children}
      </Pressable>
    </Animated.View>
  );
}

/* ------------------------------------------------------------------ *
 * Buttons
 * ------------------------------------------------------------------ */

type ButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * The primary action. One per screen, always in the bottom third.
 *
 * Dark ink on the accent rather than white: white on a green this fresh
 * measures 3.24:1 and the usual remedy is to darken the green until white
 * works, which costs the colour its character. See theme/colors.ts.
 */
export function PrimaryButton({ label, onPress, disabled, busy, icon, style }: ButtonProps) {
  const s = useTheme();
  const off = disabled || busy;
  return (
    <Touch
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!off, busy: !!busy }}
      disabled={off}
      onPress={onPress}
      scaleTo={0.98}
      style={({ pressed }) => [
        styles.btn,
        elevation(1, s),
        {
          backgroundColor: pressed ? s.primary.pressed : s.primary.base,
          opacity: off ? 0.5 : 1,
          flexDirection: row(),
        },
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={s.primary.on} />
      ) : (
        <>
          {icon}
          <Txt variant="button" tone="onPrimary">
            {label}
          </Txt>
        </>
      )}
    </Touch>
  );
}

/** The secondary action: cancel, skip, not now. Never competes with primary. */
export function GhostButton({ label, onPress, disabled, icon, style }: ButtonProps) {
  const s = useTheme();
  return (
    <Touch
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      scaleTo={0.98}
      style={({ pressed }) => [
        styles.btn,
        {
          borderWidth: 1.5,
          borderColor: s.line,
          backgroundColor: pressed ? s.sunk : 'transparent',
          opacity: disabled ? 0.5 : 1,
          flexDirection: row(),
        },
        style,
      ]}
    >
      {icon}
      <Txt variant="button" tone="muted">
        {label}
      </Txt>
    </Touch>
  );
}

/** A destructive action, styled as quietly as its consequence is loud. */
export function DangerButton({ label, onPress, style }: ButtonProps) {
  const s = useTheme();
  return (
    <Touch
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      scaleTo={0.98}
      style={({ pressed }) => [
        styles.btn,
        { borderWidth: 1.5, borderColor: s.line, backgroundColor: pressed ? s.sunk : 'transparent' },
        style,
      ]}
    >
      <Txt variant="button" tone="danger">
        {label}
      </Txt>
    </Touch>
  );
}

/* ------------------------------------------------------------------ *
 * Surfaces
 * ------------------------------------------------------------------ */

/**
 * A raised plane.
 *
 * Not every group is a card. Rows separated by a hairline inside ONE card
 * is the pattern for a list of facts; three cards each holding one fact is
 * the pattern this app deliberately avoids.
 */
export function Card({
  children,
  style,
  padded = true,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
}) {
  const s = useTheme();
  return (
    <View
      style={[
        styles.card,
        elevation(1, s),
        { backgroundColor: s.surface, padding: padded ? space.xl : 0 },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** A label/value line inside a Card. Hairline above every row but the first. */
export function Row({
  label,
  children,
  first,
}: {
  label: string;
  children: ReactNode;
  first?: boolean;
}) {
  const s = useTheme();
  return (
    <View
      style={[
        styles.rowLine,
        { flexDirection: row(), borderTopColor: s.line, borderTopWidth: first ? 0 : StyleSheet.hairlineWidth },
      ]}
    >
      <Txt variant="label" tone="muted">
        {label}
      </Txt>
      <View style={styles.rowValue}>{children}</View>
    </View>
  );
}

/** A status chip. Used once per screen, next to the thing it describes. */
/**
 * A status pill.
 *
 * `success` is the armed state and the only place green appears in the app.
 * `primary` is informational. `muted` is a state that is not good news but is
 * not an error either, which is what a lost signal is.
 */
export function Chip({
  label,
  live,
  tone = 'primary',
}: {
  label: string;
  live?: boolean;
  tone?: 'primary' | 'success' | 'muted';
}) {
  const s = useTheme();
  const fill = tone === 'success' ? s.success.soft : tone === 'muted' ? s.sunk : s.primary.soft;
  const text: Tone = tone === 'success' ? 'success' : tone === 'muted' ? 'muted' : 'primary';

  return (
    <View style={[styles.chip, { backgroundColor: fill, flexDirection: row() }]}>
      {live ? <LiveDot tone={tone === 'success' ? 'success' : 'primary'} /> : null}
      <Txt variant="captionStrong" tone={text}>
        {label}
      </Txt>
    </View>
  );
}

/**
 * The one ambient animation in the app: a slow fade on the live indicator.
 *
 * It earns its place because "is this still running while my screen is off?"
 * is the single question the armed state has to answer, and a dot that
 * breathes answers it without a word.
 */
export function LiveDot({
  size = 7,
  tone = 'primary',
}: {
  size?: number;
  tone?: 'primary' | 'success';
}) {
  const s = useTheme();
  const reduced = useReducedMotion();
  const fade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(fade, {
          toValue: 0.3,
          duration: motion.pulse,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(fade, {
          toValue: 1,
          duration: motion.pulse,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [fade, reduced]);

  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: tone === 'success' ? s.success.base : s.primary.base,
        opacity: fade,
      }}
    />
  );
}

/* ------------------------------------------------------------------ *
 * Skeleton
 * ------------------------------------------------------------------ */

/**
 * A placeholder shaped like the thing that is coming.
 *
 * Static rather than shimmering: a shimmer is motion with nothing to say,
 * and on the screen where the user is waiting to find out whether the app
 * knows their stops, calm is the right register.
 */
export function Skeleton({ width, height = 14 }: { width: number | `${number}%`; height?: number }) {
  const s = useTheme();
  return <View style={{ width, height, borderRadius: 6, backgroundColor: s.sunk }} />;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  btn: {
    minHeight: 56,
    borderRadius: radius.pill,
    paddingHorizontal: space.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  card: {
    borderRadius: radius.card,
  },
  rowLine: {
    minHeight: HIT,
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.lg,
    paddingVertical: space.md,
  },
  rowValue: {
    flexShrink: 1,
    alignItems: 'flex-end',
  },
  chip: {
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.sm - 2,
    borderRadius: radius.pill,
  },
});
