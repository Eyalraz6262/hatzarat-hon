import BellRing from 'lucide-react-native/icons/bell-ring';
import Check from 'lucide-react-native/icons/check';
import MapPin from 'lucide-react-native/icons/map-pin';
import Moon from 'lucide-react-native/icons/moon';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { t } from '../i18n';
import { GhostButton, PrimaryButton, Txt, row } from '../components/ui';
import { usePermissionsStore } from '../state/usePermissionsStore';
import { icon, radius, space, useTheme } from '../theme';
import type { PermissionState } from '../types';

/**
 * Permission priming.
 *
 * Asked one at a time, in the order the OS will accept them, each with the
 * reason stated before the system dialog appears. Nothing is requested on
 * mount: every dialog here is behind a button the user pressed after reading
 * what it is for.
 *
 * The background step is the one that matters and the one users decline, so
 * it says plainly what is lost by declining rather than insisting. Declining
 * it is a supported way to use the app, not a dead end.
 */
export function PermissionsScreen({ onSkipBackground }: { onSkipBackground: () => void }) {
  const s = useTheme();

  const snapshot = usePermissionsStore((state) => state.snapshot);
  const requestForeground = usePermissionsStore((state) => state.requestForeground);
  const requestBackground = usePermissionsStore((state) => state.requestBackground);
  const requestNotifications = usePermissionsStore((state) => state.requestNotifications);

  // One ask on screen at a time. Foreground first because the OS will not
  // even show the background dialog before it is granted.
  const step =
    snapshot.foregroundLocation !== 'granted'
      ? 'foreground'
      : snapshot.notifications !== 'granted'
        ? 'notifications'
        : 'background';

  const blocked =
    (step === 'foreground' && snapshot.foregroundLocation === 'blocked') ||
    (step === 'notifications' && snapshot.notifications === 'blocked') ||
    (step === 'background' && snapshot.backgroundLocation === 'blocked');

  const stepIndex = step === 'foreground' ? 1 : step === 'notifications' ? 2 : 3;

  return (
    <View style={[styles.screen, { backgroundColor: s.bg }]}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.head}>
            <Txt variant="caption" tone="muted" nums>
              {t('permissions.stepOf', { current: stepIndex, total: 3 })}
            </Txt>
            <Txt variant="title">{t('permissions.title')}</Txt>
            <Txt variant="body" tone="muted">
              {t('permissions.intro')}
            </Txt>
          </View>

          <View style={styles.list}>
            <Ask
              mark={MapPin}
              title={t('permissions.locationTitle')}
              body={t('permissions.locationBody')}
              state={snapshot.foregroundLocation}
              active={step === 'foreground'}
            />
            <Ask
              mark={BellRing}
              title={t('permissions.notificationsTitle')}
              body={t('permissions.notificationsBody')}
              state={snapshot.notifications}
              active={step === 'notifications'}
            />
            <Ask
              mark={Moon}
              title={t('permissions.backgroundTitle')}
              body={t('permissions.backgroundBody')}
              state={snapshot.backgroundLocation}
              active={step === 'background'}
            />
          </View>

          {blocked ? (
            <View style={[styles.blocked, { backgroundColor: s.sunk }]}>
              <Txt variant="labelStrong">{t('permissions.blockedTitle')}</Txt>
              <Txt variant="caption" tone="muted">
                {t('permissions.blockedBody')}
              </Txt>
            </View>
          ) : null}
        </ScrollView>

        <View style={[styles.dock, { borderTopColor: s.line }]}>
          {blocked ? (
            <PrimaryButton
              label={t('common.openSettings')}
              onPress={() => void Linking.openSettings()}
            />
          ) : step === 'foreground' ? (
            <PrimaryButton
              label={t('permissions.locationAction')}
              onPress={() => void requestForeground()}
            />
          ) : step === 'notifications' ? (
            <PrimaryButton
              label={t('permissions.notificationsAction')}
              onPress={() => void requestNotifications()}
            />
          ) : (
            <>
              <PrimaryButton
                label={t('permissions.backgroundAction')}
                onPress={() => void requestBackground()}
              />
              <GhostButton label={t('common.notNow')} onPress={onSkipBackground} />
            </>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

function Ask({
  mark: Mark,
  title,
  body,
  state,
  active,
}: {
  mark: typeof MapPin;
  title: string;
  body: string;
  state: PermissionState;
  active: boolean;
}) {
  const s = useTheme();
  const done = state === 'granted';

  return (
    <View
      style={[
        styles.ask,
        {
          backgroundColor: active ? s.surface : 'transparent',
          borderColor: active ? s.accent.base : s.line,
          flexDirection: row(),
          // A step neither done nor current is context, not an instruction.
          opacity: active || done ? 1 : 0.55,
        },
      ]}
    >
      <View
        style={[
          styles.askMark,
          { backgroundColor: done ? s.accent.base : s.sunk },
        ]}
      >
        {done ? (
          <Check size={icon.md} strokeWidth={2.4} color={s.accent.on} />
        ) : (
          <Mark size={icon.md} strokeWidth={icon.stroke} color={s.inkMuted} />
        )}
      </View>

      <View style={styles.askText}>
        <View style={[styles.askHead, { flexDirection: row() }]}>
          <Txt variant="labelStrong" style={styles.askTitle}>
            {title}
          </Txt>
          {done ? (
            <Txt variant="caption" tone="accent">
              {t('permissions.granted')}
            </Txt>
          ) : null}
        </View>
        {active || !done ? (
          <Txt variant="caption" tone="muted">
            {body}
          </Txt>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  body: {
    padding: space.screen,
    gap: space.xxxl,
  },
  head: {
    gap: space.md,
    paddingTop: space.xl,
  },
  list: {
    gap: space.md,
  },
  ask: {
    gap: space.lg,
    padding: space.lg,
    borderRadius: radius.card,
    borderWidth: 1.5,
  },
  askMark: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  askText: {
    flex: 1,
    gap: space.xs,
  },
  askHead: {
    alignItems: 'center',
    gap: space.sm,
  },
  askTitle: {
    flexShrink: 1,
    flexGrow: 1,
  },
  blocked: {
    gap: space.sm,
    padding: space.lg,
    borderRadius: radius.control,
  },
  dock: {
    paddingHorizontal: space.screen,
    paddingTop: space.lg,
    paddingBottom: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: space.md,
  },
});
