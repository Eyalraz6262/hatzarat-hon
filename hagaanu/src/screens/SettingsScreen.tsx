import X from 'lucide-react-native/icons/x';
import Check from 'lucide-react-native/icons/check';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import Play from 'lucide-react-native/icons/play';
import Constants from 'expo-constants';
import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { Linking, Platform, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RADIUS_PRESETS } from '../constants/config';
import { LANGUAGE_NAMES, setLanguage, t, type Language } from '../i18n';
import { AlarmService } from '../services/alarm/AlarmService';
import { ALARM_SOUND_IDS, type AlarmSoundId } from '../services/audio/catalog';
import { Feedback } from '../services/feedback/Haptics';
import { LANGUAGES, type ThemeMode } from '../services/storage/settings';
import { usePermissionsStore } from '../state/usePermissionsStore';
import { useSettingsStore } from '../state/useSettingsStore';
import { HIT, hitSlop, icon, radius, space, useTheme } from '../theme';
import { formatDistance } from '../utils/geo';
import { Card, Touch, Txt, row } from '../components/ui';

/**
 * Preferences.
 *
 * The one screen in the app that is a list, and it is built as grouped rows
 * rather than a stack of cards: a settings screen is scanned, and hairlines
 * inside one surface scan faster than nine separate objects.
 *
 * Two rules that shape most of what is here:
 *
 *   Nothing is a slider. Everything is a set of named choices. The app is used
 *   one-handed on a moving vehicle, and a slider asks for precision the
 *   situation cannot give — including in settings, where the same hands are
 *   holding the same phone.
 *
 *   Nothing implies a power the app does not have. The volume control says in
 *   as many words that it is not the device volume, because it is not.
 */

const VOLUME_STEPS = [0.4, 0.6, 0.8, 1.0] as const;
const THEME_MODES: ThemeMode[] = ['system', 'light', 'dark'];

/**
 * Preferences, opened over whatever you were doing.
 *
 * It used to hold a tab, and a tab is for somewhere you return to; this is
 * somewhere you visit twice and then never again. As an overlay it needs a way
 * out of its own, which is the X — a modal without an explicit close is a
 * modal that traps anyone whose swipe does not register.
 */
