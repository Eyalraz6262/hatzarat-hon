import Info from 'lucide-react-native/icons/info';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { t } from '../i18n';
import { icon, radius, space, useTheme } from '../theme';
import { Touch, Txt, row } from './ui';

/**
 * What this build is.
 *
 * A browser cannot register an OS geofence and cannot wake a closed tab, which
 * is the entire premise of the product, so this has to be said and has to stay
 * said — it is never dismissible. But it is a footnote, not the content: it
 * collapses to one line and opens on a tap, because a paragraph of caveat at
 * the top of the sheet was bigger than the app underneath it.
 */
export function DemoBanner() {
  const s = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <Touch
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      accessibilityLabel={t('web.banner')}
      onPress={() => setOpen((v) => !v)}
      style={[styles.wrap, { backgroundColor: s.sunk, flexDirection: row() }]}
    >
      <Info size={icon.sm} strokeWidth={icon.stroke} color={s.inkMuted} style={styles.icon} />
      <View style={styles.text}>
        <Txt variant="captionStrong" tone="muted">
          {t('web.banner')}
        </Txt>
        {open ? (
          <Txt variant="caption" tone="muted" style={styles.body}>
            {t('web.bannerBody')}
          </Txt>
        ) : null}
      </View>
    </Touch>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radius.pill,
    paddingVertical: space.sm,
    paddingHorizontal: space.lg,
    gap: space.sm,
    alignItems: 'flex-start',
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  icon: { marginTop: 1 },
  text: { flexShrink: 1 },
  body: { marginTop: space.xs },
});
