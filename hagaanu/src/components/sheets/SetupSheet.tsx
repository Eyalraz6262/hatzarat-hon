import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { t } from '../../i18n';
import { colors, spacing, typography } from '../../theme';
import type { Destination } from '../../types';
import { formatDistance } from '../../utils/geo';
import { PrimaryButton, rowDirection, textAlign } from '../ui';
import { RadiusPicker } from './RadiusPicker';
import { BottomSheet } from './BottomSheet';

type Props = {
  destination: Destination | null;
  radiusM: number;
  distanceM: number | null;
  busy: boolean;
  onChangeRadius: (radiusM: number) => void;
  onClearDestination: () => void;
  onArm: () => void;
};

/**
 * Pre-arm state: destination summary, radius picker, and the one big button.
 * When no destination is chosen yet it collapses to a single prompt, keeping the
 * map — the thing the user needs to interact with — as large as possible.
 */
export function SetupSheet({
  destination,
  radiusM,
  distanceM,
  busy,
  onChangeRadius,
  onClearDestination,
  onArm,
}: Props) {
  if (!destination) {
    return (
      <BottomSheet>
        <View style={styles.emptyState}>
          <Text style={[styles.emptyTitle, { textAlign: textAlign() }]}>{t('home.tapToChoose')}</Text>
          <Text style={[styles.emptySubtitle, { textAlign: textAlign() }]}>
            {t('home.tapToChooseSub')}
          </Text>
        </View>
      </BottomSheet>
    );
  }

  return (
    <BottomSheet>
      <View style={[styles.destinationRow, { flexDirection: rowDirection() }]}>
        <Ionicons name="flag" size={20} color={colors.accent} />
        <View style={styles.destinationText}>
          <Text style={[styles.destinationLabel, { textAlign: textAlign() }]} numberOfLines={1}>
            {destination.label}
          </Text>
          {distanceM !== null ? (
            <Text style={[styles.destinationMeta, { textAlign: textAlign() }]}>
              {t('setup.distanceFromYou', { distance: formatDistance(distanceM) })}
            </Text>
          ) : null}
        </View>
        <Pressable
          onPress={onClearDestination}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t('setup.changeDestination')}
        >
          <Ionicons name="close" size={22} color={colors.textFaint} />
        </Pressable>
      </View>

      <View style={styles.radiusBlock}>
        <Text style={[styles.sectionTitle, { textAlign: textAlign() }]}>{t('setup.radiusTitle')}</Text>
        <RadiusPicker value={radiusM} onChange={onChangeRadius} />
      </View>

      <PrimaryButton
        label={busy ? t('setup.arming') : t('setup.armButton')}
        loading={busy}
        onPress={onArm}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  emptyState: {
    paddingBottom: spacing.md,
    gap: spacing.xs,
  },
  emptyTitle: {
    ...typography.title,
    color: colors.text,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textMuted,
  },
  destinationRow: {
    alignItems: 'center',
    gap: spacing.md,
  },
  destinationText: {
    flex: 1,
    gap: 2,
  },
  destinationLabel: {
    ...typography.subtitle,
    color: colors.text,
  },
  destinationMeta: {
    ...typography.caption,
    color: colors.textMuted,
  },
  radiusBlock: {
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.body,
    color: colors.textMuted,
  },
});
