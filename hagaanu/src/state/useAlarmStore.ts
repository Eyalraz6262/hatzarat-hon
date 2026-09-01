import { create } from 'zustand';

import { DEFAULT_RADIUS_M } from '../constants/config';
import { AlarmService } from '../services/alarm/AlarmService';
import { ArrivalCoordinator } from '../services/alarm/ArrivalCoordinator';
import { GeofencingService } from '../services/geofencing/GeofencingService';
import { LocationService } from '../services/location/LocationService';
import { NotificationService } from '../services/notifications/NotificationService';
import { AlarmStorage } from '../services/storage/AlarmStorage';
import { SavedStorage, type SavedDestination, type SavedKind } from '../services/storage/SavedStorage';
import { usePermissionsStore } from './usePermissionsStore';
import type { AlarmSession, AlarmStatus, Destination, PositionSample } from '../types';
import { distanceMeters, formatDistance } from '../utils/geo';
import { log } from '../utils/logger';

type AlarmState = {
  status: AlarmStatus;
  /** Where the user wants to wake up. Null until they pick something. */
  destination: Destination | null;
  radiusM: number;
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

  setDestination: (destination: Destination | null) => void;
  setRadius: (radiusM: number) => void;
  setPosition: (position: PositionSample) => void;
  setError: (error: string | null) => void;

  /** Rehydrates from disk — call once at boot, before the first render matters. */
  hydrate: () => Promise<void>;
  saveCurrent: (name: string, kind: SavedKind) => Promise<void>;
  useSaved: (item: SavedDestination) => Promise<void>;
  removeSaved: (id: string) => Promise<void>;
  arm: () => Promise<boolean>;
  cancel: () => Promise<void>;
  dismissAlarm: () => Promise<void>;
  /** Applied when a background task decides we arrived while the UI is mounted. */
  onArrival: (session: AlarmSession) => void;
};

function computeDistance(position: PositionSample | null, destination: Destination | null): number | null {
  if (!position || !destination) return null;
  return distanceMeters(position.coords, destination.coords);
}

export const useAlarmStore = create<AlarmState>((set, get) => ({
  status: 'idle',
  destination: null,
  radiusM: DEFAULT_RADIUS_M,
  position: null,
  distanceM: null,
  session: null,
  busy: false,
  error: null,
  saved: [],

  setDestination: (destination) =>
    set((state) => ({
      destination,
      error: null,
      distanceM: computeDistance(state.position, destination),
    })),

  setRadius: (radiusM) => set({ radiusM }),

  setPosition: (position) =>
    set((state) => ({
      position,
      distanceM: computeDistance(position, state.destination),
    })),

  setError: (error) => set({ error }),

  async hydrate() {
    set({ saved: await SavedStorage.readAll() });

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

  async removeSaved(id) {
    set({ saved: await SavedStorage.remove(id) });
  },

  async arm() {
    const { destination, radiusM, position } = get();
    if (!destination || get().busy) return false;

    set({ busy: true, error: null });

    try {
      const distance = computeDistance(position, destination) ?? Number.POSITIVE_INFINITY;
      const tier = LocationService.tierForDistance(distance);

      // Both OS geofencing and the background stream require "Always" location.
      // If the user declined it we still arm — the foreground watcher can fire
      // the alarm while the app is open — but we don't pretend otherwise.
      const foregroundOnly =
        usePermissionsStore.getState().snapshot.backgroundLocation !== 'granted';

      const session: AlarmSession = {
        id: `${Date.now()}`,
        destination,
        radiusM,
        status: 'armed',
        armedAt: Date.now(),
        triggeredAt: null,
        triggeredBy: null,
        pollingTierId: tier.id,
        statusDistanceLabel: null,
        foregroundOnly,
      };

      // Persist before starting the monitors: if the OS wakes the geofence task
      // a millisecond later, the session must already be readable from disk.
      await AlarmStorage.write(session);

      if (!foregroundOnly) {
        await GeofencingService.start(destination, radiusM);
        await LocationService.startBackgroundTracking(tier);
      }
      await NotificationService.presentArmedStatus(destination.label, formatDistance(radiusM));

      AlarmService.confirmationBuzz();
      set({ status: 'armed', session, busy: false });
      return true;
    } catch (error) {
      log.error('store', 'failed to arm alarm', error);
      // Don't leave half-armed monitors or a stale session behind.
      await ArrivalCoordinator.standDown();
      set({ busy: false, status: 'idle', session: null, error: 'errors.geofenceFailed' });
      return false;
    }
  },

  async cancel() {
    if (get().busy) return;
    set({ busy: true });
    await ArrivalCoordinator.standDown();
    set({ status: 'idle', session: null, busy: false, error: null });
  },

  async dismissAlarm() {
    set({ busy: true });
    await ArrivalCoordinator.standDown();
    // The destination is cleared, unlike a cancel.
    //
    // The trip is the last thing the user experiences, and keeping the pin
    // would drop someone standing ON the platform back onto a card offering to
    // wake them at the station they just reached. "One tap for the return trip"
    // sounded convenient and reads as the app not having noticed they arrived.
    // A clean map is the honest ending.
    set({ status: 'idle', session: null, destination: null, distanceM: null, busy: false, error: null });
  },

  onArrival: (session) =>
    set({
      status: 'ringing',
      session,
      destination: session.destination,
      radiusM: session.radiusM,
    }),
}));
