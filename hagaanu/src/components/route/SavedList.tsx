import Briefcase from 'lucide-react-native/icons/briefcase';
import House from 'lucide-react-native/icons/house';
import Star from 'lucide-react-native/icons/star';
import Pin from 'lucide-react-native/icons/pin';
import TrainFront from 'lucide-react-native/icons/train-front';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { t } from '../../i18n';
import { Feedback } from '../../services/feedback/Haptics';
import type { SavedDestination, SavedKind } from '../../services/storage/SavedStorage';
import { elevation, HIT, icon, radius, space, useTheme } from '../../theme';
import { formatDistance } from '../../utils/geo';
import { Touch, Txt, row } from '../ui';

const MARKS: Record<SavedKind, typeof House> = {
  home: House,
  work: Briefcase,
  station: TrainFront,
  favourite: Star,
};

/**
 * Saved destinations, as a horizontal strip over the map.
 *
 * A strip and not a screen: the person who rides the same line every morning
 * should arm tomorrow's alarm without navigating anywhere, and a route
 * transition would spend the ten-second budget the product is built around.
 *
 * Renders nothing when empty. An empty strip holding permanent space on the
 * one screen that matters would cost every user to serve none.
 */
export function SavedList({
  items,
  onPick,
  onRemove,
  onPin,
}: {
  items: SavedDestination[];
  onPick: (item: SavedDestination) => void;
  onRemove: (id: string) => void;
  onPin: (id: string, pinned: boolean) => void;
}) {
  const s = useTheme();

  if (items.length === 0) return null;

  // Long-press rather than buttons on every card: the strip lives on the
  // screen the ten-second budget belongs to, and a row of controls would put
  // "throw this away" beside "use this" at the same weight.
  const options = (item: SavedDestination) => {
    Alert.alert(item.name, undefined, [
      {
        text: item.pinned ? t('saved.unpin') : t('saved.pin'),
        onPress: () => onPin(item.id, !item.pinned),
      },
      { text: t('saved.remove'), style: 'destructive', onPress: () => onRemove(item.id) },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.track, { flexDirection: row() }]}
      // Bounded at 12 by SavedStorage, so a plain map is right here.
    >
      {items.map((item) => {
        const Mark = MARKS[item.kind];
        return (
          <Touch
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
              options(item);
            }}
            style={({ pressed }) => [
              styles.card,
              elevation(1, s),
              {
                backgroundColor: pressed ? s.sunk : s.surface,
                flexDirection: row(),
              },
            ]}
          >
            <Mark size={icon.md} strokeWidth={icon.stroke} color={s.primary.text} />
            <View style={styles.text}>
              <View style={[styles.name, { flexDirection: row() }]}>
                {/*
                  Recency is right for almost everyone and wrong for exactly the
                  person this feature is for: one weekend outing pushes the
                  weekday commute down the list. A pin is the user overriding it.
                */}
                {item.pinned ? (
                  <Pin size={icon.sm - 2} strokeWidth={icon.stroke} color={s.primary.text} />
                ) : null}
                <Txt variant="labelStrong" numberOfLines={1} style={styles.nameText}>
                  {item.name}
                </Txt>
              </View>
              <Txt variant="caption" tone="muted" nums>
                {formatDistance(item.radiusM)}
              </Txt>
            </View>
          </Touch>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  track: {
    gap: space.md,
    paddingVertical: space.xs,
  },
  card: {
    minHeight: HIT + 8,
    maxWidth: 220,
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: radius.control,
  },
  text: {
    flexShrink: 1,
    gap: 1,
  },
  name: {
    alignItems: 'center',
    gap: 5,
  },
  nameText: {
    flexShrink: 1,
  },
});
