import { useCallback, useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
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
import { NotificationService } from './src/services/notifications/NotificationService';
import { useAlarmStore } from './src/state/useAlarmStore';
import { usePermissionsStore } from './src/state/usePermissionsStore';
import { useSettingsStore } from './src/state/useSettingsStore';
import { resolveLanguage } from './src/i18n/resolve';
import { light, useTheme } from './src/theme';
import { log } from './src/utils/logger';

void SplashScreen.preventAutoHideAsync();

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

  const permissionsReady = usePermissionsStore((state) => state.ready);
  const snapshot = usePermissionsStore((state) => state.snapshot);
  const refreshPermissions = usePermissionsStore((state) => state.refresh);

  const status = useAlarmStore((state) => state.status);
  const destination = useAlarmStore((state) => state.destination);
  const radiusM = useAlarmStore((state) => state.radiusM);
  const distanceM = useAlarmStore((state) => state.distanceM);
  const position = useAlarmStore((state) => state.position);
  const stops = useAlarmStore((state) => state.stops);
  const stopsFallback = useAlarmStore((state) => state.stopsFallback);
  const hydrate = useAlarmStore((state) => state.hydrate);
  const cancel = useAlarmStore((state) => state.cancel);
  const dismissAlarm = useAlarmStore((state) => state.dismissAlarm);

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

  useEffect(() => {
    void (async () => {
      try {
        // Paints the native window behind React with the app's own ground, so
        // a cold start never flashes white before the first frame. Read from
        // the light scheme directly: this runs before React renders, so there
        // is no hook to ask, and the splash itself is the light ground.
        await SystemUI.setBackgroundColorAsync(light.bg);

        // Settings first: the language and the theme are read by everything
        // after this line, including the notification channel names.
        await hydrateSettings();
        resolveLanguage(useSettingsStore.getState().language);

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
            stops={stops}
            stopsFallback={stopsFallback}
            onCancel={() => void cancel()}
            onSimulateArrival={() => void ArrivalCoordinator.trigger('manual')}
          />
        ) : (
          <HomeScreen onOpenSettings={() => setShowSettings(true)} />
        )}

        {showSettings ? <SettingsScreen onClose={() => setShowSettings(false)} /> : null}

        {status === 'ringing' && destination ? (
          <AlarmScreen destination={destination} onDismiss={onDismissAlarm} />
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
