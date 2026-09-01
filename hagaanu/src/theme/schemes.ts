import { palette } from './palette';

/**
 * Two colour schemes, night and day.
 *
 * The unusual shape here is deliberate and specific to this design: the app has
 * TWO materials on screen at once — the ink world of the map, and the paper of
 * the ticket docked over it. A single flat `textPrimary` token would be wrong on
 * one of them. So each scheme carries two SURFACE sets, and a component asks for
 * the surface it is drawn on rather than for a global role.
 *
 *   world   the map, its chrome, the permission board
 *   ticket  every paper surface — the stub, the wake pass
 *
 * What the scheme swaps is what those two materials ARE:
 *
 *   night   ink world, paper ticket        (the unlit carriage at 23:00)
 *   day     counter world, bright ticket   (the lit platform at 07:00)
 *
 * Day is not an inversion. It is the same two objects under different light: a
 * paper ticket lying on a warmer, heavier counter stock, separated by value and
 * the perforation rather than by a jump to a dark ground.
 */

export type Surface = {
  bg: string;
  raised: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  /** Control outlines and segment dividers — a drawn line, not a hairline. */
  border: string;
  /** Hairline rules between rows. */
  divider: string;
  /** Perforations, dotted leaders, watermarks. Non-text, so unconstrained. */
  faint: string;
  pressed: string;
};

export type Scheme = {
  name: 'night' | 'day';
  world: Surface;
  ticket: Surface;
  accent: {
    base: string;
    pressed: string;
    /** Text set in the accent ON A PAPER GROUND. See palette.signalOnPaper. */
    onPaper: string;
    /** What sits on top of an accent fill. */
    contrast: string;
    soft: string;
  };
  /** The alarm flood is identical in both schemes: it is not a theme, it is an event. */
  alarm: { bg: string; ink: string; line: string; muted: string };
  map: {
    ground: string;
    water: string;
    block: string;
    street: string;
    arterial: string;
    rail: string;
    station: string;
    stationMinor: string;
    label: string;
  };
  scrim: string;
  scrimStrong: string;
  /** What the OS status bar should draw in over this scheme's world. */
  statusBar: 'light' | 'dark';
};

const alarm = {
  bg: palette.signal,
  ink: palette.ink,
  line: 'rgba(20,22,28,0.28)',
  muted: 'rgba(20,22,28,0.62)',
} as const;

export const night: Scheme = {
  name: 'night',
  world: {
    bg: palette.ink,
    raised: palette.inkRaised,
    textPrimary: palette.paper,
    textSecondary: palette.railLight,
    textMuted: palette.rail,
    border: palette.inkLineStrong,
    divider: palette.inkLine,
    faint: palette.railFaint,
    pressed: palette.inkLine,
  },
  ticket: {
    bg: palette.paper,
    raised: palette.paperShade,
    textPrimary: palette.ink,
    textSecondary: palette.paperSub,
    textMuted: palette.paperMuted,
    border: palette.ink,
    divider: palette.paperRule,
    faint: palette.paperFaint,
    pressed: palette.paperShade,
  },
  accent: {
    base: palette.signal,
    pressed: palette.signalDeep,
    onPaper: palette.signalOnPaper,
    contrast: palette.ink,
    soft: palette.signalSoft,
  },
  alarm,
  map: {
    ground: palette.mapGroundNight,
    water: palette.mapWaterNight,
    block: palette.mapBlockNight,
    street: palette.mapStreetNight,
    arterial: palette.mapArterialNight,
    rail: palette.rail,
    station: palette.railLight,
    stationMinor: palette.inkLineStrong,
    label: palette.rail,
  },
  scrim: 'rgba(20,22,28,0.72)',
  scrimStrong: 'rgba(20,22,28,0.85)',
  statusBar: 'light',
};

export const day: Scheme = {
  name: 'day',
  world: {
    bg: palette.counter,
    raised: palette.counterRaised,
    textPrimary: palette.ink,
    textSecondary: palette.counterInk,
    textMuted: palette.counterMuted,
    border: palette.counterInk,
    divider: palette.counterLine,
    faint: palette.counterLine,
    pressed: palette.counterRaised,
  },
  ticket: {
    bg: palette.paperBright,
    raised: palette.paper,
    textPrimary: palette.ink,
    textSecondary: palette.counterInk,
    textMuted: palette.paperMuted,
    border: palette.ink,
    divider: palette.paperWatermark,
    faint: palette.paperFaint,
    pressed: palette.paper,
  },
  accent: {
    base: palette.signal,
    pressed: palette.signalDeep,
    onPaper: palette.signalOnPaper,
    contrast: palette.ink,
    soft: palette.signalSoft,
  },
  alarm,
  map: {
    ground: palette.mapGroundDay,
    water: palette.mapWaterDay,
    block: palette.mapBlockDay,
    street: palette.mapStreetDay,
    arterial: palette.mapArterialDay,
    rail: palette.counterInk,
    station: palette.ink,
    stationMinor: palette.counterLine,
    label: palette.counterInk,
  },
  scrim: 'rgba(20,22,28,0.55)',
  scrimStrong: 'rgba(20,22,28,0.70)',
  statusBar: 'dark',
};

export const schemes = { night, day } as const;
