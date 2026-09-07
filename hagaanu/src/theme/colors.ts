/**
 * Colour, for the "קו" system.
 *
 * Two schemes, built from semantic roles rather than material names. Every
 * text value below was solved against its own ground rather than picked by
 * eye: the ratios are in the comments and the check is reproducible.
 *
 * The accent behaves identically in both schemes, and that is the one thing
 * to preserve if this file is ever edited: the green is a FILL, and what sits
 * on it is dark ink, never white. White on a green this fresh measures
 * 3.24:1, and the usual fix is to darken the green until white works, which
 * costs the colour its whole character. Dark-on-green keeps the green and
 * clears AA at 5.04:1 in light and 7.53:1 in dark.
 */

export type Scheme = {
  name: 'light' | 'dark';

  /** The page. */
  bg: string;
  /** A raised plane on the page: cards, the sheet. */
  surface: string;
  /** A recess in the page: inputs, the unfilled part of a meter. */
  sunk: string;

  /** Body and headings. */
  ink: string;
  /** Secondary copy, row labels, timings. Clears AA on bg AND on surface. */
  inkMuted: string;
  /** Non-text only: inactive rail track, dividers, disabled marks. */
  inkFaint: string;

  line: string;
  lineStrong: string;

  accent: {
    /** Fills: the CTA, the travelled rail, the live node. */
    base: string;
    pressed: string;
    /** What sits ON a base fill. Dark ink, never white. See the note above. */
    on: string;
    /** The accent as TEXT on bg or surface. A different value on purpose. */
    text: string;
    /** A tinted ground for the accent's own text. */
    soft: string;
  };

  danger: string;

  /** The alarm flood. Identical in both schemes: it is an event, not a surface. */
  alarm: { bg: string; ink: string; dim: string; line: string };

  map: {
    ground: string;
    water: string;
    block: string;
    street: string;
    arterial: string;
    transit: string;
    label: string;
    labelHalo: string;
  };

  /** iOS shadow colour. Paired with an Android elevation in `elevation`. */
  shadow: string;
  scrim: string;
  statusBar: 'light' | 'dark';
};

/** The alarm is the same object at 02:00 and at 14:00. */
const alarm = {
  bg: '#0EA36F',
  ink: '#06251A',
  dim: 'rgba(6,37,26,0.66)',
  line: 'rgba(6,37,26,0.22)',
} as const;

export const light: Scheme = {
  name: 'light',

  bg: '#F6F6F3',
  surface: '#FFFFFF',
  sunk: '#EDEDE8',

  ink: '#14171A', //      16.62:1 on bg
  inkMuted: '#5C6368', //  5.64:1 on bg · 6.11:1 on surface
  inkFaint: '#B4B8B4', //  non-text

  line: '#E3E4DF',
  lineStrong: '#CFD1CA',

  accent: {
    base: '#0EA36F',
    pressed: '#0B8A5D',
    on: '#06251A', //      5.04:1 on base
    text: '#0B7A54', //    4.94:1 on bg · 5.35:1 on surface · 4.79:1 on soft
    soft: '#EAF5F0',
  },

  danger: '#C4342A', //    5.01:1 on bg

  alarm,

  map: {
    ground: '#EDEDE7',
    water: '#DCE4E4',
    block: '#E4E4DC',
    street: '#F6F6F3',
    arterial: '#DCDCD2',
    transit: '#A9AFA6',
    label: '#5C6368',
    labelHalo: '#EDEDE7',
  },

  shadow: '#14171A',
  scrim: 'rgba(20,23,26,0.42)',
  statusBar: 'dark',
};

export const dark: Scheme = {
  name: 'dark',

  bg: '#0F1315',
  surface: '#171C1F',
  sunk: '#0A0D0F',

  ink: '#ECEFEE', //      16.14:1 on bg
  inkMuted: '#98A1A4', //  7.09:1 on bg · 6.52:1 on surface
  inkFaint: '#4A5356', //  non-text

  line: '#242B2F',
  lineStrong: '#333C40',

  accent: {
    base: '#22C88A',
    pressed: '#1BAA75',
    on: '#06251A', //      7.53:1 on base
    text: '#3FD69B', //   10.05:1 on bg
    soft: 'rgba(34,200,138,0.12)',
  },

  danger: '#FF7A6E', //    7.35:1 on bg

  alarm,

  map: {
    ground: '#0F1315',
    water: '#0A1114',
    block: '#151B1E',
    street: '#1A2225',
    arterial: '#232C30',
    transit: '#4A5356',
    label: '#98A1A4',
    labelHalo: '#0F1315',
  },

  shadow: '#000000',
  scrim: 'rgba(0,0,0,0.6)',
  statusBar: 'light',
};

export const schemes = { light, dark } as const;
