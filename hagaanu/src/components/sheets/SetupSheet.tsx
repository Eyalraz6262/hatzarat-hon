import { Pressable, StyleSheet, Text, View } from 'react-native';

import { t } from '../../i18n';
import { MAX_DISPLAY_SCALE, colors, spacing, type } from '../../theme';
import type { Destination } from '../../types';
import { formatDistance } from '../../utils/geo';
import { CloseIcon, StationNode } from '../icons';
import { Plate, SignalButton, align, row } from '../ui';
import { RadiusSelector } from './RadiusSelector';
import { TicketStub } from './TicketStub';

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
 * Pre-arm state: which stop, how close, and the one button.
 *
 * With no destination yet it collapses to a single prompt so the map — the
 * thing the user has to interact with — stays as large as possible.
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
      <TicketStub>
        <View style={styles.empty}>
          <Plate tone="onPaper">{t('plate.destination')}</Plate>
          <Text
            style={[styles.emptyTitle, { textAlign: align() }]}
            maxFontSizeMultiplier={MAX_DISPLAY_SCALE}
          >
            {t('home.tapToChoose')}
          </Text>
          <Text style={[styles.emptySub, { textAlign: align() }]}>{t('home.tapToChooseSub')}</Text>
        </View>
      </TicketStub>
    );
  }

  return (
    <TicketStub>
      {/* The origin/destination line of a ticket. */}
      <View style={[styles.destination, { flexDirection: row() }]}>
        <StationNode size={22} color={colors.signal} />
        <View style={styles.destinationText}>
          <Text style={[styles.destinationName, { textAlign: align() }]} numberOfLines={1}>
            {destination.label}
          </Text>
          {distanceM !== null ? (
            <Text style={[styles.destinationMeta, { textAlign: align() }]} numberOfLines={1}>
              {t('setup.distanceFromYou', { distance: formatDistance(distanceM) })}
            </Text>
          ) : null}
        </View>
        <Pressable
          onPress={onClearDestination}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t('setup.changeDestination')}
          style={styles.clear}
        >
          <CloseIcon size={20} color={colors.paperMuted} />
        </Pressable>
      </View>

      <View style={styles.radius}>
        <Text style={[styles.radiusTitle, { textAlign: align() }]}>{t('setup.radiusTitle')}</Text>
        <RadiusSelector value={radiusM} onChange={onChangeRadius} />
      </View>

      <SignalButton
        label={busy ? t('setup.arming') : t('setup.armButton')}
        loading={busy}
        onPress={onArm}
      />
    </TicketStub>
  );
}

const styles = StyleSheet.create({
  empty: {
    gap: spacing.sm,
    paddingBottom: spacing.xs,
  },
  emptyTitle: {
    ...type.title,
    color: colors.ink,
  },
  emptySub: {
    ...type.body,
    fontSize: 15.5,
    color: colors.rail,
  },
  destination: {
    alignItems: 'flex-start',
    gap: 13,
  },
  destinationText: {
    flex: 1,
    gap: 3,
  },
  destinationName: {
    ...type.subtitle,
    color: colors.ink,
  },
  destinationMeta: {
    ...type.labelHeSmall,
    color: colors.paperSub,
  },
  clear: {
    // A 20px glyph needs its own 44px target — the icon is not the button.
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -11,
    marginEnd: -12,
  },
  radius: {
    gap: spacing.md,
  },
  radiusTitle: {
    ...type.labelHe,
    color: colors.paperMuted,
  },
});
