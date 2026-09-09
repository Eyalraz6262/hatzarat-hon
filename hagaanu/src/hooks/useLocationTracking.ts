import { useEffect } from 'react';
import type * as Location from 'expo-location';

import { LocationService } from '../services/location/LocationService';
import { useAlarmStore } from '../state/useAlarmStore';
import { usePermissionsStore } from '../state/usePermissionsStore';
import { log } from '../utils/logger';

/**
 * Keeps the store's `position` fresh while the app is on screen.
 *
 * Foreground-only by design: once the phone is locked the background task owns
 * tracking, and running two watchers would double the radio wakes for nothing.
 */
export function useLocationTracking(): void {
  const granted = usePermissionsStore((state) => state.snapshot.foregroundLocation === 'granted');
  const setPosition = useAlarmStore((state) => state.setPosition);

  useEffect(() => {
    if (!granted) return;

    let subscription: Location.LocationSubscription | null = null;
    let cancelled = false;

    void (async () => {
      const initial = await LocationService.getCurrent();
      if (initial && !cancelled) setPosition(initial);

      try {
        const sub = await LocationService.watch(setPosition);
        if (cancelled) sub.remove();
        else subscription = sub;
      } catch (error) {
        log.warn('location', 'foreground watch failed', error);
      }
    })();

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [granted, setPosition]);
}
