import { create } from 'zustand';

import { DEFAULT_RADIUS_M, EARLY_RADIUS_M, SNOOZE_MS } from '../constants/config';
import { t } from '../i18n';
import { AlarmService } from '../services/alarm/AlarmService';
import { ArrivalCoordinator } from '../services/alarm/ArrivalCoordinator';
import { LiveActivity } from '../../modules/live-activity';
import { Journal } from '../services/debug/Journal';
import { liveCard } from '../services/notifications/liveCard';
import { GeofencingService } from '../services/geofencing/GeofencingService';
import { LocationService } from '../services/location/LocationService';
import { NotificationService } from '../services/notifications/NotificationService';
import { AlarmStorage } from '../services/storage/AlarmStorage';
import { TripStorage, type Trip } from '../services/storage/TripStorage';
import { SavedStorage, type SavedDestination, type SavedKind } from '../services/storage/SavedStorage';
import { usePermissionsStore } from './usePermissionsStore';
import type { AlarmSession, AlarmStatus, Destination, Leg, PositionSample } from '../types';
import { distanceMeters } from '../utils/geo';
import { log } from '../utils/logger';

type AlarmState = {
  status: AlarmStatus;
  /** Where the user wants to wake up. Null until they pick something. */
  destination: Destination | null;
  radiusM: number;
  /**
   * Whether the user asked for the quiet heads-up further out. Off by default:
   * most trips do not need it, and an extra notification on every journey is a
   * cost paid by everyone to serve a few.
   */
  earlyWarning: boolean;
  /**
   * The change of vehicle, when the journey has one.
   *
   * Held next to the destination rather than inside it because it is a
   * property of the JOURNEY, not of the place: the same station is a transfer
   * on one trip and the destination on another.
   */
  transfer: Destination | null;
  /** Newest position we have, from the foreground watcher. */
  position: PositionSample | null;
  /** Meters to the destination, or null when either endpoint is unknown. */
  distanceM: number | null;
  session: AlarmSession | null;
  /** True while arm/cancel is in flight, so the button can't be double-tapped. */
  busy: boolean;
  error: string | null;
  /** Ordered by last use — the trip taken yesterday is the likely one now. */
  saved: SavedDestination[];
  /** Every alarm this device has armed, newest first. Local only. */
  trips: Trip[];

  setDestination: (destination: Destination | null) => void;
  setRadius: (radiusM: number) => void;
  setEarlyWarning: (on: boolean) => void;
  setTransfer: (transfer: Destination | null) => void;
  setPosition: (position: PositionSample) => void;
  setError: (error: string | null) => void;
  /** Rehydrates from disk — call once at boot, before the first render matters. */
  hydrate: () => Promise<void>;
  saveCurrent: (name: string, kind: SavedKind) => Promise<void>;
  useSaved: (item: SavedDestination) => Promise<void>;
  removeSaved: (id: string) => Promise<void>;
  clearTrips: () => Promise<void>;
  /** Pins a route to the front of the list, or unpins it. */
  pinSaved: (id: string, pinned: boolean) => Promise<void>;
  arm: () => Promise<boolean>;
  cancel: () => Promise<void>;
  dismissAlarm: () => Promise<void>;
  /** Silences the alarm and rings again in two minutes. */
  snooze: () => Promise<void>;
  /** True while a snooze is counting down. */
  snoozed: boolean;
  /** Applied when a background task decides we arrived while the UI is mounted. */
  onArrival: (session: AlarmSession) => void;

  /**
   * True once we have caught the OS tearing our monitors down mid-trip.
   *
   * Session-scoped rather than persisted: it drives a one-off explanation, and
   * a flag that survives a reinstall would keep nagging about a problem that
   * may already be fixed.
   */
  killed: boolean;
  reportKilled: () => void;
  dismissKilled: () => void;

  /**
   * True while no fix has arrived for long enough that the displayed distance
   * is no longer current. Set by the silence watchdog; cleared by a fresh fix.
   */
  stale: boolean;
  setStale: (stale: boolean) => void;
};

function computeDistance(position: PositionSample | null, destination: Destination | null): number | null {
  if (!position || !destination) return null;
  return distanceMeters(position.coords, destination.coords);
}

