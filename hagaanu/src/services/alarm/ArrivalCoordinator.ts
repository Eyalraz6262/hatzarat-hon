import { AlarmService } from './AlarmService';
import { NotificationService } from '../notifications/NotificationService';
import { GeofencingService } from '../geofencing/GeofencingService';
import { LocationService } from '../location/LocationService';
import { AlarmStorage } from '../storage/AlarmStorage';
import type { AlarmSession } from '../../types';
import { log } from '../../utils/logger';

type Listener = (session: AlarmSession) => void;

const listeners = new Set<Listener>();

/**
 * The single place that decides "we have arrived" and acts on it.
 *
 * Three callers can reach this: the OS geofence task, the backstop location task,
 * and (for testing) a manual trigger. Any of them may run while no React tree is
 * mounted, so this module owns no component state — it writes to disk first, then
 * notifies whatever UI happens to be listening.
 */
export const ArrivalCoordinator = {
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  /**
   * Fires the alarm exactly once per armed session.
   *
   * Order matters and is not arbitrary:
   *  1. Flip persisted state to `ringing` — this is the idempotency guard, so a
   *     geofence event and a backstop fix arriving together only ring once.
   *  2. Post the notification — the only layer guaranteed to survive our process
   *     being torn down moments later.
   *  3. Tear down tracking — the trip is over; keep nothing draining the battery.
   *  4. Start sound and vibration, and tell any mounted UI to show the wake screen.
   */
  async trigger(triggeredBy: AlarmSession['triggeredBy']): Promise<void> {
    const session = await AlarmStorage.read();

    if (!session) {
      log.warn('alarm', `arrival reported by ${triggeredBy} with no armed session`);
      return;
    }

    if (session.status === 'ringing') {
      log.debug('alarm', `duplicate arrival from ${triggeredBy}, already ringing`);
      return;
    }

    const ringingSession: AlarmSession = {
      ...session,
      status: 'ringing',
      triggeredAt: Date.now(),
      triggeredBy,
    };
    await AlarmStorage.write(ringingSession);
    log.debug('alarm', `arrival confirmed by ${triggeredBy}`);

    await NotificationService.presentAlarm(session.destination.label);
    await NotificationService.dismissStatus();

    await Promise.all([GeofencingService.stop(), LocationService.stopBackgroundTracking()]);

    await AlarmService.start();

    listeners.forEach((listener) => {
      try {
        listener(ringingSession);
      } catch (error) {
        log.error('alarm', 'arrival listener threw', error);
      }
    });
  },

  /** Stops everything and clears the session. Used by "I'm awake" and "cancel". */
  async standDown(): Promise<void> {
    await AlarmService.stop();
    await Promise.all([GeofencingService.stop(), LocationService.stopBackgroundTracking()]);
    await NotificationService.dismissAll();
    await AlarmStorage.clear();
    log.debug('alarm', 'stood down');
  },
};
