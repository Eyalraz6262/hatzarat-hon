import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { t } from '../../i18n';
import type { SavedDestination } from '../../services/storage/SavedStorage';
import { MAX_DISPLAY_SCALE, spacing, type, useTheme } from '../../theme';
import type { Destination } from '../../types';
import { formatDistance } from '../../utils/geo';
import { CloseIcon, StationNode } from '../icons';
import { GhostButton, Plate, SignalButton, align, row } from '../ui';
import { SavedStrip } from './SavedStrip';
import { RadiusSelector } from './RadiusSelector';
import { TicketStub } from './TicketStub';

type Props = {
  destination: Destination | null;
  radiusM: number;
  distanceM: number | null;
  busy: boolean;
  saved: SavedDestination[];
  onChangeRadius: (radiusM: number) => void;
  onClearDestination: () => void;
  onArm: () => void;
  onPickSaved: (item: SavedDestination) => void;
  onRemoveSaved: (item: SavedDestination) => void;
  onSaveCurrent: (name: string) => void;
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
  saved,
  onChangeRadius,
  onClearDestination,
  onArm,
  onPickSaved,
  onRemoveSaved,
  onSaveCurrent,
}: Props) {
  const theme = useTheme();
  const s = theme.ticket;

  if (!destination) {
    return (
      <TicketStub>
        <SavedStrip items={saved} onPick={onPickSaved} onRemove={onRemoveSaved} />
        <View style={styles.empty}>
          <Plate color={s.textMuted}>{t('plate.destination')}</Plate>
          <Text
            style={[styles.emptyTitle, { color: s.textPrimary, textAlign: align() }]}
            maxFontSizeMultiplier={MAX_DISPLAY_SCALE}
          >
            {t('home.tapToChoose')}
          </Text>
          <Text style={[styles.emptySub, { color: s.textSecondary, textAlign: align() }]}>
            {t('home.tapToChooseSub')}
          </Text>
        </View>
      </TicketStub>
    );
  }

  return (
    <TicketStub>
      {/* The origin/destination line of a ticket. */}
      <View style={[styles.destination, { flexDirection: row() }]}>
        <StationNode size={22} color={theme.accent.base} />
        <View style={styles.destinationText}>
          <Text
            style={[styles.destinationName, { color: s.textPrimary, textAlign: align() }]}
            numberOfLines={1}
          >
            {destination.label}
          </Text>
          {distanceM !== null ? (
            <Text
              style={[styles.destinationMeta, { color: s.textSecondary, textAlign: align() }]}
              numberOfLines={1}
            >
              {t('setup.distanceFromYou', { distance: formatDistance(distanceM) })}
            </Text>
          ) : null}
        </View>
        <Pressable
          onPress={onClearDestination}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t('setup.changeDestination')}
          style={({ pressed }) => [styles.clear, pressed ? styles.clearPressed : null]}
        >
          <CloseIcon size={20} color={s.textMuted} />
        </Pressable>
      </View>

      <View style={styles.radius}>
        <Text style={[styles.radiusTitle, { color: s.textMuted, textAlign: align() }]}>
          {t('setup.radiusTitle')}
        </Text>
        <RadiusSelector value={radiusM} onChange={onChangeRadius} />
      </View>

      <SignalButton
        label={busy ? t('setup.arming') : t('setup.armButton')}
        loading={busy}
        onPress={onArm}
      />

      {/*
        Saving is offered here, under the armed action, rather than as a
        separate flow: the moment someone has just chosen a stop and a radius
        is the only moment they know whether this trip is worth keeping.
      */}
      <GhostButton
        label={t('saved.saveCurrent')}
        surface={s}
        onPress={() =>
          Alert.prompt
            ? Alert.prompt(
                t('saved.addTitle'),
                t('saved.addPrompt'),
                (name) => {
                  const trimmed = name?.trim();
                  if (trimmed) onSaveCurrent(trimmed);
                },
                'plain-text',
                destination.label
              )
            : // Android has no Alert.prompt; the destination's own label is a
              // good enough name, and a second dialog would cost more than it
              // buys for a one-field entry.
              onSaveCurrent(destination.label)
        }
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
  },
  emptySub: {
    ...type.body,
  },
  destination: {
    alignItems: 'flex-start',
    gap: 12,
  },
  destinationText: {
    flex: 1,
    gap: 4,
  },
  destinationName: {
    ...type.subtitle,
  },
  destinationMeta: {
    ...type.labelHeSmall,
  },
  clear: {
    // A 20px glyph needs its own 44px target — the icon is not the button.
    // The negative margins are optical centring (half the 44-22 difference),
    // deliberately off the 4pt spacing grid: they cancel the target's padding
    // rather than creating space.
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -11,
    marginEnd: -12,
  },
  clearPressed: {
    opacity: 0.45,
  },
  radius: {
    gap: spacing.md,
  },
  radiusTitle: {
    ...type.labelHe,
  },
});
