import AlarmClock from 'lucide-react-native/icons/alarm-clock';
import Bus from 'lucide-react-native/icons/bus';
import TrainFront from 'lucide-react-native/icons/train-front';
import TramFront from 'lucide-react-native/icons/tram-front';
import { StyleSheet, View } from 'react-native';

import { t } from '../../i18n';
import type { StopsResult } from '../../services/transit/StopsService';
import { icon, radius, space, useTheme } from '../../theme';
import { formatDistance } from '../../utils/geo';
import { Skeleton, Touch, Txt, row } from '../ui';
import type { Rail, RailItem } from './rail';

/**
 * The route rail.
 *
 * This is the app's one bold move, and everything else on the screen is quiet
 * so that it can be. It answers a question a map cannot: not "how far", but
 * "how many more stops", which is the unit a passenger actually thinks in.
 *
 * Reading it top to bottom is reading the journey in the direction it is
 * travelled. The accent runs from the top down to where the passenger is and
 * stops there, so the coloured length IS the progress bar; there is no
 * separate meter because the rail already is one.
 */

const TRACK_W = 22;
const LINE_W = 2;

type Props = {
  rail: Rail;
  /**
   * Turns the stops into buttons that set a change of vehicle.
   *
   * Absent on the armed screen, where the journey is settled and a tappable
   * stop would only invite someone to change it by accident.
   */
  onPickStop?: (name: string) => void;
  /** Present when the stop list could not be built. The rail says so rather than pretending. */
  fallback: Extract<StopsResult, { ok: false }>['reason'] | null;
  loading: boolean;
};

export function RouteRail({ rail, fallback, loading, onPickStop }: Props) {
  const s = useTheme();

  if (loading) {
    return (
      <View style={styles.wrap} accessibilityLabel={t('rail.loading')}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={[styles.line, { flexDirection: row() }]}>
            <View style={styles.track}>
              <View style={[styles.rail, { backgroundColor: s.line }]} />
              <View style={[styles.node, styles.nodeSmall, { backgroundColor: s.line }]} />
            </View>
            <View style={styles.body}>
              <Skeleton width={i % 2 === 0 ? '58%' : '42%'} height={16} />
            </View>
          </View>
        ))}
      </View>
    );
  }

  // The accent runs from the top of the rail down to the passenger. Anything
  // below "here" is track not yet travelled.
  const hereIndex = rail.items.findIndex((item) => item.kind === 'here');

  return (
    <View style={styles.wrap}>
      {rail.items.map((item, index) => (
        <RailLine
          key={item.id}
          item={item}
          first={index === 0}
          last={index === rail.items.length - 1}
          travelled={hereIndex === -1 ? false : index <= hereIndex}
          onPickStop={onPickStop}
        />
      ))}

      {fallback ? (
        <View style={[styles.fallback, { borderTopColor: s.line, flexDirection: row() }]}>
          <Txt variant="caption" tone="muted" style={styles.fallbackText}>
            {t(`rail.fallback.${fallback}`)}
          </Txt>
        </View>
      ) : null}
    </View>
  );
}

function RailLine({
  item,
  first,
  last,
  travelled,
  onPickStop,
}: {
  item: RailItem;
  first: boolean;
  last: boolean;
  travelled: boolean;
  onPickStop?: (name: string) => void;
}) {
  const s = useTheme();
  const trackColor = travelled ? s.accent.base : s.line;

  // Only a stop still ahead can become a change. Offering one already behind
  // would be an invitation to set an alarm for a place we have left.
  const pickable =
    onPickStop && item.kind === 'stop' && !item.passed
      ? () => onPickStop(item.name)
      : null;

  const Line = pickable ? Touch : View;

  return (
    <Line
      {...(pickable
        ? {
            accessibilityRole: 'button' as const,
            accessibilityLabel: item.kind === 'stop' ? item.name : undefined,
            accessibilityHint: t('route.addStop'),
            onPress: pickable,
          }
        : {})}
      style={[styles.line, { flexDirection: row() }]}
    >
      <View style={styles.track}>
        <View
          style={[
            styles.rail,
            {
              backgroundColor: trackColor,
              top: first ? '50%' : 0,
              bottom: last ? '50%' : 0,
            },
          ]}
        />
        <Node item={item} travelled={travelled} />
      </View>

      <View style={styles.body}>
        <Body item={item} />
      </View>
    </Line>
  );
}

