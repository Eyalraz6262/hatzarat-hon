import { useMemo } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { t, type TranslationKey } from '../i18n';
import { PermissionsService } from '../services/permissions/PermissionsService';
import { usePermissionsStore } from '../state/usePermissionsStore';
import { MAX_DISPLAY_SCALE, spacing, type, useTheme } from '../theme';
import type { PermissionState, PermissionsSnapshot } from '../types';
import { Crescent } from '../components/icons';
import { GhostButton, SignalButton, align, row } from '../components/ui';

type Step = {
  id: 'foreground' | 'notifications' | 'background';
  titleKey: TranslationKey;
  bodyKeys: TranslationKey[];
  ctaKey: TranslationKey;
  state: PermissionState;
  request: () => Promise<void>;
};

type Props = {
  /**
   * Lets the user move on without background location. Foreground location and
   * notifications are hard requirements — without them the app cannot do its
   * one job at all — but background access is degradable: the alarm still fires
   * while the app is open, and the map screen warns about the limitation.
   */
  onSkipBackground: () => void;
};

/**
 * The permission primer, set as a platform indicator board.
 *
 * Each OS dialog gets its own screen explaining why first, in the user's terms
 * ("so we can wake you before your stop") rather than the OS's ("allow access
 * to your location"). Not politeness: background location is a one-shot prompt
 * on both platforms, and a reflexive deny is expensive to recover from.
 */
