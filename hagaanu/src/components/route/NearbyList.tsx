import Bus from 'lucide-react-native/icons/bus';
import Plane from 'lucide-react-native/icons/plane';
import TrainFront from 'lucide-react-native/icons/train-front';
import { StyleSheet, View } from 'react-native';

import { t } from '../../i18n';
import { Feedback } from '../../services/feedback/Haptics';
import type { PlaceKind } from '../../services/places/catalog';
import { labelFor, type PlaceHit } from '../../services/places/match';
import { HIT, icon, space, useTheme } from '../../theme';
import type { Destination } from '../../types';
import { formatDistance } from '../../utils/geo';
import { Txt, Touch, align, row } from '../ui';

/**
 * Where a long ride ends, as a list you can read at a glance.
 *
 * Two things decide which row someone taps: the name, and how far it is. So
 * the name leads and the distance closes the row in tabular figures, aligned
 * down the column so the numbers can be compared without reading them.
 *
 * Deliberately NOT a row of tinted icon chips. A 40pt rounded square holding a
 * coloured glyph on every row is the most recognisable signature of a
 * generated app, and it spends the strongest position in the row on the least
 * useful fact. The kind is a small mark at text size beside the qualifier,
 * where it belongs: it separates a railway station from a bus terminal, which
 * is worth one glyph and not a badge.
 */

const KIND_ICON: Partial<Record<PlaceKind, typeof Bus>> = {
  train: TrainFront,
  bus: Bus,
  airport: Plane,
};

/**
 * The second line: what kind of place, and which town.
 *
 * Not the English name, which is what this fell back to for every railway
 * station — the catalog carries one for search, and printing it under the
 * Hebrew read as a string that had failed to translate. A station's own name
 * usually contains its town already ("באר שבע - צפון"), so the kind alone is
 * the line that adds something.
 */
function subtitleFor(place: PlaceHit['place']): string {
  const kind =
    place.kind === 'train' ? t('home.kindTrain')
    : place.kind === 'bus' ? t('home.kindBus')
    : place.kind === 'airport' ? t('home.kindAirport')
    : '';
  if (!place.city) return kind;
  // "התחנה המרכזית אשדוד · תחנה מרכזית" says it twice.
  return place.name.includes(place.city) ? kind : `${kind} · ${place.city}`;
}

export function NearbyList({
  places,
  onPick,
}: {
  places: PlaceHit[];
  onPick: (destination: Destination) => void;
}) {
  const s = useTheme();
  if (places.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <Txt variant="caption" tone="faint" style={[styles.section, { textAlign: align() }]}>
        {t('home.nearbyTitle')}
      </Txt>

      <View>
        {places.map((hit, index) => {
          const Mark = KIND_ICON[hit.place.kind];
          const label = labelFor(hit.place);
          return (
            <Touch
              key={`${label}-${index}`}
              accessibilityRole="button"
              accessibilityLabel={
                hit.distanceM !== null ? `${label}, ${formatDistance(hit.distanceM)}` : label
              }
              onPress={() => {
                Feedback.tick();
                onPick({ coords: hit.place.coords, label });
              }}
              style={({ pressed }) => [
                styles.rowItem,
                {
                  flexDirection: row(),
                  backgroundColor: pressed ? s.sunk : 'transparent',
                  borderTopWidth: index === 0 ? 0 : StyleSheet.hairlineWidth,
                  borderTopColor: s.line,
                },
              ]}
            >
              <View style={styles.grow}>
                <Txt variant="labelStrong" numberOfLines={1} style={{ textAlign: align() }}>
                  {hit.place.name}
                </Txt>
                <View style={[styles.meta, { flexDirection: row() }]}>
                  {Mark ? (
                    <Mark size={icon.sm} strokeWidth={icon.stroke} color={s.inkMuted} />
                  ) : null}
                  <Txt variant="caption" tone="faint" numberOfLines={1}>
                    {subtitleFor(hit.place)}
                  </Txt>
                </View>
              </View>

              {hit.distanceM !== null ? (
                <Txt variant="labelStrong" tone="muted" nums style={styles.distance}>
                  {formatDistance(hit.distanceM)}
                </Txt>
              ) : null}
            </Touch>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.xs },
  section: {
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  rowItem: {
    minHeight: HIT,
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.sm + 2,
  },
  grow: { flex: 1, gap: 1 },
  meta: { alignItems: 'center', gap: space.xs },
  // A fixed column so the figures line up down the list rather than ragging
  // against however long each name happens to be.
  distance: { minWidth: 64, textAlign: 'right' },
});
