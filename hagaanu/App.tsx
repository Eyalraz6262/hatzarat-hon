import { useCallback, useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';

import { AlarmScreen } from './src/screens/AlarmScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { PassScreen } from './src/screens/PassScreen';
import { PermissionsScreen } from './src/screens/PermissionsScreen';
import { ArrivalCoordinator } from './src/services/alarm/ArrivalCoordinator';
import { useAppFonts } from './src/hooks/useAppFonts';
import { useArrivalListener } from './src/hooks/useArrivalListener';
import { useLocationTracking } from './src/hooks/useLocationTracking';
import { useForegroundArrivalCheck } from './src/hooks/useForegroundArrivalCheck';
import { NotificationService } from './src/services/notifications/NotificationService';
import { useAlarmStore } from './src/state/useAlarmStore';
import { usePermissionsStore } from './src/state/usePermissionsStore';
import { palette, useTheme } from './src/theme';
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

  const permissionsReady = usePermissionsStore((state) => state.ready);
  const snapshot = usePermissionsStore((state) => state.snapshot);
  const refreshPermissions = usePermissionsStore((state) => state.refresh);

  const status = useAlarmStore((state) => state.status);
  const destination = useAlarmStore((state) => state.destination);
  const radiusM = useAlarmStore((state) => state.radiusM);
  const distanceM = useAlarmStore((state) => state.distanceM);
  const hydrate = useAlarmStore((state) => state.hydrate);
  const cancel = useAlarmStore((state) => state.cancel);
  const dismissAlarm = useAlarmStore((state) => state.dismissAlarm);

  const fontsReady = useAppFonts();

  // Tracking lives here, not in a screen: HomeScreen unmounts the moment the
  // alarm is armed, and it is the only writer of `position` — which the
  // foreground arrival check, and PassScreen's live distance, both read.
  useLocationTracking();
  useArrivalListener();
  useForegroundArrivalCheck();

  useEffect(() => {
    void (async () => {
      try {
        // Paints the window behind React with the app's own background, so a
        // cold start never flashes white before the first frame.
        // The native window ground. Painted from the pigment rather than the
        // scheme: this runs before React renders, so there is no hook to read.
        await SystemUI.setBackgroundColorAsync(palette.ink);

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

  const ready = booted && permissionsReady && fontsReady;

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  const onDismissAlarm = useCallback(() => void dismissAlarm(), [dismissAlarm]);

  if (!ready) {
    return <View style={[styles.boot, { backgroundColor: theme.world.bg }]} />;
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
      <View style={[styles.root, { backgroundColor: theme.world.bg }]}>
        {/*
          A plain state machine rather than a navigator: there are only four
          destinations, and the alarm has to be able to take the screen from any
          of them — which a stack navigator would only complicate.
        */}
        {needsPermissions ? (
          <PermissionsScreen onSkipBackground={() => setSkippedBackground(true)} />
        ) : status === 'armed' && destination ? (
          <PassScreen
            destination={destination}
            radiusM={radiusM}
            distanceM={distanceM}
            onCancel={() => void cancel()}
            onSimulateArrival={() => void ArrivalCoordinator.trigger('manual')}
          />
        ) : (
          <HomeScreen />
        )}

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
