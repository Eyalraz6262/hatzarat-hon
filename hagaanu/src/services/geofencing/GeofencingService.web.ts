import type { Destination } from '../../types';
import { log } from '../../utils/logger';

/**
 * Geofencing, in a browser: there is none.
 *
 * This is not a gap the demo papers over — it is the reason the web build can
 * never be the product. An OS geofence is what wakes a terminated process when
 * you cross into the region, and no browser API does that. The tab must be
 * open and running for anything here to happen at all.
 *
 * It reports itself active so the process guard does not spend the demo trying
 * to repair something that was never broken and cannot be built.
 */
export const GeofencingService = {
  async isActive(): Promise<boolean> {
    return true;
  },
  async start(destination: Destination, radiusM: number): Promise<void> {
    log.debug('geofence', `web demo: no OS region for ${destination.label} r=${radiusM}m`);
  },
  async stop(): Promise<void> {},
};
