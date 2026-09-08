import type { Destination, LatLng } from '../../types';
import { distanceMeters } from '../../utils/geo';

/**
 * The approach — what the armed screen draws.
 *
 * This replaces a rail of transit stops, and the reason is worth keeping.
 * That rail asked OpenStreetMap for stops within 450 m of the STRAIGHT LINE
 * between the passenger and their destination, then counted them and put the
 * count on screen as the headline: "3 stops to go". It was wrong four ways at
 * once. A bus does not travel in a straight line. A train passes bus stops at
 * 100 km/h without stopping. Even on the right vehicle, a line does not serve
 * every stop near its path, and a shuttle serves none. And the list was capped
 * at seven and sampled evenly, so the number counted a thinned subset of an
 * already-wrong set.
 *
 * None of it was ever used to fire the alarm — that is the geofence and the
 * position stream — but it was the largest thing on the screen, which made a
 * guess look like the most certain fact in the app.
 *
 * So this model contains only things that are measured:
 *
 *   where you are           GPS
 *   where the destination   you chose it
 *   the distance between    computed from those two
 *   the wake radius         you chose that too
 *
 * There is no route, no vehicle, no line and no stop sequence here, because
 * the app does not know any of them.
 */

/**
 * How close the passenger is, in the terms the screen changes on.
 *
 *   far       most of the trip. The screen should be almost empty: there is
 *             nothing to do and nothing to read, and a screen that insists on
 *             being looked at during that stretch is a screen that gets
 *             turned off before the part that matters.
 *   closing   the wake ring is now a real fraction of the visible scale, so
 *             it can be drawn honestly and is worth drawing.
 *   arriving  inside the ring, or as near as makes no difference.
 */
export type Phase = 'far' | 'closing' | 'arriving';

/**
 * The gauge shows the last `radiusM * WINDOW` metres.
 *
 * Ten, so the wake band is always a tenth of the height — thin enough to read
 * as a threshold rather than a zone, thick enough to see at a glance in the
 * dark. Any window wide enough to contain a whole intercity trip would draw a
 * 500 m ring as a hairline, and the one mark that matters would be the one
 * nobody could see.
 */
const WINDOW = 10;

export function gaugeWindowM(radiusM: number): number {
  return radiusM * WINDOW;
}

export function phaseOf(hereM: number | null, radiusM: number): Phase {
  if (hereM === null) return 'far';
  if (hereM <= radiusM * 1.08) return 'arriving';
  return hereM <= gaugeWindowM(radiusM) ? 'closing' : 'far';
}

/**
 * Where a distance sits on the gauge: 0 at the top of the window, 1 at the
 * destination. Anything beyond the window clamps to the top rather than
 * running off it.
 */
export function positionOf(metres: number, windowM: number): number {
  if (windowM <= 0) return 1;
  return 1 - Math.min(Math.max(metres, 0), windowM) / windowM;
}

/** One target on the gauge. A journey with a change has two. */
export type Mark = {
  id: string;
  label: string;
  /** Metres from the final destination. Zero for the destination itself. */
  atM: number;
  /** The wake radius around it. */
  radiusM: number;
  /** True once the passenger is past it. */
  done: boolean;
};

export type Approach = {
  phase: Phase;
  /** Metres to the target being watched right now. Null before the first fix. */
  hereM: number | null;
  /** Metres to the FINAL destination, which is a different number mid-journey. */
  finalM: number | null;
  windowM: number;
  /** 0 at the top of the window, 1 at the destination. Null with no fix. */
  herePosition: number | null;
  marks: Mark[];
};

/**
 * Builds the approach for the leg currently being watched.
 *
 * `target` is what the alarm is armed on right now — the transfer on the first
 * leg of a journey with a change, the destination otherwise. The gauge is
 * always about the NEXT time we will wake you, because that is the only thing
 * the passenger has to decide anything about.
 */
export function buildApproach(
  here: LatLng | null,
  target: Destination,
  radiusM: number,
  /** Legs still to come after this one. Drawn, but not what the gauge scales to. */
  remaining: { destination: Destination; radiusM: number }[] = []
): Approach {
  const hereM = here ? distanceMeters(here, target.coords) : null;
  const windowM = gaugeWindowM(radiusM);

  const final = remaining.length ? remaining[remaining.length - 1].destination : target;
  const finalM = here ? distanceMeters(here, final.coords) : null;

  const marks: Mark[] = [
    {
      id: 'target',
      label: target.label,
      atM: remaining.length ? distanceMeters(target.coords, final.coords) : 0,
      radiusM,
      done: false,
    },
    ...remaining.map((leg, index) => ({
      id: `leg-${index}`,
      label: leg.destination.label,
      atM: distanceMeters(leg.destination.coords, final.coords),
      radiusM: leg.radiusM,
      done: false,
    })),
  ];

  return {
    phase: phaseOf(hereM, radiusM),
    hereM,
    finalM,
    windowM,
    herePosition: hereM === null ? null : positionOf(hereM, windowM),
    marks,
  };
}
