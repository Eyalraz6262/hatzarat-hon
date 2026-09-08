import { useEffect } from 'react';

import { DemoTrip } from '../services/location/LocationService.web';
import { useAlarmStore } from '../state/useAlarmStore';

/**
 * Drives the simulated journey in the browser.
 *
 * Choosing a destination places the traveller far enough out that the armed
 * screen starts in its "far" state; arming sets them moving. From there
 * nothing here is involved: the positions flow into the same store, the same
 * watchdog and the same arrival coordinator a phone uses, and the alarm fires
 * because the real rules decided it should.
 *
 * Standing down puts them back at the start, so the demo can be run again
 * without a reload.
 */
export function useDemoTrip(): void {
  const status = useAlarmStore((state) => state.status);
  const destination = useAlarmStore((state) => state.destination);
  const radiusM = useAlarmStore((state) => state.radiusM);

  useEffect(() => {
    if (!destination) {
      DemoTrip.stop();
      return;
    }
    if (status === 'idle') DemoTrip.place(destination.coords, radiusM);
  }, [destination, radiusM, status]);

  useEffect(() => {
    if (status === 'armed' && destination) DemoTrip.start(destination.coords, radiusM);
    if (status === 'idle') DemoTrip.stop();
  }, [status, destination, radiusM]);
}

export const IS_DEMO = true;
