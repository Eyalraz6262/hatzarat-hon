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
 * The brand is a plum-violet, and the hue was chosen against the MAP rather
 * than against a mood board. A map already spends blue twice — the water, and
 * the "you are here" dot that every mapping SDK on both platforms draws in it.
 * The cobalt this replaced sat 15° from that dot, which made the wake ring and
 * the passenger the same colour on the one screen where telling them apart is
 * the entire point. This sits 63° away and cannot be confused with either.
 *
 * It is deliberately not one of the #6366F1 / #7C3AED / #8B5CF6 violets every
 * generated app reaches for: deeper, less saturated, and a specific value
 * rather than a framework default.
 *
 * Being dark is a feature, not a compromise. The arrival screen is a full bleed
 * of this colour seen at three in the morning by someone who has just been
 * woken, and a bright screen at that moment is unkind. White on it is 8.82:1,
 * which is comfortably readable without being a flashlight.
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
  /**
   * Cartography, for the browser demo's drawn map.
   *
   * Desaturated on purpose. A map is the backdrop the alert ring and the
   * destination pin sit on, and a convincing sea-blue would fight the one
   * brand colour for attention — on the screen where that colour is doing the
   * most work. Land is a shade off the page so the coast reads as an edge
   * rather than a border.
   */
  water: string;
  land: string;
  coast: string;

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
  water: '#C2D3E5',
  land: '#EFF2F7',
  coast: '#9FB2C7',

  primary: {
    base: '#6A2C91',
    pressed: '#5A2479',
    on: '#FFFFFF', //      8.82:1 on base
    text: '#6A2C91', //    8.30:1 on bg · 8.82:1 on surface
    soft: '#F0E7F7', //    7.34:1 for the text on this tint
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
    bg: '#6A2C91',
    on: '#FFFFFF', //      8.82:1
    dim: '#E2D0F0', //     6.09:1
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
  water: '#080C12',
  land: '#1C222B',
  coast: '#333D4A',

  primary: {
    base: '#B69CFF',
    pressed: '#A084F0',
    on: '#1C0B2E', //      8.08:1 on base
    text: '#B69CFF', //    8.27:1 on bg
    soft: 'rgba(182,156,255,0.15)',
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
    bg: '#6A2C91',
    on: '#FFFFFF',
    dim: '#E2D0F0',
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
