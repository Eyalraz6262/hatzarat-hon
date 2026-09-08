import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { StatusBar } from 'expo-status-bar';
import { I18nManager, Linking, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';

import { AlarmScreen } from './src/screens/AlarmScreen';
import { ActiveScreen } from './src/screens/ActiveScreen';
import { DemoScreen } from './src/screens/DemoScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { PermissionsScreen } from './src/screens/PermissionsScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { ArrivalCoordinator } from './src/services/alarm/ArrivalCoordinator';
import { useAppFonts } from './src/hooks/useAppFonts';
import { useArrivalListener } from './src/hooks/useArrivalListener';
import { useLocationTracking } from './src/hooks/useLocationTracking';
import { useForegroundArrivalCheck } from './src/hooks/useForegroundArrivalCheck';
import { useProcessGuard } from './src/hooks/useProcessGuard';
import { useSilenceWatch } from './src/hooks/useSilenceWatch';
import { NotificationService } from './src/services/notifications/NotificationService';
import { useAlarmStore } from './src/state/useAlarmStore';
import { usePermissionsStore } from './src/state/usePermissionsStore';
import { useSettingsStore } from './src/state/useSettingsStore';
import { isRTLLanguage } from './src/i18n';
import { resolveLanguage } from './src/i18n/resolve';
import { currentScheme, useTheme } from './src/theme';
import { log } from './src/utils/logger';

void SplashScreen.preventAutoHideAsync();

/**
 * The debug screen, in development builds only.
 *
 * Loaded through a guarded `require` rather than an import because Metro folds
 * `__DEV__` to a literal and drops unreachable branches BEFORE it collects
 * dependencies — so in a release build the module never enters the bundle at
 * all. A static import would ship the whole screen and its strings and merely
 * hide it, which is not the same thing.
 */
const DebugScreen: (props: { onClose: () => void }) => ReactNode = __DEV__
  ? // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('./src/screens/DebugScreen').DebugScreen
  : () => null;

/**
 * Root of the app.
 *
 * Screen selection is a plain state machine rather than a navigator: there are
 * only three destinations and the alarm must be able to take over the screen from
 * any of them, which a stack navigator would only complicate.
 */
export default function App() {
  const theme = useTheme();
  const [booted, setBooted] = useState(false);
  // Session-scoped: the user chose to continue without background location. Not
  // persisted, so the next cold start asks once more — the ask matters too much.
  const [skippedBackground, setSkippedBackground] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  const permissionsReady = usePermissionsStore((state) => state.ready);
  const snapshot = usePermissionsStore((state) => state.snapshot);
  const refreshPermissions = usePermissionsStore((state) => state.refresh);

  const status = useAlarmStore((state) => state.status);
  const destination = useAlarmStore((state) => state.destination);
  const radiusM = useAlarmStore((state) => state.radiusM);
  const distanceM = useAlarmStore((state) => state.distanceM);
  const position = useAlarmStore((state) => state.position);
  const stale = useAlarmStore((state) => state.stale);
  const killed = useAlarmStore((state) => state.killed);
  const dismissKilled = useAlarmStore((state) => state.dismissKilled);
  const hydrate = useAlarmStore((state) => state.hydrate);
  const cancel = useAlarmStore((state) => state.cancel);
  const dismissAlarm = useAlarmStore((state) => state.dismissAlarm);
  const wakeAgain = useAlarmStore((state) => state.wakeAgain);
  const session = useAlarmStore((state) => state.session);

  const fontsReady = useAppFonts();

  const settingsReady = useSettingsStore((state) => state.ready);
  const hydrateSettings = useSettingsStore((state) => state.hydrate);
  const demoSeen = useSettingsStore((state) => state.demoSeen);
  const setSetting = useSettingsStore((state) => state.set);

  // Tracking lives here, not in a screen: HomeScreen unmounts the moment the
  // alarm is armed, and it is the only writer of `position` — which the
  // foreground arrival check, and PassScreen's live distance, both read.
  useLocationTracking();
  useArrivalListener();
  useForegroundArrivalCheck();
  // The two layers that react to something NOT happening: no fix arriving, and
  // the OS quietly unregistering our monitors.
  useSilenceWatch();
  useProcessGuard();

  useEffect(() => {
    void (async () => {
      try {
        // Settings first: the language and the theme are read by everything
        // after this line, including the notification channel names and the
        // window colour below.
        await hydrateSettings();
        const language = resolveLanguage(useSettingsStore.getState().language);

        // The native flag, written from the language we actually resolved.
        // It only takes effect on the NEXT launch — React Native fixes layout
        // direction at native startup — so this is about the views we do not
        // draw ourselves: the caret in a TextInput, the button order in an
        // Alert. Our own components already follow the language directly.
        if (I18nManager.isRTL !== isRTLLanguage(language)) {
          I18nManager.forceRTL(isRTLLanguage(language));
        }

        // Paints the native window behind React with the app's own ground, so
        // a cold start never flashes the wrong colour before the first frame.
        // Runs before React renders, so the scheme is read outside the hook.
        await SystemUI.setBackgroundColorAsync(currentScheme().bg);

        // Channels before anything else: a geofence event arriving in the next
        // second must find the alarm channel already created.
        await NotificationService.configure();
        await refreshPermissions();
        await hydrate();
      } catch (error) {
        log.error('app', 'boot failed', error);
      } finally {
        setBooted(true);
      }
    })();
  }, [refreshPermissions, hydrate]);

  const ready = booted && permissionsReady && fontsReady && settingsReady;

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  const onDismissAlarm = useCallback(() => void dismissAlarm(), [dismissAlarm]);

  if (!ready) {
    return <View style={[styles.boot, { backgroundColor: theme.bg }]} />;
  }

  // Foreground location and notifications are non-negotiable. Background location
  // is asked for but skippable — see PermissionsScreen.
  const needsPermissions =
    snapshot.foregroundLocation !== 'granted' ||
    snapshot.notifications !== 'granted' ||
    (snapshot.backgroundLocation !== 'granted' && !skippedBackground);

  return (
    <SafeAreaProvider>
      <StatusBar style={theme.statusBar} />
      <View style={[styles.root, { backgroundColor: theme.bg }]}>
        {/*
          A plain state machine rather than a navigator: there are only four
          destinations, and the alarm has to be able to take the screen from any
          of them — which a stack navigator would only complicate.
        */}
        {needsPermissions ? (
          <PermissionsScreen onSkipBackground={() => setSkippedBackground(true)} />
        ) : !demoSeen ? (
          // Shown once, after the permissions and before the first trip. Hearing
          // the alarm once is what turns "I locked my phone and trusted an app
          // that has never made a sound at me" into a decision.
          <DemoScreen onDone={() => setSetting('demoSeen', true)} />
        ) : status === 'armed' && destination ? (
          <ActiveScreen
            destination={destination}
            radiusM={radiusM}
            distanceM={distanceM}
            here={position?.coords ?? null}
            remaining={session?.remaining ?? []}
            stale={stale}
            killed={killed}
            onDismissKilled={dismissKilled}
            onOpenBatterySettings={() => void Linking.openSettings()}
            onCancel={() => void cancel()}
            onSimulateArrival={() => void ArrivalCoordinator.trigger('manual')}
          />
        ) : (
          <HomeScreen onOpenSettings={() => setShowSettings(true)} />
        )}

        {showSettings ? (
          <SettingsScreen
            onClose={() => setShowSettings(false)}
            onOpenDebug={() => setShowDebug(true)}
          />
        ) : null}

        {/* Above settings, below the alarm: the alarm outranks everything. */}
        {__DEV__ && showDebug ? <DebugScreen onClose={() => setShowDebug(false)} /> : null}

        {status === 'ringing' && destination ? (
          <AlarmScreen
            destination={destination}
            reason={session?.reason ?? 'arrived'}
            lastDistanceM={session?.lastDistanceM ?? null}
            onDismiss={onDismissAlarm}
            onWakeAgain={() => void wakeAgain()}
          />
        ) : null}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  boot: {
    flex: 1,
  },
});
