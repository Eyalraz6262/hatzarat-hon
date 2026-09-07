import { Platform, useColorScheme, type TextStyle, type ViewStyle } from 'react-native';

import { dark, light, type Scheme } from './colors';

export { light, dark, schemes, type Scheme } from './colors';
export { mapStyleFor } from './mapStyle';

/**
 * Design tokens for "הגענו?" — the "קו" system.
 *
 * The app has one job and one screen that matters, and the person using it is
 * holding the phone in one hand, half asleep, on a moving bus. Every value
 * here answers to that: nothing needs a precise finger, nothing needs reading
 * twice, and the primary action always sits in the bottom third.
 *
 * The organising idea is the ROUTE. The signature object is a vertical rail of
 * stops that the passenger travels down, and the whole system exists to keep
 * that rail legible: one accent for "where you have been and where we wake
 * you", one neutral ramp for everything else, and no decoration competing
 * with it.
 */

export function useTheme(): Scheme {
  return useColorScheme() === 'dark' ? dark : light;
}

/* ------------------------------------------------------------------ *
 * Space
 * ------------------------------------------------------------------ */

/** 4pt grid. Screen padding is `screen`, picked once and never varied. */
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
  screen: 20,
} as const;

/* ------------------------------------------------------------------ *
 * Shape
 * ------------------------------------------------------------------ */

/**
 * One radius scale, applied by role. `control` for anything you press that is
 * not a pill, `card` for a raised plane, `sheet` for the plane docked to an
 * edge, `pill` for the primary action and for status chips.
 *
 * A pill CTA and a rounded-rectangle CTA on two screens of the same app is
 * the shape drift that makes an interface feel assembled rather than designed,
 * so the roles below are the whole vocabulary.
 */
export const radius = {
  control: 12,
  card: 18,
  sheet: 24,
  pill: 999,
} as const;

/* ------------------------------------------------------------------ *
 * Type
 * ------------------------------------------------------------------ */

/**
 * Two families, each with a job.
 *
 *   Heebo      display, numerals, anything structural
 *   Assistant  running copy — the permission screens have real paragraphs
 *
 * Weight is always a face, never `fontWeight`: Android does not synthesise
 * weights for a named family and silently falls back to the system font.
 */
export const fonts = {
  displayBlack: 'Heebo_800ExtraBold',
  displayBold: 'Heebo_700Bold',
  displayMedium: 'Heebo_500Medium',
  bodyBold: 'Assistant_700Bold',
  bodyMedium: 'Assistant_500Medium',
} as const;

/**
 * The scale. Every size in the app is here; no component sets `fontSize`.
 *
 * `includeFontPadding: false` on the display sizes because Android adds
 * leading inside the text box and it shows immediately on tight line heights.
 */
const noPad = Platform.OS === 'android' ? { includeFontPadding: false } : null;

export const type = {
  /** The armed screen's promise, and nothing else. */
  display: { fontFamily: fonts.displayBlack, fontSize: 34, lineHeight: 40, letterSpacing: -0.9, ...noPad },
  /** Screen titles. */
  title: { fontFamily: fonts.displayBlack, fontSize: 25, lineHeight: 32, letterSpacing: -0.6, ...noPad },
  /** The destination on the rail; card headings. */
  heading: { fontFamily: fonts.displayBold, fontSize: 19, lineHeight: 26, letterSpacing: -0.35, ...noPad },
  /** Button labels. */
  button: { fontFamily: fonts.displayBold, fontSize: 17, letterSpacing: -0.25, ...noPad },

  /** Running copy. */
  body: { fontFamily: fonts.bodyMedium, fontSize: 16, lineHeight: 24 },
  bodyStrong: { fontFamily: fonts.bodyBold, fontSize: 16, lineHeight: 24 },
  /** Stop names on the rail, row labels. */
  label: { fontFamily: fonts.bodyMedium, fontSize: 15, lineHeight: 21 },
  labelStrong: { fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 21 },
  /** Timings, hints, the line number. */
  caption: { fontFamily: fonts.bodyMedium, fontSize: 13, lineHeight: 18 },
  captionStrong: { fontFamily: fonts.bodyBold, fontSize: 13, lineHeight: 18 },

  /** The count. One figure, large, and the reason the armed screen exists. */
  counter: { fontFamily: fonts.displayBlack, fontSize: 52, lineHeight: 54, letterSpacing: -1.8, ...noPad },
} satisfies Record<string, TextStyle>;

/**
 * Numerals line up in columns on the rail and in the armed rows.
 * Applied where digits are compared, not everywhere.
 */
export const tabular: TextStyle = { fontVariant: ['tabular-nums'] };

/**
 * Dynamic Type is honoured everywhere; this only bounds it on chrome the app
 * draws itself, so a 200% system scale cannot push the primary action off the
 * bottom of the screen. Body copy is deliberately unbounded.
 */
export const MAX_CHROME_SCALE = 1.35;

/* ------------------------------------------------------------------ *
 * Depth
 * ------------------------------------------------------------------ */

/**
 * Two levels, and each one is an iOS shadow AND an Android elevation. A
 * `shadowColor` without a sibling `elevation` renders as nothing at all on
 * Android, which is how "designed on a Mac" apps end up flat on half their
 * install base.
 */
export function elevation(level: 1 | 2, scheme: Scheme): ViewStyle {
  if (level === 1) {
    return Platform.select<ViewStyle>({
      ios: {
        shadowColor: scheme.shadow,
        shadowOpacity: scheme.name === 'dark' ? 0.5 : 0.09,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 3 },
      },
      android: { elevation: 2 },
      default: {},
    })!;
  }
  return Platform.select<ViewStyle>({
    ios: {
      shadowColor: scheme.shadow,
      shadowOpacity: scheme.name === 'dark' ? 0.62 : 0.14,
      shadowRadius: 22,
      shadowOffset: { width: 0, height: 10 },
    },
    android: { elevation: 8 },
    default: {},
  })!;
}

/* ------------------------------------------------------------------ *
 * Touch
 * ------------------------------------------------------------------ */

/**
 * Above the 44pt floor on purpose. The target user is on a moving vehicle;
 * the platform minimum assumes a steady hand.
 */
export const HIT = 48;

/** Small glyphs get this so their target is 48 even when the mark is 20. */
export const hitSlop = { top: 14, bottom: 14, left: 14, right: 14 };

/* ------------------------------------------------------------------ *
 * Motion
 * ------------------------------------------------------------------ */

/**
 * MOTION_INTENSITY 4. Press feedback on everything, state changes animated,
 * nothing decorative. Durations are short enough to read as response rather
 * than as animation.
 */
export const motion = {
  pressIn: 90,
  pressOut: 180,
  state: 260,
  /** The live node on the rail. Slow enough to read as "running". */
  pulse: 2400,
} as const;

/* ------------------------------------------------------------------ *
 * Icons
 * ------------------------------------------------------------------ */

/**
 * One family (Lucide), one stroke, three sizes. Set here so a component can
 * never introduce a fourth.
 */
export const icon = { sm: 16, md: 20, lg: 24, stroke: 2 } as const;