export function SettingsScreen({
  onOpenDebug,
  onClose,
}: {
  onOpenDebug: () => void;
  onClose?: () => void;
}) {
  const s = useTheme();
  const permissions = usePermissionsStore((state) => state.snapshot);
  const allGranted =
    permissions.foregroundLocation === 'granted' &&
    permissions.backgroundLocation === 'granted' &&
    permissions.notifications === 'granted';
  const settings = useSettingsStore();
  const stopPreview = useRef<(() => void) | null>(null);

  // A preview must never outlive the screen. Without this, backing out mid-tone
  // leaves a player running with nothing on screen to stop it.
  useEffect(() => () => stopPreview.current?.(), []);

  const preview = useCallback(
    (soundId: AlarmSoundId) => {
      stopPreview.current?.();
      void (async () => {
        stopPreview.current = await AlarmService.preview(soundId, settings.volume);
      })();
    },
    [settings.volume]
  );

  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <View style={[styles.screen, { backgroundColor: s.bg }]}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={[styles.header, { flexDirection: row() }]}>
          <Txt variant="title" style={styles.headerTitle}>
            {t('settings.title')}
          </Txt>
          {onClose ? (
            <Touch
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
              hitSlop={hitSlop}
              onPress={onClose}
              style={[styles.close, { backgroundColor: s.sunk }]}
            >
              <X size={icon.md} strokeWidth={2.4} color={s.inkMuted} />
            </Touch>
          ) : null}
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
        >
          {/* ── the alarm ─────────────────────────────────────────── */}
          <Section title={t('settings.sectionAlarm')}>
            <Card padded={false}>
              <GroupLabel>{t('settings.sound.label')}</GroupLabel>
              {ALARM_SOUND_IDS.map((id, index) => (
                <Choice
                  key={id}
                  first={index === 0}
                  selected={settings.soundId === id}
                  title={t(`settings.sound.${id}`)}
                  note={t(`settings.sound.${id}Note`)}
                  onPress={() => {
                    Feedback.tick();
                    settings.set('soundId', id);
                    preview(id);
                  }}
                  trailing={
                    <Touch
                      accessibilityRole="button"
                      accessibilityLabel={t('settings.sound.preview')}
                      hitSlop={hitSlop}
                      onPress={() => preview(id)}
                      style={[styles.playBtn, { backgroundColor: s.sunk }]}
                    >
                      <Play size={icon.sm} strokeWidth={icon.stroke} color={s.inkMuted} />
                    </Touch>
                  }
                />
              ))}
            </Card>

            <Card padded={false}>
              <ToggleRow
                first
                label={t('settings.vibrate')}
                note={t('settings.vibrateNote')}
                value={settings.vibrate}
                onChange={(v) => settings.set('vibrate', v)}
              />
            </Card>

            <Card padded={false}>
              <GroupLabel>{t('settings.volume')}</GroupLabel>
              <Segmented
                options={VOLUME_STEPS.map((v) => ({
                  key: String(v),
                  label: `${Math.round(v * 100)}%`,
                  selected: Math.abs(settings.volume - v) < 0.01,
                  onPress: () => {
                    Feedback.tick();
                    settings.set('volume', v);
                  },
                }))}
              />
              <Note>{t('settings.volumeNote')}</Note>
            </Card>

            <Card padded={false}>
              <GroupLabel>{t('settings.defaultRadius')}</GroupLabel>
              <Segmented
                options={RADIUS_PRESETS.map((r) => ({
                  key: String(r),
                  label: formatDistance(r),
                  selected: settings.defaultRadiusM === r,
                  onPress: () => {
                    Feedback.tick();
                    settings.set('defaultRadiusM', r);
                  },
                }))}
              />
              <Note>{t('settings.defaultRadiusNote')}</Note>
            </Card>
          </Section>

          {/* ── the app ───────────────────────────────────────────── */}
          <Section title={t('settings.sectionApp')}>
            <Card padded={false}>
              <GroupLabel>{t('settings.theme')}</GroupLabel>
              <Segmented
                options={THEME_MODES.map((mode) => ({
                  key: mode,
                  label: t(
                    mode === 'system'
                      ? 'settings.themeSystem'
                      : mode === 'light'
                        ? 'settings.themeLight'
                        : 'settings.themeDark'
                  ),
                  selected: settings.theme === mode,
                  onPress: () => {
                    Feedback.tick();
                    settings.set('theme', mode);
                  },
                }))}
              />
            </Card>

            <Card padded={false}>
              <GroupLabel>{t('settings.language')}</GroupLabel>
              {LANGUAGES.map((code, index) => (
                <Choice
                  key={code}
                  first={index === 0}
                  selected={settings.language === code}
                  title={LANGUAGE_NAMES[code]}
                  onPress={() => {
                    Feedback.tick();
                    settings.set('language', code);
                    setLanguage(code as Language);
                  }}
                />
              ))}
              <Note>{t('settings.languageRestartNote')}</Note>
            </Card>

            <Card padded={false}>
              <ActionRow
                first
                label={t('settings.demo')}
                note={t('settings.demoNote')}
                onPress={() => preview(settings.soundId)}
              />
            </Card>
          </Section>

          {/* ── location ──────────────────────────────────────────── */}
          <Section title={t('settings.sectionLocation')}>
            <Card padded={false}>
              {/*
                Status, not a switch. An app cannot grant itself a permission,
                and a toggle that opens the system settings and might come back
                unchanged is a control that lies about what it does.
              */}
              <StatusRow
                first
                label={t('permissions.locationTitle')}
                granted={permissions.foregroundLocation === 'granted'}
              />
              <StatusRow
                label={t('permissions.backgroundTitle')}
                granted={permissions.backgroundLocation === 'granted'}
              />
              <StatusRow
                label={t('permissions.notificationsTitle')}
                granted={permissions.notifications === 'granted'}
              />
              {allGranted ? null : (
                <ActionRow
                  label={t('common.openSettings')}
                  onPress={() => void Linking.openSettings()}
                />
              )}
            </Card>
          </Section>

          {/* ── privacy ───────────────────────────────────────────── */}
          <Section title={t('settings.sectionPrivacy')}>
            <Card>
              <Txt variant="labelStrong">{t('settings.privacyTitle')}</Txt>
              <Txt variant="caption" tone="muted" style={styles.prose}>
                {t('settings.privacyBody')}
              </Txt>
            </Card>
          </Section>

          {/* ── help ──────────────────────────────────────────────── */}
          <Section title={t('settings.sectionHelp')}>
            <Card>
              <Txt variant="labelStrong">{t('settings.whyNotWork')}</Txt>
              <Txt variant="caption" tone="muted" style={styles.prose}>
                {t('settings.whyNotWorkBody')}
              </Txt>
            </Card>

            {Platform.OS === 'android' ? (
              <Card>
                <Txt variant="labelStrong">{t('settings.batteryTitle')}</Txt>
                <Txt variant="caption" tone="muted" style={styles.prose}>
                  {t('settings.batteryBody')}
                </Txt>
                <Touch
                  accessibilityRole="button"
                  accessibilityLabel={t('settings.batteryAction')}
                  onPress={() => void Linking.openSettings()}
                  style={[styles.linkBtn, { borderColor: s.line, flexDirection: row() }]}
                >
                  <Txt variant="captionStrong" tone="primary">
                    {t('settings.batteryAction')}
                  </Txt>
                  <ChevronRight size={icon.sm} strokeWidth={icon.stroke} color={s.primary.text} />
                </Touch>
              </Card>
            ) : null}
          </Section>

          {/*
            Development builds only. `__DEV__` is a compile-time constant under
            Metro, so the row and the screen behind it are dropped from a
            release bundle rather than merely hidden in one.
          */}
          {__DEV__ ? (
            <Section title="Development">
              <Card padded={false}>
                <ActionRow
                  first
                  label="Debug"
                  note="Monitor state, last fix, the trip journal, and a button for each detection layer."
                  onPress={onOpenDebug}
                />
              </Card>
            </Section>
          ) : null}

          <Txt variant="caption" tone="muted" style={styles.version} nums>
            {t('settings.version', { version })}
          </Txt>

          {/* Where the stop list comes from. Open data, but still someone's work. */}
          <Txt variant="caption" tone="faint" style={styles.credit}>
            {t('settings.dataCredit')}
          </Txt>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

/* ------------------------------------------------------------------ *
 * Pieces
 * ------------------------------------------------------------------ */

/**
 * A permission, as a fact.
 *
 * The check is the whole control: it says granted or it does not, and the one
 * action offered when something is missing opens the system settings, because
 * that is the only place it can be changed.
 */
function StatusRow({
  label,
  granted,
  first,
}: {
  label: string;
  granted: boolean;
  first?: boolean;
}) {
  const s = useTheme();
  return (
    <View
      style={[
        styles.rowBase,
        {
          flexDirection: row(),
          borderTopWidth: first ? 0 : StyleSheet.hairlineWidth,
          borderTopColor: s.line,
        },
      ]}
    >
      <View style={styles.rowText}>
        <Txt variant="label">{label}</Txt>
      </View>
      {granted ? (
        <View style={[styles.status, { flexDirection: row(), backgroundColor: s.success.soft }]}>
          <Check size={icon.sm - 2} strokeWidth={3} color={s.success.text} />
          <Txt variant="captionStrong" tone="success">
            {t('permissions.granted')}
          </Txt>
        </View>
      ) : (
        <View style={[styles.status, { backgroundColor: s.sunk }]}>
          <Txt variant="captionStrong" tone="muted">
            {t('common.off')}
          </Txt>
        </View>
      )}
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Txt variant="captionStrong" tone="muted" style={styles.sectionTitle}>
        {title}
      </Txt>
      {children}
    </View>
  );
}

function GroupLabel({ children }: { children: ReactNode }) {
  return (
    <Txt variant="labelStrong" style={styles.groupLabel}>
      {children}
    </Txt>
  );
}

function Note({ children }: { children: ReactNode }) {
  return (
    <Txt variant="caption" tone="muted" style={styles.note}>
      {children}
    </Txt>
  );
}

/**
 * One option in a list of them.
 *
 * The selection mark is a filled dot rather than a checkmark: a check reads as
 * "done", and these are choices that stay chosen.
 */
function Choice({
  title,
  note,
  selected,
  first,
  trailing,
  onPress,
}: {
  title: string;
  note?: string;
  selected: boolean;
  first?: boolean;
  trailing?: ReactNode;
  onPress: () => void;
}) {
  const s = useTheme();
  return (
    <Touch
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [
        styles.rowBase,
        {
          flexDirection: row(),
          backgroundColor: pressed ? s.sunk : 'transparent',
          borderTopWidth: first ? 0 : StyleSheet.hairlineWidth,
          borderTopColor: s.line,
        },
      ]}
    >
      <View
        style={[
          styles.dot,
          {
            borderColor: selected ? s.primary.base : s.lineStrong,
            backgroundColor: selected ? s.primary.base : 'transparent',
          },
        ]}
      >
        {selected ? <View style={[styles.dotCore, { backgroundColor: s.primary.on }]} /> : null}
      </View>

      <View style={styles.rowText}>
        <Txt variant="label">{title}</Txt>
        {note ? (
          <Txt variant="caption" tone="muted" style={styles.rowNote}>
            {note}
          </Txt>
        ) : null}
      </View>

      {trailing}
    </Touch>
  );
}

