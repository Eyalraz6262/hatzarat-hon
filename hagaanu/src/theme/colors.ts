/**
 * The palette for "הגענו?".
 *
 * Every ratio in the comments was computed, not estimated, before the value was
 * written down. The rule the whole thing hangs on:
 *
 *   ONE brand colour carries the interface. Green means the alarm is armed and
 *   nothing else. Red means cancel and nothing else.
 *
 * That discipline is what stops the app looking like a settings panel. The blue
 * appears on exactly one thing per screen — the button you came to press — and
 * everything else is the neutral ramp.
 *
 * The blue is a cobalt with a slight violet lean, deliberately NOT the
 * #6366F1 / #8B5CF6 indigo that every generated app reaches for. It carries
 * white text at 6.09:1 and reads as text on the light ground at 5.73:1, so the
 * same token works as a fill and as a label without a second value.
 */

export type Scheme = {
  name: 'light' | 'dark';

  /** The page. */
  bg: string;
  /** A plane lifted off the page: sheets, cards. */
  surface: string;
  /** A well pressed into a surface: segmented controls, inactive fields. */
  sunk: string;
  /** The sheet's own ground, which sits above the map. */
  sheet: string;

  ink: string;
  inkMuted: string;
  /** Non-text only: separators that need weight, disabled marks. */
  inkFaint: string;

  line: string;
  lineStrong: string;

  /** The brand. One per screen. */
  primary: Tone;
  /** Armed, live, ready. Never decoration. */
  success: Tone;
  /** Cancel and destroy. Never emphasis. */
  danger: Tone;

  /** The arrival screen, which is the brand colour taking the whole display. */
  alarm: { bg: string; on: string; dim: string; line: string };

  map: MapStyle;

  shadow: string;
  scrim: string;
  statusBar: 'light' | 'dark';
};

type Tone = {
  /** The fill. */
  base: string;
  /** The fill while held. */
  pressed: string;
  /** What sits ON the fill. */
  on: string;
  /** The same colour used as text on the page. */
  text: string;
  /** A tint of it, for chips and selected rows. */
  soft: string;
};

type MapStyle = {
  ground: string;
  water: string;
  block: string;
  street: string;
  arterial: string;
  transit: string;
  label: string;
  labelHalo: string;
};

export const light: Scheme = {
  name: 'light',

  bg: '#F7F8FA',
  surface: '#FFFFFF',
  sunk: '#EFF1F5',
  sheet: '#FFFFFF',

  ink: '#111318', //      17.49:1 on bg
  inkMuted: '#5A6270', //  5.79:1 on bg · 6.15:1 on surface
  inkFaint: '#AEB4BF', //  non-text

  line: '#E6E9EF',
  lineStrong: '#D3D8E0',

  primary: {
    base: '#2B4EF0',
    pressed: '#2340D6',
    on: '#FFFFFF', //      6.09:1 on base
    text: '#2B4EF0', //    5.73:1 on bg
    soft: '#E4EAFD',
  },

  success: {
    base: '#0E9E6A',
    pressed: '#0B855A',
    on: '#FFFFFF',
    text: '#08794F', //    5.12:1 on bg — the green is dark when it is TEXT,
    soft: '#E7F6EF', //    because the bright green only passes AA as a fill.
  },

  danger: {
    base: '#C4342A',
    pressed: '#A82A22',
    on: '#FFFFFF',
    text: '#C4342A', //    5.10:1 on bg
    soft: '#FDECEA',
  },

  alarm: {
    bg: '#2B4EF0',
    on: '#FFFFFF', //      6.09:1
    dim: '#D5DDFF', //     4.53:1
    line: 'rgba(255,255,255,0.26)',
  },

  map: {
    ground: '#F1F3F6',
    water: '#DCE5F2',
    block: '#E7EAF0',
    street: '#FFFFFF',
    arterial: '#E1E5ED',
    transit: '#AEB4BF',
    label: '#5A6270',
    labelHalo: '#F1F3F6',
  },

  shadow: '#0B1020',
  scrim: 'rgba(11,16,32,0.42)',
  statusBar: 'dark',
};

export const dark: Scheme = {
  name: 'dark',

  bg: '#0E1116',
  surface: '#171B21',
  sunk: '#0A0D12',
  sheet: '#1A1F27',

  ink: '#EDF0F4', //      16.54:1 on bg
  inkMuted: '#98A2B3', //  7.34:1 on bg · 6.71:1 on surface
  inkFaint: '#4A5361', //  non-text

  line: '#242A33',
  lineStrong: '#333B47',

  primary: {
    base: '#5B8BFF',
    pressed: '#4C79EA',
    on: '#0B1020', //      5.93:1 on base
    text: '#5B8BFF', //    5.93:1 on bg
    soft: 'rgba(91,139,255,0.14)',
  },

  success: {
    base: '#2FD08B',
    pressed: '#27B478',
    on: '#062318',
    text: '#2FD08B', //    9.47:1 on bg
    soft: 'rgba(47,208,139,0.14)',
  },

  danger: {
    base: '#FF7A6E',
    pressed: '#E96A5F',
    on: '#2A0B08',
    text: '#FF7A6E', //    7.44:1 on bg
    soft: 'rgba(255,122,110,0.14)',
  },

  alarm: {
    bg: '#2B4EF0',
    on: '#FFFFFF',
    dim: '#D5DDFF',
    line: 'rgba(255,255,255,0.26)',
  },

  map: {
    ground: '#10141A',
    water: '#111A28',
    block: '#161B23',
    street: '#1B212A',
    arterial: '#222935',
    transit: '#4A5361',
    label: '#98A2B3',
    labelHalo: '#10141A',
  },

  shadow: '#000000',
  scrim: 'rgba(0,0,0,0.58)',
  statusBar: 'light',
};

export const schemes = { light, dark };
