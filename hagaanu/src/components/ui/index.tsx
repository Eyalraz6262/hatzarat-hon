import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { isRTL } from '../../i18n';
import { Feedback } from '../../services/feedback/Haptics';
import { HIT_SIZE, colors, spacing, type } from '../../theme';

/**
 * The primitives the signage system is built from.
 *
 * Everything here is square, because that single rule is what stops the app
 * reading as a generic card template. The only circles in the app are station
 * nodes and perforation punches, which are circles by nature.
 */

/** Row direction for the active language. */
export const row = (): ViewStyle['flexDirection'] => (isRTL() ? 'row-reverse' : 'row');

/** Text alignment for the active language. */
export const align = (): TextStyle['textAlign'] => (isRTL() ? 'right' : 'left');

/* ------------------------------------------------------------------ *
 * Buttons
 * ------------------------------------------------------------------ */

type SignalButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  /** `signal` on ink, or `ink` when it sits on the orange alarm surface. */
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
  const inert = disabled || loading;
  const onInk = tone === 'ink';

  const base = onInk ? colors.ink : colors.signal;
  const pressedBg = onInk ? colors.inkRaised : colors.signalDeep;
  const labelColor = onInk ? colors.signal : colors.ink;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(inert) }}
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
        { backgroundColor: pressed ? pressedBg : base },
        inert ? styles.signalButtonInert : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={labelColor} />
      ) : (
        <Text style={[styles.signalButtonLabel, { color: inert ? colors.rail : labelColor }]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

/** The quiet counterpart: an outlined action on paper. */
export function OutlineButton({
  label,
  onPress,
  style,
}: {
  label: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.outlineButton,
        pressed ? { backgroundColor: colors.paperShade } : null,
        style,
      ]}
    >
      <Text style={styles.outlineButtonLabel}>{label}</Text>
    </Pressable>
  );
}

/** Text-only, for "not now" and other dismissals. */
export function GhostButton({
  label,
  onPress,
  tone = 'onInk',
  style,
}: {
  label: string;
  onPress: () => void;
  tone?: 'onInk' | 'onPaper';
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.ghostButton,
        pressed ? { backgroundColor: tone === 'onInk' ? colors.inkRaised : colors.paperShade } : null,
        style,
      ]}
    >
      <Text
        style={[
          styles.ghostButtonLabel,
          { color: tone === 'onInk' ? colors.rail : colors.paperSub },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/* ------------------------------------------------------------------ *
 * Signage type
 * ------------------------------------------------------------------ */

type LabelTone = 'onInk' | 'onPaper' | 'signal';

const labelColor = (tone: LabelTone) =>
  tone === 'signal' ? colors.signal : tone === 'onPaper' ? colors.paperMuted : colors.rail;

/**
 * A Hebrew label. Assistant, no tracking.
 *
 * Kept separate from `Plate` on purpose: the two look interchangeable in a
 * component tree and are not. Passing Hebrew to the mono face silently falls
 * back to a system font while keeping tracking meant for Latin caps.
 */
export function Label({
  children,
  tone = 'onInk',
  style,
}: {
  children: ReactNode;
  tone?: LabelTone;
  style?: StyleProp<TextStyle>;
}) {
  return (
    <Text
      style={[type.labelHe, { color: labelColor(tone), textAlign: align() }, style]}
      numberOfLines={1}
    >
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
  tone = 'onInk',
  style,
}: {
  children: ReactNode;
  tone?: LabelTone;
  style?: StyleProp<TextStyle>;
}) {
  return (
    <Text
      style={[type.label, { color: labelColor(tone), textAlign: align() }, style]}
      numberOfLines={1}
    >
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
  tone = 'ink',
  size = 'large',
}: {
  value: string;
  unit?: string;
  tone?: 'ink' | 'signal' | 'paper';
  size?: 'large' | 'small';
}) {
  const color = tone === 'signal' ? colors.signal : tone === 'paper' ? colors.paper : colors.ink;
  const unitColor = tone === 'signal' ? colors.signal : colors.paperSub;

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
 * ticket, which is ink everywhere it is used today. On a full-bleed pass the
 * notches sit half off-screen and read as two bites taken out of the paper's
 * edge, which is exactly the printed-ticket effect intended.
 */
export function Perforation({ behind = colors.ink }: { behind?: string }) {
  return (
    <View style={styles.perforation}>
      <View style={[styles.notch, styles.notchStart, { backgroundColor: behind }]} />
      <View style={[styles.notch, styles.notchEnd, { backgroundColor: behind }]} />
      <View style={styles.perfDashes}>
        {Array.from({ length: 26 }, (_, index) => (
          <View key={index} style={styles.perfDash} />
        ))}
      </View>
    </View>
  );
}

/** The dotted leader between a timetable label and its value. */
export function DottedLeader() {
  return (
    <View style={styles.leader}>
      {Array.from({ length: 40 }, (_, index) => (
        <View key={index} style={styles.leaderDot} />
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
  children,
  divided = true,
}: {
  label: string;
  children: ReactNode;
  divided?: boolean;
}) {
  return (
    <View style={[styles.boardRow, { flexDirection: row() }, divided ? styles.boardRowDivided : null]}>
      <Label tone="onPaper" style={styles.boardLabel}>
        {label}
      </Label>
      <DottedLeader />
      <View style={styles.boardValue}>{children}</View>
    </View>
  );
}

/** The live-status mark: a solid signal dot with a tracked mono caption. */
export function StatusMark({ label }: { label: string }) {
  return (
    <View style={[styles.statusMark, { flexDirection: row() }]}>
      <View style={styles.statusDot} />
      <Text style={styles.statusLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  signalButton: {
    height: 62,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  signalButtonInert: {
    backgroundColor: colors.inkLine,
  },
  signalButtonLabel: {
    ...type.button,
  },

  outlineButton: {
    height: 52,
    borderWidth: 1.5,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  outlineButtonLabel: {
    ...type.buttonSmall,
    color: colors.ink,
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
    gap: 5,
  },
  readoutUnit: {
    fontFamily: type.bodyStrong.fontFamily,
    fontSize: 13,
  },

  perforation: {
    height: 2,
    backgroundColor: 'transparent',
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
    marginHorizontal: 18,
  },
  perfDash: {
    width: 6,
    height: 2,
    backgroundColor: colors.paperPerf,
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
    backgroundColor: colors.paperPerf,
  },

  boardRow: {
    alignItems: 'baseline',
    gap: spacing.sm,
    paddingVertical: 11,
  },
  boardRowDivided: {
    borderTopWidth: 1,
    borderTopColor: colors.paperRule,
  },
  boardLabel: {
    flexShrink: 0,
  },
  boardValue: {
    flexShrink: 0,
  },

  statusMark: {
    alignItems: 'center',
    gap: 9,
  },
  statusDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: colors.signal,
  },
  statusLabel: {
    ...type.labelHe,
    fontSize: 13.5,
    color: colors.ink,
  },
});
