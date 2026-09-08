import Bus from 'lucide-react-native/icons/bus';
import GraduationCap from 'lucide-react-native/icons/graduation-cap';
import MapPin from 'lucide-react-native/icons/map-pin';
import Plane from 'lucide-react-native/icons/plane';
import ShoppingBag from 'lucide-react-native/icons/shopping-bag';
import Stethoscope from 'lucide-react-native/icons/stethoscope';
import TrainFront from 'lucide-react-native/icons/train-front';
import Trophy from 'lucide-react-native/icons/trophy';
import { StyleSheet, View } from 'react-native';

import { t } from '../../i18n';
import { Feedback } from '../../services/feedback/Haptics';
import type { PlaceKind } from '../../services/places/catalog';
import { labelFor, type PlaceHit } from '../../services/places/match';
import { HIT, icon, radius, space, useTheme } from '../../theme';
import type { Destination } from '../../types';
import { formatDistance } from '../../utils/geo';
import { Txt, Touch, row } from '../ui';

/**
 * Where you could go from here.
 *
 * The map screen's sheet used to hold a heading, one line of encouragement and
 * a button — three lines of furniture over a third of the screen, on the screen
 * the whole app is for. This is what goes there instead: the places around you
 * that people name as a destination, nearest first, one tap from armed.
 *
 * It is also the answer to the cold start. Somebody opening this for the first
 * time has no history to show them, and "בחרו יעד" is not an answer — a list of
 * real places a kilometre away is.
 */

const KIND_ICON: Record<PlaceKind, typeof MapPin> = {
  train: TrainFront,
  bus: Bus,
  stadium: Trophy,
  airport: Plane,
  campus: GraduationCap,
  hospital: Stethoscope,
  mall: ShoppingBag,
};

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
      <Txt variant="caption" tone="faint" style={styles.section}>
        {t('home.nearbyTitle')}
      </Txt>

      <View style={[styles.list, { backgroundColor: s.surface, borderColor: s.line }]}>
        {places.map((hit, index) => {
          const Icon = KIND_ICON[hit.place.kind];
          const label = labelFor(hit.place);
          return (
            <Touch
              key={`${label}-${index}`}
              accessibilityRole="button"
              accessibilityLabel={label}
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
              <View style={[styles.badge, { backgroundColor: s.sunk }]}>
                <Icon size={icon.sm} strokeWidth={icon.stroke} color={s.inkMuted} />
              </View>
              <Txt variant="label" numberOfLines={1} style={styles.name}>
                {hit.place.name}
              </Txt>
              {hit.distanceM !== null ? (
                <Txt variant="caption" tone="faint" nums>
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
  wrap: { gap: space.sm },
  section: {
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    paddingHorizontal: space.xs,
  },
  list: {
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  rowItem: {
    minHeight: HIT,
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  badge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { flex: 1 },
});
