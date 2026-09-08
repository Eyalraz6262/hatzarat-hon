import Map from 'lucide-react-native/icons/map';
import Settings from 'lucide-react-native/icons/settings';
import Star from 'lucide-react-native/icons/star';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { t } from '../i18n';
import { Feedback } from '../services/feedback/Haptics';
import { icon, space, useTheme } from '../theme';
import { Touch, Txt, row } from '../components/ui';

export type Tab = 'map' | 'places' | 'settings';

/**
 * Three destinations, and there are only three things in this app.
 *
 * The suite's own rule says a settings tab belongs behind a profile, and that
 * rule exists for apps with a richer structure where settings would waste one
 * of five slots. Here there is no profile and no fifth thing: the map, the
 * places you keep, and the preferences. Hiding the third behind a gear on the
 * first would make the bar two items wide, which is not a tab bar.
 *
 * The bar is hidden entirely while the alarm is armed. At that point the app
 * has one job and one control, and offering to wander into settings while
 * someone is trying to fall asleep is offering the wrong thing.
 */
const TABS: { id: Tab; label: string; Icon: typeof Map }[] = [
  { id: 'map', label: 'tabs.map', Icon: Map },
  { id: 'places', label: 'tabs.places', Icon: Star },
  { id: 'settings', label: 'tabs.settings', Icon: Settings },
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
            accessibilityLabel={t(label as 'tabs.map')}
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
              {t(label as 'tabs.map')}
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