export function PermissionsScreen({ onSkipBackground }: Props) {
  const theme = useTheme();
  const w = theme.world;
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
    <View style={[styles.screen, { backgroundColor: w.bg }]}>
      {/* The signage rule that heads every ink screen. */}
      <View style={[styles.rule, { backgroundColor: theme.accent.base }]} />

      {/* Platform-edge ruler down the trailing margin. */}
      <View style={styles.ruler} pointerEvents="none">
        {Array.from({ length: 7 }, (_, i) => (
          <View key={i} style={[styles.rulerTick, { backgroundColor: w.divider }]} />
        ))}
      </View>

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/*
          Scrolls rather than clips: at a large system font scale this screen's
          two paragraphs plus the instruction strip exceed the viewport, and a
          permission ask the user cannot read to the end of is a dead end.
          `flexGrow: 1` keeps it optically centred at normal sizes.
        */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Step counter, set like a platform indicator. */}
          <View style={[styles.counter, { flexDirection: row() }]}>
            <Text style={[styles.counterCurrent, { color: theme.accent.base }]}>{pad(index + 1)}</Text>
            <View style={[styles.counterDash, { backgroundColor: w.divider }]} />
            <Text style={[styles.counterTotal, { color: w.textMuted }]}>{pad(steps.length)}</Text>
            <Text style={[styles.counterPlate, { color: w.textMuted }]}>{t('plate.permissions')}</Text>
          </View>

          <Crescent size={76} color={theme.accent.base} nodeColor={w.bg} />

          <View style={styles.copy}>
            <Text
              style={[styles.title, { color: w.textPrimary, textAlign: align() }]}
              maxFontSizeMultiplier={MAX_DISPLAY_SCALE}
            >
              {blocked ? t('permissions.blockedTitle') : t(current.titleKey)}
            </Text>

            {blocked ? (
              <Text style={[styles.body, { color: w.textSecondary, textAlign: align() }]}>
                {t('permissions.blockedBody')}
              </Text>
            ) : (
              current.bodyKeys.map((key, position) =>
                // The last line of a multi-line ask is the operative instruction
                // ("choose Always") — promoted onto a strip so it cannot be
                // skimmed past on the way to the button.
                position > 0 ? (
                  <View
                    key={key}
                    style={[
                      styles.instruction,
                      { backgroundColor: w.raised, borderStartColor: theme.accent.base, flexDirection: row() },
                    ]}
                  >
                    <Text style={[styles.instructionMark, { color: theme.accent.base }]}>!</Text>
                    <Text style={[styles.instructionText, { color: w.textPrimary, textAlign: align() }]}>
                      {t(key)}
                    </Text>
                  </View>
                ) : (
                  <Text key={key} style={[styles.body, { color: w.textSecondary, textAlign: align() }]}>
                    {t(key)}
                  </Text>
                )
              )
            )}
          </View>
        </ScrollView>

        <View style={styles.actions}>
          {blocked ? (
            <SignalButton
              label={t('common.openSettings')}
              onPress={() => PermissionsService.openSystemSettings()}
            />
          ) : (
            <SignalButton label={t(current.ctaKey)} onPress={() => void current.request()} />
          )}

          {current.id === 'background' ? (
            <GhostButton label={t('common.notNow')} surface={w} onPress={onSkipBackground} />
          ) : (
            <View style={[styles.slogan, { flexDirection: row() }]}>
              <View style={[styles.sloganDot, { backgroundColor: theme.accent.base }]} />
              <Text style={[styles.sloganText, { color: w.textMuted }]}>{t('brand.slogan')}</Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const pad = (n: number) => String(n).padStart(2, '0');

function buildSteps(
  snapshot: PermissionsSnapshot,
  actions: {
    requestForeground: () => Promise<void>;
    requestBackground: () => Promise<void>;
    requestNotifications: () => Promise<void>;
  }
): Step[] {
  // The platform-specific line names the exact option to tap, because
  // "Always" / "Allow all the time" is buried among more obvious choices.
  const backgroundPlatformBody: TranslationKey =
    Platform.OS === 'ios' ? 'permissions.backgroundBodyIOS' : 'permissions.backgroundBodyAndroid';

  return [
    {
      id: 'foreground',
      titleKey: 'permissions.locationTitle',
      bodyKeys: ['permissions.locationBody'],
      ctaKey: 'permissions.locationCta',
      state: snapshot.foregroundLocation,
      request: actions.requestForeground,
    },
    {
      id: 'notifications',
      titleKey: 'permissions.notificationsTitle',
      bodyKeys: ['permissions.notificationsBody'],
      ctaKey: 'permissions.notificationsCta',
      state: snapshot.notifications,
      request: actions.requestNotifications,
    },
    {
      id: 'background',
      titleKey: 'permissions.backgroundTitle',
      bodyKeys: ['permissions.backgroundBody', backgroundPlatformBody],
      ctaKey: 'permissions.backgroundCta',
      state: snapshot.backgroundLocation,
      request: actions.requestBackground,
    },
  ];
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  rule: {
    position: 'absolute',
    top: 0,
    start: 0,
    end: 0,
    height: 4,
  },
  ruler: {
    position: 'absolute',
    top: 140,
    end: 0,
    width: 12,
    height: 420,
    justifyContent: 'space-between',
  },
  rulerTick: {
    height: 1,
  },
  safe: {
    flex: 1,
    paddingHorizontal: 28,
    paddingBottom: spacing.xl,
    justifyContent: 'space-between',
  },
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    gap: spacing.xxl,
    paddingVertical: spacing.xl,
  },
  counter: {
    alignItems: 'center',
    gap: spacing.md,
  },
  counterCurrent: {
    ...type.labelStrong,
    letterSpacing: 1.4,
  },
  counterDash: {
    width: 26,
    height: 1,
  },
  counterTotal: {
    ...type.label,
    letterSpacing: 1.4,
  },
  counterPlate: {
    ...type.label,
  },
  copy: {
    gap: 16,
  },
  title: {
    ...type.display,
  },
  body: {
    ...type.body,
  },
  instruction: {
    gap: spacing.md,
    alignItems: 'flex-start',
    borderStartWidth: 3,
    padding: spacing.lg,
  },
  instructionMark: {
    ...type.labelStrong,
    paddingTop: 4,
  },
  instructionText: {
    flex: 1,
    ...type.bodySmall,
  },
  actions: {
    gap: spacing.md,
  },
  slogan: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
  },
  sloganDot: {
    width: 5,
    height: 5,
  },
  sloganText: {
    ...type.labelHeSmall,
  },
});
