/**
 * Design tokens for "הגענו?" — the "כרטיס נסיעה" system.
 *
 * The language comes from Israeli rail signage and the printed travel ticket:
 * ink for the world, paper for anything the passenger holds, and a single
 * signal orange that is spent once per screen. Three rules hold it together
 * and every value below serves one of them:
 *
 *   1. Square corners only. Signage does not round corners.
 *   2. One orange per screen — it is the primary action, or the status mark,
 *      or (on the alarm) the entire surface. Never two.
 *   3. No emoji. Every mark is drawn — see src/components/icons.
 */

export const colors = {
  /** The world: map, chrome, anything behind the ticket. */
  ink: '#14161C',
  inkRaised: '#1C1F28',
  /** Water and recessed areas on the map. */
  inkDeep: '#101219',
  inkLine: '#2A2E3A',
  inkLineStrong: '#3D4351',

  /** Rail greys — the map's line work and secondary text on ink. */
  rail: '#6B7280',
  railLight: '#9AA1AE',

  /** Paper: every surface the passenger "holds". */
  paper: '#F2EDE4',
  /** Oversized watermark shapes printed into the paper. */
  paperWatermark: '#E6DFD1',
  paperShade: '#E4DDD0',
  /** Hairline rules between rows on paper. */
  paperRule: '#E0D9CB',
  /** Perforations and dotted leaders. */
  paperPerf: '#C9C1B2',
  /** Labels on paper. */
  paperMuted: '#A79E8E',
  /** Secondary text on paper. */
  paperSub: '#8C8478',

  /** The one accent. Rationed — see rule 2. */
  signal: '#FF6B1A',
  signalDeep: '#E05A0F',

  /** Translucent inks, for shadows and scrims over the map. */
  scrim: 'rgba(20,22,28,0.72)',
  /** Behind type that sits directly on the map, where there is no surface. */
  scrimStrong: 'rgba(20,22,28,0.85)',
  inkOnSignal: 'rgba(20,22,28,0.62)',
  inkOnSignalLine: 'rgba(20,22,28,0.28)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

/**
 * There is deliberately no `radii` token.
 *
 * Every structural surface in this system is square — that single decision is
 * what stopped the screens reading as a generic card template. The only round
 * things in the app are station nodes and perforation punches, which are
 * circles by nature and take an explicit `borderRadius` equal to half their
 * size at the point of use.
 */

/**
 * Type faces.
 *
 * Weight is always expressed by choosing a face, never by `fontWeight` —
 * Android does not synthesise weights for a named family and would silently
 * fall back to the system font.
 */
export const fonts = {
  /** Heebo — headline voice. Heavy, tight, signage-like. */
  displayBlack: 'Heebo_900Black',
  displayBold: 'Heebo_800ExtraBold',
  displaySemi: 'Heebo_700Bold',

  /** Assistant — running Hebrew copy. */
  body: 'Assistant_400Regular',
  bodyMedium: 'Assistant_600SemiBold',
  bodyBold: 'Assistant_700Bold',

  /**
   * IBM Plex Mono — numerals and Latin codes only, set like a departures board.
   *
   * It has NO Hebrew coverage. Hebrew set in it falls back to a system face
   * without warning, so `type.label` (mono) is for Latin and digits and
   * `type.labelHe` is for Hebrew. Never swap them.
   */
  mono: 'IBMPlexMono_400Regular',
  monoMedium: 'IBMPlexMono_500Medium',
} as const;

/**
 * The type scale.
 *
 * Two voices, deliberately far apart: display sizes are enormous and tightly
 * tracked, labels are tiny mono with wide letter-spacing. The gap between them
 * is the hierarchy — there is very little in the middle.
 */
export const type = {
  /** The one big statement on a screen. */
  hero: { fontFamily: fonts.displayBlack, fontSize: 62, lineHeight: 58, letterSpacing: -3 },
  /** Alarm screen only. */
  heroAlarm: { fontFamily: fonts.displayBlack, fontSize: 74, lineHeight: 67, letterSpacing: -3.6 },
  display: { fontFamily: fonts.displayBlack, fontSize: 44, lineHeight: 46, letterSpacing: -1.6 },
  title: { fontFamily: fonts.displayBlack, fontSize: 32, lineHeight: 35, letterSpacing: -1.1 },
  subtitle: { fontFamily: fonts.displayBold, fontSize: 21, lineHeight: 26, letterSpacing: -0.5 },
  heading: { fontFamily: fonts.displayBold, fontSize: 19, lineHeight: 24, letterSpacing: -0.45 },

  body: { fontFamily: fonts.bodyMedium, fontSize: 16, lineHeight: 25 },
  bodySmall: { fontFamily: fonts.bodyMedium, fontSize: 14, lineHeight: 21 },
  bodyStrong: { fontFamily: fonts.bodyBold, fontSize: 16, lineHeight: 24 },

  /** Buttons speak in the display face — they are signage, not prose. */
  button: { fontFamily: fonts.displayBold, fontSize: 20, letterSpacing: -0.4 },
  buttonSmall: { fontFamily: fonts.bodyBold, fontSize: 16 },

  /** Departures-board numerals. */
  readout: { fontFamily: fonts.monoMedium, fontSize: 22, letterSpacing: 0.2 },
  readoutSmall: { fontFamily: fonts.monoMedium, fontSize: 17, letterSpacing: 0.2 },
  /**
   * Latin signage labels — all-caps mono. The wide tracking is what makes them
   * read as signage, and it only works because these are Latin.
   */
  label: { fontFamily: fonts.mono, fontSize: 10.5, letterSpacing: 2 },
  labelStrong: { fontFamily: fonts.monoMedium, fontSize: 11.5, letterSpacing: 1.8 },
  code: { fontFamily: fonts.mono, fontSize: 11.5, letterSpacing: 0.4 },

  /**
   * Hebrew labels. Assistant, and deliberately NO letter-spacing: tracking
   * breaks word cohesion in Hebrew, which has no letter-spacing tradition to
   * borrow from. Size carries the hierarchy instead.
   */
  labelHe: { fontFamily: fonts.bodyBold, fontSize: 13, letterSpacing: 0 },
  labelHeSmall: { fontFamily: fonts.bodyMedium, fontSize: 12.5, letterSpacing: 0 },
} as const;

/**
 * Minimum touch target. Every pressable in the app is at least this tall —
 * checked rather than assumed, because signage-style square controls make it
 * easy to draw something that looks right and is too small to hit.
 */
export const HIT_SIZE = 48;

/**
 * Ceiling for the display faces under OS font scaling.
 *
 * Body copy is deliberately left unclamped — scaling it is the entire point of
 * the setting. But the display sizes here start at 44px and reach 74px, and at
 * a 2x system scale a headline alone would fill the screen. 1.3 keeps them
 * legible-but-bounded; the screens that carry long copy scroll instead.
 */
export const MAX_DISPLAY_SCALE = 1.3;

export { darkMapStyle } from './mapStyle';
