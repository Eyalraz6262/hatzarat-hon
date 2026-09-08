import { t } from '../../i18n';
import { formatDistance } from '../../utils/geo';

/**
 * The two strings the lock-screen card shows.
 *
 * Built here, in JavaScript, rather than in Swift — which is the whole reason
 * the native side takes strings instead of numbers. The app ships in four
 * languages, two of them right-to-left, with distance rounding that already
 * exists in `formatDistance`. Re-implementing any of that on the other side of
 * the bridge would give us a lock screen that slowly drifts from the app it
 * belongs to, and no test would catch the drift.
 *
 * The card once carried a stop count as well. It was removed with the rest of
 * that feature: the app has no idea which stops a vehicle serves, and a number
 * on a lock screen is read as a fact.
 */
export type LiveCard = {
  distance: string;
  note: string;
  staleText: string;
};

export function liveCard(distanceM: number | null, radiusM: number): LiveCard {
  return {
    distance: distanceM === null ? '' : formatDistance(distanceM),
    // What the card says under the destination: not where you are, but what we
    // will do — which is the thing the passenger locked their phone on.
    note: t('approach.preview', { distance: formatDistance(radiusM) }),
    staleText: t('active.noSignal'),
  };
}
