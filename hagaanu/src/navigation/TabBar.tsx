import RotateCcw from 'lucide-react-native/icons/rotate-ccw';
import House from 'lucide-react-native/icons/house';
import Star from 'lucide-react-native/icons/star';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { t } from '../i18n';
import { Feedback } from '../services/feedback/Haptics';
import { icon, space, useTheme } from '../theme';
import { Touch, Txt, row } from '../components/ui';

export type Tab = 'home' | 'saved' | 'trips';

/**
 * Three destinations: where you are going, what you keep, and where you went.
 *
 * Settings used to hold the third slot and no longer does. A tab is for a
 * place you return to; preferences are a place you visit twice and then never
 * again, and they now sit behind a control in the home header — which is also
 * what freed the slot for trip history, something a commuter opens far more
 * often than they change a notification tone.
 *
 * The bar is hidden entirely while the alarm is armed. At that point the app
 * has one job and one control, and offering to wander into settings while
 * someone is trying to fall asleep is offering the wrong thing.
 */
const TABS: { id: Tab; label: string; Icon: typeof House }[] = [
  { id: 'home', label: 'tabs.home', Icon: House },
  { id: 'saved', label: 'tabs.saved', Icon: Star },
  { id: 'trips', label: 'tabs.trips', Icon: RotateCcw },
];

export function TabBar({ active, onChange }: { active: Tab; onChange: (tab: Tab) => void }) {
  const s = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: s.surface,
          borderTopColor: s.line,
          paddingBottom: Math.max(insets.bottom, space.sm),
          flexDirection: row(),
        },
      ]}
    >
      {TABS.map(({ id, label, Icon }) => {
        const on = id === active;
        return (
          <Touch
            key={id}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={t(label as 'tabs.home')}
            onPress={() => {
              if (on) return;
              Feedback.tick();
              onChange(id);
            }}
            scaleTo={0.94}
            fill
            style={styles.tab}
          >
            <Icon
              size={icon.lg}
              strokeWidth={on ? 2.4 : 2}
              color={on ? s.primary.text : s.inkMuted}
            />
            <Txt variant="caption" tone={on ? 'primary' : 'muted'} style={styles.label}>
              {t(label as 'tabs.home')}
            </Txt>
          </Touch>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: space.sm,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: space.xs,
    minHeight: 48,
  },
  label: { textAlign: 'center' },
});
