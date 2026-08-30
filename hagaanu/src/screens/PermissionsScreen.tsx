import { useMemo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import { t, type TranslationKey } from '../i18n';
import { PermissionsService } from '../services/permissions/PermissionsService';
import { usePermissionsStore } from '../state/usePermissionsStore';
import { colors, radii, spacing, typography } from '../theme';
import type { PermissionState, PermissionsSnapshot } from '../types';
import { PrimaryButton, SecondaryButton } from '../components/ui';

type Props = {
  /**
   * Lets the user move on without background location. Foreground location and
   * notifications are hard requirements — without them the app cannot do its one
   * job at all — but background access is degradable: the alarm still fires while
   * the app is open, and the home screen warns about the limitation.
   */
  onSkipBackground: () => void;
};

type Step = {
  id: 'foreground' | 'background' | 'notifications';
  icon: keyof typeof Ionicons.glyphMap;
  titleKey: TranslationKey;
  bodyKeys: TranslationKey[];
  ctaKey: TranslationKey;
  state: PermissionState;
  request: () => Promise<void>;
};

/**
 * The permission primer.
 *
 * Each OS dialog gets its own screen explaining *why* first, in the user's terms
 * ("so we can wake you before your stop") rather than the OS's ("allow access to
 * your location"). This is not just politeness: background location is a one-shot
 * prompt on both platforms — a reflexive "deny" is expensive to recover from, so
 * it is worth a screen to make the ask land.
 */
export function PermissionsScreen({ onSkipBackground }: Props) {
  const snapshot = usePermissionsStore((state) => state.snapshot);
  const requestForeground = usePermissionsStore((state) => state.requestForeground);
  const requestBackground = usePermissionsStore((state) => state.requestBackground);
  const requestNotifications = usePermissionsStore((state) => state.requestNotifications);

  const steps = useMemo<Step[]>(
    () => buildSteps(snapshot, { requestForeground, requestBackground, requestNotifications }),
    [snapshot, requestForeground, requestBackground, requestNotifications]
  );

  const current = steps.find((step) => step.state !== 'granted');
  if (!current) return null;

  const index = steps.indexOf(current);
  const blocked = current.state === 'blocked';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Ionicons name={current.icon} size={34} color={colors.accent} />
        </View>

        <Text style={styles.step}>
          {t('permissions.stepOf', { current: index + 1, total: steps.length })}
        </Text>

        <Text style={styles.title}>
          {blocked ? t('permissions.blockedTitle') : t(current.titleKey)}
        </Text>

        {blocked ? (
          <Text style={styles.body}>{t('permissions.blockedBody')}</Text>
        ) : (
          current.bodyKeys.map((key) => (
            <Text key={key} style={styles.body}>
              {t(key)}
            </Text>
          ))
        )}
      </View>

      <View style={styles.actions}>
        {blocked ? (
          <PrimaryButton
            label={t('common.openSettings')}
            onPress={() => PermissionsService.openSystemSettings()}
          />
        ) : (
          <PrimaryButton label={t(current.ctaKey)} onPress={() => void current.request()} />
        )}
        {current.id === 'background' ? (
          <SecondaryButton label={t('common.notNow')} onPress={onSkipBackground} />
        ) : (
          <Text style={styles.slogan}>{t('brand.slogan')}</Text>
        )}
      </View>
    </SafeAreaView>
  );
}

function buildSteps(
  snapshot: PermissionsSnapshot,
  actions: {
    requestForeground: () => Promise<void>;
    requestBackground: () => Promise<void>;
    requestNotifications: () => Promise<void>;
  }
): Step[] {
  // The platform-specific line tells the user which exact option to tap, because
  // "Always" / "Allow all the time" is buried among more obvious choices.
  const backgroundPlatformBody: TranslationKey =
    Platform.OS === 'ios' ? 'permissions.backgroundBodyIOS' : 'permissions.backgroundBodyAndroid';

  return [
    {
      id: 'foreground',
      icon: 'navigate-circle-outline',
      titleKey: 'permissions.locationTitle',
      bodyKeys: ['permissions.locationBody'],
      ctaKey: 'permissions.locationCta',
      state: snapshot.foregroundLocation,
      request: actions.requestForeground,
    },
    {
      id: 'notifications',
      icon: 'notifications-outline',
      titleKey: 'permissions.notificationsTitle',
      bodyKeys: ['permissions.notificationsBody'],
      ctaKey: 'permissions.notificationsCta',
      state: snapshot.notifications,
      request: actions.requestNotifications,
    },
    {
      id: 'background',
      icon: 'moon-outline',
      titleKey: 'permissions.backgroundTitle',
      bodyKeys: ['permissions.backgroundBody', backgroundPlatformBody],
      ctaKey: 'permissions.backgroundCta',
      state: snapshot.backgroundLocation,
      request: actions.requestBackground,
    },
  ];
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: spacing.xl,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.md,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: radii.lg,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  step: {
    ...typography.caption,
    color: colors.textFaint,
    textAlign: 'center',
  },
  title: {
    ...typography.display,
    fontSize: 28,
    color: colors.text,
    textAlign: 'center',
  },
  body: {
    ...typography.body,
    fontSize: 16,
    lineHeight: 24,
    color: colors.textMuted,
    textAlign: 'center',
  },
  actions: {
    gap: spacing.lg,
  },
  slogan: {
    ...typography.caption,
    color: colors.textFaint,
    textAlign: 'center',
  },
});