function ToggleRow({
  label,
  note,
  value,
  first,
  onChange,
}: {
  label: string;
  note?: string;
  value: boolean;
  first?: boolean;
  onChange: (value: boolean) => void;
}) {
  const s = useTheme();
  return (
    <View
      style={[
        styles.rowBase,
        {
          flexDirection: row(),
          borderTopWidth: first ? 0 : StyleSheet.hairlineWidth,
          borderTopColor: s.line,
        },
      ]}
    >
      <View style={styles.rowText}>
        <Txt variant="label">{label}</Txt>
        {note ? (
          <Txt variant="caption" tone="muted" style={styles.rowNote}>
            {note}
          </Txt>
        ) : null}
      </View>
      {/* The platform switch, on purpose: a custom one would be one more thing
          to get wrong for no gain, and users already know how this behaves. */}
      <Switch
        value={value}
        onValueChange={(v) => {
          Feedback.tick();
          onChange(v);
        }}
        accessibilityLabel={label}
        trackColor={{ false: s.lineStrong, true: s.primary.base }}
        // Both platforms, not just Android: react-native-web draws its own
        // green thumb when this is left undefined, which put a second accent
        // colour on a settings screen that has exactly one.
        thumbColor={Platform.OS === 'ios' ? undefined : s.surface}
        ios_backgroundColor={s.lineStrong}
      />
    </View>
  );
}

