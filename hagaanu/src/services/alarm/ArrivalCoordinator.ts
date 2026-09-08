import { AlarmService } from './AlarmService';
import { NotificationService } from '../notifications/NotificationService';
import { GeofencingService } from '../geofencing/GeofencingService';
import { LocationService } from '../location/LocationService';
import { AlarmStorage } from '../storage/AlarmStorage';
import { MIN_RADIUS_M } from '../../constants/config';
import type { AlarmReason, AlarmSession } from '../../types';
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
  async trigger(
    triggeredBy: AlarmSession['triggeredBy'],
    reason: AlarmReason = 'arrived'
  ): Promise<void> {
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
      reason,
    };
    await AlarmStorage.write(ringingSession);
    log.debug('alarm', `${reason} confirmed by ${triggeredBy}`);

    await NotificationService.presentAlarm(session.destination.label, reason, {
      distance: session.lastDistanceM,
    });
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

  /**
   * Sends the silent early heads-up, once.
   *
   * Deliberately not a call to `trigger`: nothing rings, nothing is torn down,
   * and the trip continues exactly as it was. The only state that changes is
   * the flag that stops it happening twice.
   */
  async sendEarly(): Promise<void> {
    const session = await AlarmStorage.read();
    if (!session || session.status !== 'armed' || session.earlySent) return;

    await AlarmStorage.patch({ earlySent: true });
    await NotificationService.presentEarly(
      session.destination.label,
      session.earlyRadiusM ?? session.radiusM
    );
    log.debug('alarm', 'early heads-up sent');
  },

  /**
   * Re-arms at the destination itself after the user dismissed the first alarm.
   *
   * The radius drops to the minimum the OS will monitor rather than to zero: a
   * geofence with no radius is not a geofence, and iOS quietly refuses regions
   * below about 100m. This is the "wake me again at the stop itself" path.
   */
  async wakeAgain(): Promise<boolean> {
    const session = await AlarmStorage.read();
    if (!session) return false;

    await AlarmService.stop();
    await NotificationService.dismissAll();

    const again: AlarmSession = {
      ...session,
      status: 'armed',
      radiusM: MIN_RADIUS_M,
      earlyRadiusM: null,
      earlySent: true,
      triggeredAt: null,
      triggeredBy: null,
      reason: null,
      // A fresh low-water mark: the previous trip's closest approach would
      // read as an immediate overshoot against the tighter ring.
      closestM: null,
      staleNoticed: false,
      statusDistanceLabel: null,
    };

    await AlarmStorage.write(again);

    try {
      if (!again.foregroundOnly) {
        await GeofencingService.start(again.destination, again.radiusM);
        await LocationService.startBackgroundTracking(
          LocationService.tierForDistance(again.lastDistanceM ?? 0)
        );
      }
      await NotificationService.presentArmedStatus(again.destination.label);
      log.debug('alarm', 're-armed at the destination itself');
      return true;
    } catch (error) {
      log.error('alarm', 'failed to re-arm', error);
      await ArrivalCoordinator.standDown();
      return false;
    }
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
