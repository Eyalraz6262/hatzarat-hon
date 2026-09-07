import { StyleSheet, View } from 'react-native';

import { RADIUS_PRESETS } from '../../constants/config';
import { t } from '../../i18n';
import { Feedback } from '../../services/feedback/Haptics';
import { HIT, radius as shape, space, useTheme } from '../../theme';
import { formatDistance } from '../../utils/geo';
import { Touch, Txt, row } from '../ui';

/**
 * How early to wake up.
 *
 * Presets and nothing else. A slider would let someone choose 437 metres,
 * which is a precision the GPS does not have and the passenger does not want,
 * and asking a tired person on a moving bus to drag a handle to a value is
 * exactly the interaction this app exists to avoid. Four taps, four answers.
 *
 * The values are distances rather than stops on purpose: the alarm fires on a
 * geofence radius, and labelling the control in stops while the alarm counts
 * metres would be a promise the mechanism cannot keep on a route where the
 * stop list is missing.
 */
export function RangePicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (radiusM: number) => void;
}) {
  const s = useTheme();

  return (
    <View style={styles.wrap}>
      <Txt variant="label" tone="muted">
        {t('route.wakeRange')}
      </Txt>

      <View
        style={[styles.group, { flexDirection: row() }]}
        accessibilityRole="radiogroup"
        accessibilityLabel={t('route.wakeRange')}
      >
        {RADIUS_PRESETS.map((preset) => {
          const on = preset === value;
          return (
            <Touch
              key={preset}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityLabel={formatDistance(preset)}
              onPress={() => {
                if (on) return;
                Feedback.tick();
                onChange(preset);
              }}
              style={[
                styles.option,
                {
                  backgroundColor: on ? s.accent.base : s.sunk,
                  borderColor: on ? s.accent.base : 'transparent',
                },
              ]}
            >
              <Txt variant="labelStrong" tone={on ? 'onAccent' : 'muted'} nums style={styles.label}>
                {formatDistance(preset)}
              </Txt>
            </Touch>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: space.md,
  },
  group: {
    gap: space.sm,
  },
  option: {
    flex: 1,
    minHeight: HIT,
    borderRadius: shape.control,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.sm,
  },
  label: {
    textAlign: 'center',
  },
});