function ActionRow({
  label,
  note,
  first,
  onPress,
}: {
  label: string;
  note?: string;
  first?: boolean;
  onPress: () => void;
}) {
  const s = useTheme();
  return (
    <Touch
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.rowBase,
        {
          flexDirection: row(),
          backgroundColor: pressed ? s.sunk : 'transparent',
          borderTopWidth: first ? 0 : StyleSheet.hairlineWidth,
          borderTopColor: s.line,
        },
      ]}
    >
      <View style={styles.rowText}>
        <Txt variant="label" tone="primary">
          {label}
        </Txt>
        {note ? (
          <Txt variant="caption" tone="muted" style={styles.rowNote}>
            {note}
          </Txt>
        ) : null}
      </View>
      <ChevronRight size={icon.md} strokeWidth={icon.stroke} color={s.inkFaint} />
    </Touch>
  );
}

function Segmented({
  options,
}: {
  options: { key: string; label: string; selected: boolean; onPress: () => void }[];
}) {
  const s = useTheme();
  return (
    <View style={[styles.segmented, { flexDirection: row() }]} accessibilityRole="radiogroup">
      {options.map((option) => (
        <Touch
          key={option.key}
          accessibilityRole="radio"
          accessibilityState={{ selected: option.selected }}
          accessibilityLabel={option.label}
          onPress={option.onPress}
          style={[
            styles.segment,
            {
              backgroundColor: option.selected ? s.primary.base : s.sunk,
            },
          ]}
        >
          <Txt
            variant="captionStrong"
            tone={option.selected ? 'onPrimary' : 'muted'}
            nums
            style={styles.segmentLabel}
          >
            {option.label}
          </Txt>
        </Touch>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1 },
  header: {
    alignItems: 'center',
    gap: space.lg,
    paddingHorizontal: space.screen,
    paddingTop: space.md,
    paddingBottom: space.lg,
  },
  headerTitle: { flexShrink: 1, flexGrow: 1 },
  close: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { flex: 1 },
  body: {
    paddingHorizontal: space.screen,
    paddingBottom: space.huge,
    gap: space.xxxl,
  },
  section: { gap: space.md },
  sectionTitle: { paddingHorizontal: space.xs },

  groupLabel: {
    paddingHorizontal: space.xl,
    paddingTop: space.lg,
    paddingBottom: space.sm,
  },
  note: {
    paddingHorizontal: space.xl,
    paddingBottom: space.lg,
    paddingTop: space.sm,
  },
  prose: { marginTop: space.sm },

  rowBase: {
    minHeight: HIT + 8,
    alignItems: 'center',
    gap: space.lg,
    paddingHorizontal: space.xl,
    paddingVertical: space.md,
  },
  rowText: { flex: 1, gap: 2 },
  rowNote: { marginTop: 1 },

  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  dotCore: { width: 8, height: 8, borderRadius: 4 },

  status: {
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: space.md,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  playBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  segmented: {
    gap: space.sm,
    paddingHorizontal: space.xl,
  },
  segment: {
    flex: 1,
    minHeight: HIT,
    borderRadius: radius.control,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.xs,
  },
  segmentLabel: { textAlign: 'center' },

  linkBtn: {
    marginTop: space.lg,
    alignItems: 'center',
    gap: space.sm,
    alignSelf: 'flex-start',
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    borderWidth: 1.5,
  },

  credit: {
    textAlign: 'center',
    paddingHorizontal: space.lg,
    paddingBottom: space.lg,
  },
  version: {
    textAlign: 'center',
    paddingTop: space.lg,
  },
});
