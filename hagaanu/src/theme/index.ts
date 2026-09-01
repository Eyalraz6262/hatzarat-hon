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

export { palette } from './palette';
export { schemes, night, day, type Scheme, type Surface } from './schemes';
export { useTheme, useSurface } from './useTheme';

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

  /** Assistant — running Hebrew copy. */
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
 * Ten sizes, and every one of them is here — no component sets `fontSize`
 * inline. An earlier pass had twenty distinct sizes once one-off overrides were
 * counted, which is not a scale, it is a pile: two values three pixels apart
 * carry no information and nothing lines up between screens.
 *
 * Three registers, deliberately far apart, because the system has three voices:
 *   display  64 / 52 / 40 / 28 / 20   Heebo, tight tracking — signage
 *   text     17 / 15 / 13             Assistant — Hebrew copy and labels
 *   mono     22 / 11                  Plex Mono — numerals and Latin plates
 *
 * The gap between registers IS the hierarchy. There is very little in between
 * on purpose.
 */
export const type = {
  /** Alarm screen only — the loudest thing in the app. */
  heroAlarm: { fontFamily: fonts.displayBlack, fontSize: 64, lineHeight: 60, letterSpacing: -3.2 },
  /** The wake pass's promise. */
  hero: { fontFamily: fonts.displayBlack, fontSize: 52, lineHeight: 50, letterSpacing: -2.4 },
  display: { fontFamily: fonts.displayBlack, fontSize: 40, lineHeight: 43, letterSpacing: -1.5 },
  title: { fontFamily: fonts.displayBlack, fontSize: 28, lineHeight: 32, letterSpacing: -1 },
  subtitle: { fontFamily: fonts.displayBold, fontSize: 20, lineHeight: 26, letterSpacing: -0.5 },
  /** Buttons speak in the display face — they are signage, not prose. */
  button: { fontFamily: fonts.displayBold, fontSize: 20, letterSpacing: -0.4 },
  heading: { fontFamily: fonts.displayBold, fontSize: 20, lineHeight: 25, letterSpacing: -0.45 },

  body: { fontFamily: fonts.bodyMedium, fontSize: 17, lineHeight: 26 },
  bodyStrong: { fontFamily: fonts.bodyBold, fontSize: 17, lineHeight: 25 },
  buttonSmall: { fontFamily: fonts.bodyBold, fontSize: 17 },
  bodySmall: { fontFamily: fonts.bodyMedium, fontSize: 15, lineHeight: 22 },

  /** Departures-board numerals. */
  readout: { fontFamily: fonts.monoMedium, fontSize: 22, letterSpacing: 0.2 },
  readoutSmall: { fontFamily: fonts.monoMedium, fontSize: 15, letterSpacing: 0.2 },
  /**
   * Latin signage plates — all-caps mono. The wide tracking is what makes them
   * read as signage, and it only works because these are Latin.
   */
  label: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 2 },
  labelStrong: { fontFamily: fonts.monoMedium, fontSize: 11, letterSpacing: 1.8 },
  code: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 0.4 },

  /**
   * Hebrew labels. Assistant, and deliberately NO letter-spacing: tracking
   * breaks word cohesion in Hebrew, which has no letter-spacing tradition to
   * borrow from. Size carries the hierarchy instead.
   */
  labelHe: { fontFamily: fonts.bodyBold, fontSize: 13, letterSpacing: 0 },
  labelHeSmall: { fontFamily: fonts.bodyMedium, fontSize: 13, letterSpacing: 0 },
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

export { mapStyleFor } from './mapStyle';
