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

import { colors, fonts, radii, shadow, spacing, typography } from '../../theme';
import { isRTL } from '../../i18n';

/**
 * The small set of primitives the whole app is built from.
 * Keeping them here (rather than styling ad hoc per screen) is what makes the
 * "minimal, premium" look consistent — and a future light theme a one-file change.
 */

/** Row direction that respects the active language's reading direction. */
export const rowDirection = (): ViewStyle['flexDirection'] => (isRTL() ? 'row-reverse' : 'row');

/** Text alignment for body copy in the active language. */
export const textAlign = (): TextStyle['textAlign'] => (isRTL() ? 'right' : 'left');

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  tone?: 'accent' | 'alert' | 'calm';
  style?: StyleProp<ViewStyle>;
};

const TONE_COLORS = {
  accent: [colors.accent, colors.accentDeep],
  alert: [colors.alert, colors.alertDeep],
  calm: [colors.calm, colors.calm],
} as const;

export function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
  tone = 'accent',
  style,
}: PrimaryButtonProps) {
  const [base, pressedColor] = TONE_COLORS[tone];
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(inactive) }}
      onPress={inactive ? undefined : onPress}
      style={({ pressed }) => [
        styles.primaryButton,
        { backgroundColor: pressed ? pressedColor : base },
        tone === 'accent' ? shadow.button : null,
        inactive ? styles.primaryButtonDisabled : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.white} />
      ) : (
        <Text style={styles.primaryButtonLabel}>{label}</Text>
      )}
    </Pressable>
  );
}

type SecondaryButtonProps = {
  label: string;
  onPress: () => void;
  tone?: 'neutral' | 'alert';
  style?: StyleProp<ViewStyle>;
};

export function SecondaryButton({ label, onPress, tone = 'neutral', style }: SecondaryButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.secondaryButton,
        pressed ? styles.secondaryButtonPressed : null,
        style,
      ]}
    >
      <Text
        style={[
          styles.secondaryButtonLabel,
          tone === 'alert' ? { color: colors.alert } : null,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

type ChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

export function Chip({ label, selected, onPress }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected ? styles.chipSelected : null,
        pressed && !selected ? styles.chipPressed : null,
      ]}
    >
      <Text style={[styles.chipLabel, selected ? styles.chipLabelSelected : null]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

/** Label + value line used throughout the "armed" sheet. */
export function StatRow({ label, value, tone }: { label: string; value: string; tone?: 'calm' }) {
  return (
    <View style={[styles.statRow, { flexDirection: rowDirection() }]}>
      <Text style={styles.statLabel} numberOfLines={1}>
        {label}
      </Text>
      <Text
        style={[styles.statValue, tone === 'calm' ? { color: colors.calm } : null]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

/** Small pulsing dot + text used as the "alarm is live" indicator. */
export function StatusPill({ label, tone = 'calm' }: { label: string; tone?: 'calm' | 'warning' }) {
  const dotColor = tone === 'calm' ? colors.calm : colors.warning;
  const bg = tone === 'calm' ? colors.calmSoft : colors.warningSoft;

  return (
    <View style={[styles.pill, { backgroundColor: bg, flexDirection: rowDirection() }]}>
      <View style={[styles.pillDot, { backgroundColor: dotColor }]} />
      <Text style={[styles.pillLabel, { color: dotColor }]}>{label}</Text>
    </View>
  );
}

export function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  primaryButton: {
    height: 60,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  primaryButtonDisabled: {
    backgroundColor: colors.surfaceMuted,
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryButtonLabel: {
    ...typography.button,
    color: colors.white,
  },
  secondaryButton: {
    height: 48,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  secondaryButtonPressed: {
    backgroundColor: colors.surfaceAlt,
  },
  secondaryButtonLabel: {
    ...typography.body,
    color: colors.textMuted,
  },
  chip: {
    minWidth: 74,
    height: 44,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipPressed: {
    backgroundColor: colors.surfaceMuted,
  },
  chipSelected: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  chipLabel: {
    ...typography.body,
    color: colors.textMuted,
  },
  chipLabelSelected: {
    color: colors.text,
    fontFamily: fonts.bold,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  statLabel: {
    ...typography.body,
    color: colors.textMuted,
    flexShrink: 1,
  },
  statValue: {
    ...typography.subtitle,
    color: colors.text,
    flexShrink: 1,
  },
  pill: {
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
  },
  pillDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pillLabel: {
    ...typography.caption,
    fontFamily: fonts.bold,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
});