export const useAlarmStore = create<AlarmState>((set, get) => ({
  status: 'idle',
  destination: null,
  radiusM: DEFAULT_RADIUS_M,
  earlyWarning: false,
  transfer: null,
  position: null,
  distanceM: null,
  session: null,
  busy: false,
  error: null,
  saved: [],
  trips: [],
  killed: false,
  stale: false,
  snoozed: false,

  setDestination: (destination) =>
    set((state) => ({
      destination,
      error: null,
      distanceM: computeDistance(state.position, destination),
      // A change belongs to a journey. Choosing a new destination ends the old
      // journey, so a transfer left over from it would be a stop on a route
      // nobody is taking.
      transfer: null,
    })),

  setRadius: (radiusM) => set({ radiusM }),

  setEarlyWarning: (earlyWarning) => set({ earlyWarning }),

  setTransfer: (transfer) => set({ transfer }),

  setPosition: (position) =>
    set((state) => ({
      position,
      distanceM: computeDistance(position, state.destination),
      // A fix in hand is proof the blackout is over, whichever layer got it.
      stale: false,
    })),

  setError: (error) => set({ error }),

  reportKilled: () => set({ killed: true }),
  dismissKilled: () => set({ killed: false }),

  setStale: (stale) => set({ stale }),

  async hydrate() {
    set({ saved: await SavedStorage.readAll(), trips: await TripStorage.readAll() });

    const session = await AlarmStorage.read();
    if (!session) return;

    if (session.status === 'ringing') {
      // The alarm fired while we weren't on screen — the user is opening the app
      // *because* it woke them. Restore the ringing state and make noise again
      // if our process was restarted in the meantime.
      set({
        status: 'ringing',
        session,
        destination: session.destination,
        radiusM: session.radiusM,
      });
      if (!AlarmService.isRinging()) void AlarmService.start();
      return;
    }

    // Armed: make sure the OS-side monitors survived whatever happened to our
    // process (a reboot clears geofences on both platforms).
    const geofenceLive = session.foregroundOnly || (await GeofencingService.isActive());
    if (!geofenceLive) {
      log.warn('store', 're-arming geofence lost across process restart');
      try {
        await GeofencingService.start(session.destination, session.radiusM);
      } catch (error) {
        log.error('store', 'failed to re-arm geofence', error);
      }
    }

    set({
      status: 'armed',
      session,
      destination: session.destination,
      radiusM: session.radiusM,
      // Restored from the session, never refetched: the armed alarm does not
      // touch the network, and this is the state where the rail matters most.
    });
  },

  async saveCurrent(name, kind) {
    const { destination, radiusM } = get();
    if (!destination) return;
    set({ saved: await SavedStorage.save({ name, kind, destination, radiusM }) });
  },

  /**
   * Picking a saved destination sets BOTH the place and the radius it was
   * saved with — the radius is part of the trip, not a global preference, and
   * restoring only half of it would silently arm the wrong alarm.
   */
  async useSaved(item) {
    set((state) => ({
      destination: item.destination,
      radiusM: item.radiusM,
      distanceM: computeDistance(state.position, item.destination),
      error: null,
    }));
    set({ saved: await SavedStorage.touch(item.id) });
  },

  async pinSaved(id, pinned) {
    set({ saved: await SavedStorage.setPinned(id, pinned) });
  },

  async clearTrips() {
    set({ trips: await TripStorage.clear() });
  },

  async removeSaved(id) {
    set({ saved: await SavedStorage.remove(id) });
  },

  async arm() {
    const { destination, radiusM, position, transfer } = get();
    if (!destination || get().busy) return false;

    set({ busy: true, error: null });

    try {
      // With a change, the FIRST thing we watch for is the transfer, and the
      // chosen destination waits its turn. One OS region at a time.
      const first = transfer ?? destination;
      const remaining: Leg[] = transfer ? [{ destination, radiusM }] : [];

      const distance = computeDistance(position, first) ?? Number.POSITIVE_INFINITY;
      const tier = LocationService.tierForDistance(distance);

      // Both OS geofencing and the background stream require "Always" location.
      // If the user declined it we still arm — the foreground watcher can fire
      // the alarm while the app is open — but we don't pretend otherwise.
      const foregroundOnly =
        usePermissionsStore.getState().snapshot.backgroundLocation !== 'granted';

      const session: AlarmSession = {
        id: `${Date.now()}`,
        destination: first,
        radiusM,
        remaining,
        status: 'armed',
        armedAt: Date.now(),
        triggeredAt: null,
        triggeredBy: null,
        pollingTierId: tier.id,
        statusDistanceLabel: null,
        foregroundOnly,
        reason: null,
        earlyRadiusM: get().earlyWarning ? EARLY_RADIUS_M : null,
        earlySent: false,
        // Seeded from the current distance rather than left null, so a trip
        // that starts already near the destination has a low-water mark from
        // the first moment instead of after the first background fix.
        closestM: Number.isFinite(distance) ? distance : null,
        lastDistanceM: Number.isFinite(distance) ? distance : null,
        lastFixAt: position ? position.timestamp : null,
        lastSpeedMps: null,
        staleNoticed: false,
        // Frozen here on purpose: from this point the alarm is a geofence and
        // a local position stream, and nothing may need the network again.
      };

      // Persist before starting the monitors: if the OS wakes the geofence task
      // a millisecond later, the session must already be readable from disk.
      await AlarmStorage.write(session);

      if (!foregroundOnly) {
        await GeofencingService.start(session.destination, radiusM);
        await LocationService.startBackgroundTracking(tier);
      }
      await NotificationService.presentArmedStatus(session.destination.label);

      // The lock-screen card. Absent on Android, on older iPhones, and when the
      // user has switched Live Activities off — all of which this handles by
      // doing nothing, because the alarm does not depend on it.
      const card = liveCard(Number.isFinite(distance) ? distance : null, radiusM);
      await LiveActivity.start(
        session.destination.label,
        card.distance,
        card.note,
        card.staleText
      );

      void Journal.record(
        'armed',
        `${session.destination.label} r=${radiusM}m tier=${tier.id}` +
          `${remaining.length ? ` · then ${destination.label}` : ''}` +
          `${foregroundOnly ? ' · FOREGROUND ONLY' : ''}`
      );

      AlarmService.confirmationBuzz();
      set({ status: 'armed', session, destination: session.destination, busy: false });

      // History is written here rather than on arrival, so a trip that is
      // cancelled or that the app never sees the end of is still recorded.
      // It carries the session's own id, which is what lets the close-out
      // below match it without guessing.
      set({
        trips: await TripStorage.record({
          id: session.id,
          destination: session.destination,
          radiusM: session.radiusM,
          armedAt: session.armedAt,
          endedAt: null,
          outcome: 'open',
        }),
      });
      return true;
    } catch (error) {
      log.error('store', 'failed to arm alarm', error);
      // Don't leave half-armed monitors or a stale session behind.
      await ArrivalCoordinator.standDown();
      set({ busy: false, status: 'idle', session: null, error: t('errors.armFailed') });
      return false;
    }
  },

  async cancel() {
    if (get().busy) return;
    const id = get().session?.id;
    set({ busy: true });
    await ArrivalCoordinator.standDown();
    set({
      status: 'idle',
      session: null,
      busy: false,
      error: null,
      trips: await TripStorage.close('cancelled', id),
    });
  },

  async snooze() {
    set({ snoozed: true });
    await ArrivalCoordinator.snooze(SNOOZE_MS);
  },

  async dismissAlarm() {
    const dismissedId = get().session?.id;
    set({ snoozed: false });
    set({ busy: true });

    // A journey with a change carries on. Dismissing the alarm at the transfer
    // is the passenger acknowledging one leg, not ending the trip, so the next
    // leg arms itself rather than making them set it up again on a platform.
    if (await ArrivalCoordinator.advanceLeg(get().position?.coords ?? null)) {
      const next = await AlarmStorage.read();
      set({
        status: 'armed',
        session: next,
        destination: next?.destination ?? null,
        radiusM: next?.radiusM ?? DEFAULT_RADIUS_M,
        distanceM: computeDistance(get().position, next?.destination ?? null),
        stale: false,
        busy: false,
        error: null,
      });
      return;
    }

    await ArrivalCoordinator.standDown();
    // The destination is cleared, unlike a cancel.
    //
    // The trip is the last thing the user experiences, and keeping the pin
    // would drop someone standing ON the platform back onto a card offering to
    // wake them at the station they just reached. "One tap for the return trip"
    // sounded convenient and reads as the app not having noticed they arrived.
    // A clean map is the honest ending.
    set({
      status: 'idle',
      session: null,
      destination: null,
      distanceM: null,
      busy: false,
      error: null,
      // The alarm rang and the user acknowledged it: this trip worked.
      trips: await TripStorage.close('woken', dismissedId),
    });
  },

  onArrival: (session) =>
    set({
      status: 'ringing',
      session,
      destination: session.destination,
      radiusM: session.radiusM,
      // A snooze that has come back around arrives through this same path, so
      // the flag clears here rather than on a timer the UI would have to keep.
      snoozed: false,
    }),
}));
