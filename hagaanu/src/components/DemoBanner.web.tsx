import Info from 'lucide-react-native/icons/info';
import { StyleSheet, View } from 'react-native';

import { t } from '../i18n';
import { icon, radius, space, useTheme } from '../theme';
import { Txt, row } from './ui';

/**
 * What this build is, said once, where it cannot be missed.
 *
 * The web demo runs the app's real screens and real detection rules, but a
 * browser cannot register an OS geofence and cannot wake a closed tab — which
 * is the entire premise of the product. Letting a reader believe otherwise
 * would be worse than not shipping the demo at all, so the banner says it
 * plainly and stays on screen rather than appearing once and being dismissed.
 */
export function DemoBanner() {
  const s = useTheme();
  return (
    <View style={[styles.wrap, { backgroundColor: s.sunk, borderColor: s.line, flexDirection: row() }]}>
      <Info size={icon.sm} strokeWidth={icon.stroke} color={s.inkMuted} style={styles.icon} />
      <View style={styles.text}>
        <Txt variant="captionStrong">{t('web.banner')}</Txt>
        <Txt variant="caption" tone="muted" style={styles.body}>
          {t('web.bannerBody')}
        </Txt>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radius.control,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    gap: space.md,
    alignItems: 'flex-start',
  },
  icon: { marginTop: 2 },
  text: { flexShrink: 1, flexGrow: 1 },
  body: { marginTop: 2 },
});
