import { AlarmService } from './AlarmService';
import { NotificationService } from '../notifications/NotificationService';
import { GeofencingService } from '../geofencing/GeofencingService';
import { LocationService } from '../location/LocationService';
import { LiveActivity } from '../../../modules/live-activity';
import { Journal } from '../debug/Journal';
import { liveCard } from '../notifications/liveCard';
import { AlarmStorage } from '../storage/AlarmStorage';
import { MIN_RADIUS_M } from '../../constants/config';
import type { AlarmReason, AlarmSession, LatLng } from '../../types';
import { distanceMeters } from '../../utils/geo';
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
    void Journal.record(
      'alarm',
      `${reason} — fired by ${triggeredBy}, ${
        session.lastDistanceM === null || session.lastDistanceM === undefined
          ? 'no fix on record'
          : `${Math.round(session.lastDistanceM)}m out`
      }`
    );

    await NotificationService.presentAlarm(session.destination.label, reason, {
      distance: session.lastDistanceM,
    });
    await NotificationService.dismissStatus();

    await Promise.all([GeofencingService.stop(), LocationService.stopBackgroundTracking()]);

    // The card's job is over the moment the alarm has the screen. Leaving it up
    // would put a stale distance next to a ringing alarm.
    await LiveActivity.end();

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
    void Journal.record('early', `heads-up sent at ${session.earlyRadiusM ?? session.radiusM}m`);
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
      const againCard = liveCard(again.lastDistanceM ?? null, again.radiusM);
      await LiveActivity.start(
        again.destination.label,
        againCard.distance,
        againCard.note,
        againCard.staleText
      );
      log.debug('alarm', 're-armed at the destination itself');
      return true;
    } catch (error) {
      log.error('alarm', 'failed to re-arm', error);
      await ArrivalCoordinator.standDown();
      return false;
    }
  },

  /**
   * Moves on to the next leg of the journey, if there is one.
   *
   * Called when the user dismisses an alarm. Returns false when the journey is
   * over, which is the caller's cue to stand down properly.
   *
   * `from` is where the passenger is standing right now, when the app knows.
   * It only picks the starting sample rate — a leg that is two stops long must
   * not begin on the tier meant for a trip across the country.
   */
  async advanceLeg(from: LatLng | null = null): Promise<boolean> {
    const session = await AlarmStorage.read();
    const next = session?.remaining?.[0];
    if (!session || !next) return false;

    await AlarmService.stop();
    await NotificationService.dismissAll();

    // Unknown position means the coarsest tier, which is the safe default: the
    // first background fix re-tiers within one sample, and the geofence is
    // watching regardless.
    const tier = LocationService.tierForDistance(
      from ? distanceMeters(from, next.destination.coords) : Number.POSITIVE_INFINITY
    );

    const continued: AlarmSession = {
      ...session,
      status: 'armed',
      destination: next.destination,
      radiusM: next.radiusM,
      remaining: session.remaining.slice(1),
      triggeredAt: null,
      triggeredBy: null,
      reason: null,
      // Everything measured against the previous leg is meaningless against
      // this one. A stale low-water mark would read as an instant overshoot.
      closestM: null,
      lastDistanceM: null,
      lastFixAt: null,
      lastSpeedMps: null,
      staleNoticed: false,
      statusDistanceLabel: null,
      earlySent: false,
      pollingTierId: tier.id,
    };

    await AlarmStorage.write(continued);

    try {
      if (!continued.foregroundOnly) {
        await GeofencingService.start(continued.destination, continued.radiusM);
        await LocationService.startBackgroundTracking(tier);
      }
      await NotificationService.presentArmedStatus(continued.destination.label);
      // A new destination means a new card: ActivityKit attributes are fixed
      // for the life of an activity, so the leg change cannot be an update.
      const card = liveCard(null, continued.radiusM);
      await LiveActivity.start(continued.destination.label, card.distance, card.note, card.staleText);
      log.debug('alarm', `advanced to next leg: ${continued.destination.label}`);
      void Journal.record(
        'leg',
        `next leg armed: ${continued.destination.label} r=${continued.radiusM}m tier=${tier.id}`
      );
      return true;
    } catch (error) {
      log.error('alarm', 'failed to arm the next leg', error);
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
    await LiveActivity.end();
    log.debug('alarm', 'stood down');
    void Journal.record('stood-down', 'everything stopped, session cleared');
  },
};
