import { log } from '../../utils/logger';

import type { AlarmSession } from '../../types';
import type { TripState } from '../alarm/watchdog';

/**
 * Background tasks, in a browser: there are none.
 *
 * `TaskManager.defineTask` has no web implementation, and even if it did there
 * is no headless JS context for a browser to spin up when a tab is closed. In
 * the demo the foreground arrival check and the silence watchdog do the whole
 * job, which is exactly the "foreground only" mode the app already degrades to
 * on a phone when background location is refused.
 */
export function tripStateOf(session: AlarmSession): TripState {
  return {
    radiusM: session.radiusM,
    earlyRadiusM: session.earlyRadiusM ?? null,
    earlySent: session.earlySent ?? false,
    closestM: session.closestM ?? null,
    lastDistanceM: session.lastDistanceM ?? null,
    lastFixAt: session.lastFixAt ?? null,
    lastSpeedMps: session.lastSpeedMps ?? null,
  };
}

export function registerBackgroundTasks(): void {
  log.debug('app', 'web demo: no background tasks');
}
