import AsyncStorage from '@react-native-async-storage/async-storage';

import { log } from '../../utils/logger';
import {
  closeTrip,
  normaliseTrips,
  withTrip,
  type Trip,
  type TripOutcome,
} from './trips';

export { orderTrips } from './trips';
export type { Trip, TripOutcome } from './trips';

const KEY = '@hagaanu/trips/v1';

/**
 * Trip history on the device, and nowhere else.
 *
 * Every write returns the new list so the store can `set` it directly rather
 * than reading back — one round trip instead of two, and no window in which
 * the screen and the disk disagree.
 */
export const TripStorage = {
  async readAll(): Promise<Trip[]> {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      return raw ? normaliseTrips(JSON.parse(raw)) : [];
    } catch (error) {
      log.warn('store', 'trip history unreadable', error);
      return [];
    }
  },

  async write(trips: Trip[]): Promise<void> {
    try {
      await AsyncStorage.setItem(KEY, JSON.stringify(trips));
    } catch (error) {
      log.warn('store', 'trip history unwritable', error);
    }
  },

  /** Called the moment an alarm is armed. */
  async record(trip: Trip): Promise<Trip[]> {
    const next = withTrip(await TripStorage.readAll(), trip);
    await TripStorage.write(next);
    return next;
  },

  /** Called when the alarm rings and is dismissed, or when it is stood down. */
  async close(
    outcome: Exclude<TripOutcome, 'open'>,
    id?: string
  ): Promise<Trip[]> {
    const next = closeTrip(await TripStorage.readAll(), outcome, Date.now(), id);
    await TripStorage.write(next);
    return next;
  },

  async clear(): Promise<Trip[]> {
    await TripStorage.write([]);
    return [];
  },
};
