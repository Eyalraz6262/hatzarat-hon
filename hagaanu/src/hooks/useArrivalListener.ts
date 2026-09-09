import { useEffect } from 'react';
import { AppState } from 'react-native';

import { ArrivalCoordinator } from '../services/alarm/ArrivalCoordinator';
import { AlarmStorage } from '../services/storage/AlarmStorage';
import { useAlarmStore } from '../state/useAlarmStore';

/**
 * Bridges background arrivals into React state.
 *
 * Two paths, because there are two ways an arrival reaches a mounted UI:
 *  - Our JS context is alive (app backgrounded but not killed): the coordinator
 *    calls the subscriber directly.
 *  - Our process was restarted by the OS to run the geofence task and the user
 *    then opened the app: nothing is in memory, so we re-read disk whenever the
 *    app comes back to the foreground.
 */
export function useArrivalListener(): void {
  const onArrival = useAlarmStore((state) => state.onArrival);

  useEffect(() => ArrivalCoordinator.subscribe(onArrival), [onArrival]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next !== 'active') return;
      void (async () => {
        const session = await AlarmStorage.read();
        if (session?.status === 'ringing' && useAlarmStore.getState().status !== 'ringing') {
          onArrival(session);
        }
      })();
    });
    return () => subscription.remove();
  }, [onArrival]);
}
