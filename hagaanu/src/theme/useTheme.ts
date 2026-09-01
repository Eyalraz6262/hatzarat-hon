import { useColorScheme } from 'react-native';

import { day, night, type Scheme, type Surface } from './schemes';

/**
 * The active colour scheme.
 *
 * Follows the OS setting, with night as the default for anything unset or
 * unknown. Night is not merely the dark variant here — it is the product's
 * identity, and the one someone reaches for at 23:00 in an unlit carriage.
 * Day exists because the same person uses the app at 07:00 on a lit platform,
 * not because a checklist asked for two modes.
 */
export function useTheme(): Scheme {
  return useColorScheme() === 'light' ? day : night;
}

/**
 * Sugar for the common case: a component drawn entirely on one material asks
 * for that surface directly instead of reaching through the scheme.
 *
 *   const s = useSurface('ticket');   // the stub, the wake pass
 *   const s = useSurface('world');    // map chrome, the permission board
 */
export function useSurface(which: 'world' | 'ticket'): Surface {
  return useTheme()[which];
}
