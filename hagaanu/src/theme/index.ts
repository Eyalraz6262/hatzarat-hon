/**
 * Design tokens for "הגענו?".
 *
 * Deep-night palette: the app is used in a dark train carriage at 23:00, so the
 * default surface is dark and the single call-to-action is the only saturated
 * thing on screen. A light theme can be added later by swapping `colors`.
 */

export const colors = {
  /** Page background — near-black with a blue cast. */
  bg: '#0B1020',
  /** Raised surfaces: the bottom sheet, cards. */
  surface: '#141A2E',
  surfaceAlt: '#1D2540',
  surfaceMuted: '#262F4D',

  border: 'rgba(255,255,255,0.09)',
  borderStrong: 'rgba(255,255,255,0.18)',

  text: '#F4F6FB',
  textMuted: 'rgba(244,246,251,0.62)',
  textFaint: 'rgba(244,246,251,0.38)',

  /** Brand accent — used for the primary action and the geofence circle. */
  accent: '#5B8CFF',
  accentDeep: '#3B6BE0',
  accentSoft: 'rgba(91,140,255,0.16)',

  /** "Armed / safe to sleep" state. */
  calm: '#38D9A9',
  calmSoft: 'rgba(56,217,169,0.14)',

  /** Alarm state. */
  alert: '#FF5A5F',
  alertDeep: '#E23B41',
  alertSoft: 'rgba(255,90,95,0.16)',

  warning: '#FFB84D',
  warningSoft: 'rgba(255,184,77,0.14)',

  white: '#FFFFFF',
  overlay: 'rgba(11,16,32,0.72)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radii = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999,
} as const;

export const typography = {
  display: { fontSize: 34, fontWeight: '800' as const, letterSpacing: -0.5 },
  title: { fontSize: 22, fontWeight: '700' as const },
  subtitle: { fontSize: 17, fontWeight: '600' as const },
  body: { fontSize: 15, fontWeight: '500' as const },
  caption: { fontSize: 13, fontWeight: '500' as const },
  button: { fontSize: 18, fontWeight: '700' as const },
} as const;

export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -6 },
    elevation: 16,
  },
  button: {
    shadowColor: colors.accent,
    shadowOpacity: 0.4,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
} as const;

/** Map styling that matches the dark UI (Google Maps / Android). */
export { darkMapStyle } from './mapStyle';
