import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { t } from '../../i18n';
import { Feedback } from '../../services/feedback/Haptics';
import type { SavedDestination, SavedKind } from '../../services/storage/SavedStorage';
import { spacing, type, useTheme } from '../../theme';
import { formatDistance } from '../../utils/geo';
import { HomeIcon, StarIcon, TrainIcon, WorkIcon } from '../icons';
import { Plate, row } from '../ui';

type Props = {
  items: SavedDestination[];
  onPick: (item: SavedDestination) => void;
  onRemove: (item: SavedDestination) => void;
};

const MARKS: Record<SavedKind, typeof HomeIcon> = {
  home: HomeIcon,
  work: WorkIcon,
  station: TrainIcon,
  favourite: StarIcon,
};

/**
 * Saved destinations, as a row of torn ticket stubs above the setup sheet.
 *
 * A horizontal strip rather than a screen, because the whole value is speed:
 * the commuter who rides the same line every morning should arm tomorrow's
 * alarm without navigating anywhere. Putting these behind a route would spend
 * the ten-second budget the product is built around.
 *
 * Renders nothing when empty — an empty strip taking up permanent space on the
 * one screen that matters would cost every user to serve none.
 */
export function SavedStrip({ items, onPick, onRemove }: Props) {
  const theme = useTheme();
  const s = theme.ticket;

  if (items.length === 0) return null;

  // Long-press rather than a delete affordance on every stub: the strip lives on
  // the one screen the ten-second budget belongs to, and a row of X buttons would
  // put "throw this away" next to "use this" at the same weight.
  const confirmRemove = (item: SavedDestination) => {
    Alert.alert(t('saved.removeConfirm', { name: item.name }), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('saved.remove'), style: 'destructive', onPress: () => onRemove(item) },
    ]);
  };

  return (
    <View style={styles.wrap}>
      <Plate color={s.textMuted} style={styles.plate}>
        {t('plate.saved')}
      </Plate>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.track, { flexDirection: row() }]}
      >
        {items.map((item) => {
          const Mark = MARKS[item.kind];
          return (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={item.name}
              accessibilityHint={t('saved.removeHint')}
              onPress={() => {
                Feedback.tick();
                onPick(item);
              }}
              onLongPress={() => {
                Feedback.tick();
                confirmRemove(item);
              }}
              style={({ pressed }) => [
                styles.stub,
                {
                  borderColor: s.border,
                  backgroundColor: pressed ? s.pressed : 'transparent',
                  flexDirection: row(),
                },
              ]}
            >
              {/* The punch that makes it read as torn from a larger ticket. */}
              <View style={[styles.punch, { backgroundColor: s.bg, borderColor: s.border }]} />
              <Mark size={20} color={s.textPrimary} />
              <View style={styles.text}>
                <Text style={[styles.name, { color: s.textPrimary }]} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={[styles.radius, { color: s.textMuted }]} numberOfLines={1}>
                  {formatDistance(item.radiusM)}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  plate: {
    paddingHorizontal: spacing.xs,
  },
  track: {
    gap: spacing.sm,
    paddingEnd: spacing.xs,
  },
  stub: {
    position: 'relative',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 56,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  /** A half-circle bitten out of the leading edge. */
  punch: {
    position: 'absolute',
    start: -8,
    top: '50%',
    marginTop: -8,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  text: {
    gap: 2,
  },
  name: {
    ...type.bodyStrong,
  },
  radius: {
    ...type.label,
  },
});