function Node({ item, travelled }: { item: RailItem; travelled: boolean }) {
  const s = useTheme();

  if (item.kind === 'here') {
    return (
      <View style={[styles.hereHalo, { backgroundColor: s.accent.soft }]}>
        <View style={[styles.node, styles.nodeHere, { backgroundColor: s.accent.base, borderColor: s.bg }]} />
      </View>
    );
  }

  if (item.kind === 'destination') {
    return (
      <View
        style={[
          styles.node,
          styles.nodeGoal,
          { backgroundColor: s.bg, borderColor: s.accent.base },
        ]}
      />
    );
  }

  if (item.kind === 'wake') {
    return <View style={[styles.node, styles.nodeWake, { backgroundColor: s.bg, borderColor: s.accent.base }]} />;
  }

  if (item.kind === 'transfer') {
    // Drawn like the destination, because it is one — just not the last one.
    return (
      <View
        style={[styles.node, styles.nodeGoal, { backgroundColor: s.bg, borderColor: s.accent.base }]}
      />
    );
  }

  return (
    <View
      style={[
        styles.node,
        styles.nodeSmall,
        { backgroundColor: travelled || item.passed ? s.accent.base : s.lineStrong },
      ]}
    />
  );
}

function Body({ item }: { item: RailItem }) {
  const s = useTheme();

  if (item.kind === 'here') {
    return (
      <View style={[styles.bodyRow, { flexDirection: row() }]}>
        <Txt variant="labelStrong" tone="accent">
          {t('rail.here')}
        </Txt>
      </View>
    );
  }

  if (item.kind === 'wake') {
    return (
      <View
        style={[
          styles.wake,
          { borderColor: s.accent.base, backgroundColor: s.accent.soft, flexDirection: row() },
        ]}
      >
        <AlarmClock size={icon.sm} strokeWidth={icon.stroke} color={s.accent.text} />
        <Txt variant="captionStrong" tone="accent" style={styles.wakeText}>
          {t('rail.wakeHere', { distance: formatDistance(item.remainingM) })}
        </Txt>
      </View>
    );
  }

  if (item.kind === 'destination') {
    return (
      <View style={[styles.bodyRow, { flexDirection: row() }]}>
        <Txt variant="heading" numberOfLines={1} style={styles.grow}>
          {item.name}
        </Txt>
      </View>
    );
  }

  if (item.kind === 'transfer') {
    return (
      <View style={[styles.bodyRow, { flexDirection: row() }]}>
        <Txt variant="heading" numberOfLines={1} style={styles.grow}>
          {item.name}
        </Txt>
        <Txt variant="caption" tone="accent">
          {t('rail.transfer')}
        </Txt>
      </View>
    );
  }

  const Mark = item.transit === 'bus' ? Bus : item.transit === 'light-rail' ? TramFront : TrainFront;

  return (
    <View style={[styles.bodyRow, { flexDirection: row() }]}>
      <Mark
        size={icon.sm}
        strokeWidth={icon.stroke}
        color={item.passed ? s.inkFaint : s.inkMuted}
        style={styles.mark}
      />
      <Txt
        variant={item.passed ? 'label' : 'labelStrong'}
        tone={item.passed ? 'muted' : 'ink'}
        numberOfLines={1}
        style={[styles.grow, item.passed ? styles.passed : null]}
      >
        {item.name}
      </Txt>
      <Txt variant="caption" tone="muted" nums>
        {formatDistance(item.remainingM)}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'column',
  },
  line: {
    alignItems: 'stretch',
    gap: space.md,
    minHeight: 44,
  },
  track: {
    width: TRACK_W,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rail: {
    position: 'absolute',
    width: LINE_W,
    borderRadius: LINE_W,
  },
  node: {
    borderRadius: 999,
  },
  nodeSmall: {
    width: 9,
    height: 9,
  },
  nodeHere: {
    width: 14,
    height: 14,
    borderWidth: 3,
  },
  hereHalo: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeGoal: {
    width: 16,
    height: 16,
    borderWidth: 3.5,
  },
  nodeWake: {
    width: 11,
    height: 11,
    borderWidth: 2.5,
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: space.sm,
  },
  bodyRow: {
    alignItems: 'center',
    gap: space.sm,
  },
  grow: {
    flexShrink: 1,
    flexGrow: 1,
  },
  mark: {
    flexShrink: 0,
  },
  passed: {
    // Not strikethrough: a passed stop is history, not a mistake.
    opacity: 0.75,
  },
  wake: {
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.md - 2,
    paddingHorizontal: space.md,
    borderRadius: radius.control,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  wakeText: {
    flexShrink: 1,
  },
  fallback: {
    marginTop: space.md,
    paddingTop: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  fallbackText: {
    flexShrink: 1,
  },
});
