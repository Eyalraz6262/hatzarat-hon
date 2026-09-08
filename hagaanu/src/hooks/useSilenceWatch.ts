import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { ArrivalCoordinator } from '../services/alarm/ArrivalCoordinator';
import { onSilence } from '../services/alarm/watchdog';
import { tripStateOf } from '../services/geofencing/backgroundTasks';
import { NotificationService } from '../services/notifications/NotificationService';
import { AlarmStorage } from '../services/storage/AlarmStorage';
import { useAlarmStore } from '../state/useAlarmStore';
import { formatDistance } from '../utils/geo';
import { log } from '../utils/logger';

/**
 * Watches for the background stream going quiet.
 *
 * Everything else in the detection stack reacts to a fix ARRIVING. This is the
 * only part that reacts to one NOT arriving, which is the failure that
 * actually happens: a tunnel, an underground platform, an Android OEM killing
 * the process. Without it the app would sit showing a distance from four
 * minutes ago as though it were live.
 *
 * It runs on a slow interval and, more importantly, on every return to the
 * foreground — because a phone that comes out of a pocket is the moment the
 * user is most likely to be checking whether anything is still working.
 *
 * It cannot run while the process is dead, and that is not a gap it pretends
 * to cover: the OS geofence is the layer that survives that, and this one
 * catches the case where we are alive but blind.
 */

/** Slow on purpose. The thresholds are 90s and 180s; polling faster buys nothing. */
const TICK_MS = 30_000;

export function useSilenceWatch(): void {
  const status = useAlarmStore((state) => state.status);
  const setStale = useAlarmStore((state) => state.setStale);
  const running = useRef(false);

  useEffect(() => {
    if (status !== 'armed') return;

    const check = async () => {
      // One at a time. A tick landing on top of a foreground event must not
      // produce two alarms for one blackout.
      if (running.current) return;
      running.current = true;

      try {
        const session = await AlarmStorage.read();
        if (!session || session.status !== 'armed') return;

        const signal = onSilence(tripStateOf(session), Date.now());
        setStale(signal.kind === 'stale-warn' || signal.kind === 'stale-ring');

        if (signal.kind === 'stale-ring') {
          log.debug('location', `silence watchdog ringing at ${Math.round(signal.lastDistanceM)}m`);
          await ArrivalCoordinator.trigger('watchdog', 'stale');
          return;
        }

        if (signal.kind === 'stale-warn' && !session.staleNoticed) {
          // Said once per blackout. The lock screen stops claiming a live
          // distance; a fresh fix clears the flag and lets it be said again.
          await AlarmStorage.patch({ staleNoticed: true });
          await NotificationService.presentArmedStatus(
            session.destination.label,
            formatDistance(signal.lastDistanceM),
            true
          );
        }
      } catch (error) {
        log.warn('location', 'silence watchdog failed', error);
      } finally {
        running.current = false;
      }
    };

    void check();
    const timer = setInterval(() => void check(), TICK_MS);
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') void check();
    });

    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [status, setStale]);
}
