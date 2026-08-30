import { useEffect } from 'react';

import { MAX_ACCURACY_MARGIN_M } from '../constants/config';
import { ArrivalCoordinator } from '../services/alarm/ArrivalCoordinator';
import { useAlarmStore } from '../state/useAlarmStore';

/**
 * Third detection layer: the app is open and we can see we've arrived.
 *
 * Two jobs. It is the *only* trigger when the user declined background location
 * (foreground-only mode), and it is a free extra safety net the rest of the time —
 * if someone happens to be looking at the app as the train pulls in, this fires
 * before either OS layer gets around to it.
 *
 * The coordinator is idempotent, so racing the geofence here is harmless.
 */
export function useForegroundArrivalCheck(): void {
  const status = useAlarmStore((state) => state.status);
  const distanceM = useAlarmStore((state) => state.distanceM);
  const radiusM = useAlarmStore((state) => state.radiusM);
  const accuracy = useAlarmStore((state) => state.position?.accuracy ?? null);

  useEffect(() => {
    if (status !== 'armed' || distanceM === null) return;

    // Same rule as the background backstop: trust the fix's own error estimate,
    // capped so a bad fix can't fire the alarm kilometers early.
    const margin = Math.min(accuracy ?? 0, MAX_ACCURACY_MARGIN_M);
    if (distanceM <= radiusM + margin) {
      void ArrivalCoordinator.trigger('foreground');
    }
  }, [status, distanceM, radiusM, accuracy]);
}
