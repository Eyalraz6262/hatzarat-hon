import Briefcase from 'lucide-react-native/icons/briefcase';
import House from 'lucide-react-native/icons/house';
import MapPin from 'lucide-react-native/icons/map-pin';
import Star from 'lucide-react-native/icons/star';
import TrainFront from 'lucide-react-native/icons/train-front';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GhostButton, Touch, Txt, row } from '../components/ui';
import { t } from '../i18n';
import { Feedback } from '../services/feedback/Haptics';
import type { SavedDestination, SavedKind } from '../services/storage/saved';
import { useAlarmStore } from '../state/useAlarmStore';
import { hitSlop, icon, radius, space, useTheme } from '../theme';
import { formatDistance } from '../utils/geo';

const MARK: Record<SavedKind, typeof House> = {
  home: House,
  work: Briefcase,
  station: TrainFront,
  favourite: MapPin,
};

/**
 * The places you keep.
 *
 * A tab rather than a strip on the map, because for the person this app is
 * built for — the same commute every weekday — this IS the app. Two taps from
 * cold to armed: the place, then the button.
 *
 * The star is the only control on a row. Everything else is behind a long
 * press, because a row of icons beside every place turns a two-tap list into a
 * screen you have to read.
 */
export function PlacesScreen({ onPicked }: { onPicked: () => void }) {
  const s = useTheme();
  const saved = useAlarmStore((state) => state.saved);
  const useSaved = useAlarmStore((state) => state.useSaved);
  const removeSaved = useAlarmStore((state) => state.removeSaved);
  const pinSaved = useAlarmStore((state) => state.pinSaved);

  const pinned = saved.filter((item) => item.pinned);
  const rest = saved.filter((item) => !item.pinned);

  const options = (item: SavedDestination) => {
    Alert.alert(item.name, undefined, [
      {
        text: item.pinned ? t('saved.unpin') : t('saved.pin'),
        onPress: () => void pinSaved(item.id, !item.pinned),
      },
      { text: t('saved.remove'), style: 'destructive', onPress: () => void removeSaved(item.id) },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  const Row = ({ item }: { item: SavedDestination }) => {
    const Mark = MARK[item.kind] ?? MapPin;
    return (
      <Touch
        accessibilityRole="button"
        accessibilityLabel={item.name}
        accessibilityHint={t('places.useAgain')}
        onPress={() => {
          Feedback.tick();
          void useSaved(item);
          onPicked();
        }}
        onLongPress={() => {
          Feedback.tick();
          options(item);
        }}
        scaleTo={0.985}
        style={({ pressed }) => [
          styles.row,
          { flexDirection: row(), backgroundColor: pressed ? s.sunk : 'transparent' },
        ]}
      >
        <View style={[styles.mark, { backgroundColor: s.sunk }]}>
          <Mark size={icon.md} strokeWidth={icon.stroke} color={s.inkMuted} />
        </View>

        <View style={styles.text}>
          <Txt variant="labelStrong" numberOfLines={1}>
            {item.name}
          </Txt>
          <Txt variant="caption" tone="muted" nums>
            {t('approach.preview', { distance: formatDistance(item.radiusM) })}
          </Txt>
        </View>

        <Touch
          accessibilityRole="button"
          accessibilityState={{ selected: !!item.pinned }}
          accessibilityLabel={item.pinned ? t('saved.unpin') : t('saved.pin')}
          hitSlop={hitSlop}
          onPress={() => {
            Feedback.tick();
            void pinSaved(item.id, !item.pinned);
          }}
        >
          <Star
            size={icon.md}
            strokeWidth={icon.stroke}
            color={item.pinned ? s.primary.text : s.inkFaint}
            fill={item.pinned ? s.primary.text : 'transparent'}
          />
        </Touch>
      </Touch>
    );
  };

  return (
    <View style={[styles.screen, { backgroundColor: s.bg }]}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.head}>
          <Txt variant="title">{t('places.title')}</Txt>
        </View>

        {saved.length === 0 ? (
          <View style={styles.empty}>
            <View style={[styles.emptyMark, { backgroundColor: s.sunk }]}>
              <Star size={30} strokeWidth={1.8} color={s.inkFaint} />
            </View>
            <Txt variant="heading" style={styles.centre}>
              {t('places.empty')}
            </Txt>
            <Txt variant="body" tone="muted" style={styles.centre}>
              {t('places.emptyBody')}
            </Txt>
            <GhostButton label={t('places.goToMap')} onPress={onPicked} style={styles.emptyCta} />
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.body}
            showsVerticalScrollIndicator={false}
          >
            {pinned.length > 0 ? (
              <View style={styles.group}>
                <Txt variant="captionStrong" tone="muted" style={styles.groupTitle}>
                  {t('saved.pinned')}
                </Txt>
                <View style={[styles.list, { backgroundColor: s.surface }]}>
                  {pinned.map((item) => (
                    <Row key={item.id} item={item} />
                  ))}
                </View>
              </View>
            ) : null}

            {rest.length > 0 ? (
              <View style={styles.group}>
                <Txt variant="captionStrong" tone="muted" style={styles.groupTitle}>
                  {t('places.recent')}
                </Txt>
                <View style={[styles.list, { backgroundColor: s.surface }]}>
                  {rest.map((item) => (
                    <Row key={item.id} item={item} />
                  ))}
                </View>
              </View>
            ) : null}
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1 },
  head: { paddingHorizontal: space.screen, paddingVertical: space.lg },
  scroll: { flex: 1 },
  body: { paddingHorizontal: space.screen, paddingBottom: space.huge, gap: space.xxl },
  group: { gap: space.sm },
  groupTitle: { paddingHorizontal: space.xs },
  list: { borderRadius: radius.card, overflow: 'hidden' },
  row: {
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    minHeight: 62,
  },
  mark: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flexGrow: 1, flexShrink: 1, gap: 1 },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
    paddingHorizontal: space.xxxl,
  },
  emptyMark: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.sm,
  },
  centre: { textAlign: 'center' },
  emptyCta: { marginTop: space.md },
});
