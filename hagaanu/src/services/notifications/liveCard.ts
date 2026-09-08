import { t } from '../../i18n';
import { formatDistance } from '../../utils/geo';

/**
 * The three strings the lock-screen card shows.
 *
 * Built here, in JavaScript, rather than in Swift — which is the whole reason
 * the native side takes strings instead of numbers. The app ships in four
 * languages, two of them right-to-left, with rounding rules that already exist
 * in `formatDistance`. Re-implementing any of that on the other side of the
 * bridge would give us a lock screen that slowly drifts from the app it
 * belongs to, and no test would catch the drift.
 */
export type LiveCard = {
  distance: string;
  stops: string;
  staleText: string;
};

export function liveCard(distanceM: number | null, stopsToGo: number | null): LiveCard {
  return {
    distance: distanceM === null ? '' : formatDistance(distanceM),
    // Empty rather than "0 stops": a card with no stop list should say nothing
    // about stops, not claim there are none left.
    stops:
      stopsToGo === null || stopsToGo <= 0
        ? ''
        : stopsToGo === 1
          ? t('active.liveStopsOne')
          : t('active.liveStops', { n: String(stopsToGo) }),
    staleText: t('active.noSignal'),
  };
}
