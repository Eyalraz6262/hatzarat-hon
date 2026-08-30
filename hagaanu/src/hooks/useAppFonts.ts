import { useFonts } from 'expo-font';
import {
  Assistant_400Regular,
  Assistant_600SemiBold,
  Assistant_700Bold,
} from '@expo-google-fonts/assistant';
import { Heebo_700Bold, Heebo_800ExtraBold, Heebo_900Black } from '@expo-google-fonts/heebo';
import {
  IBMPlexMono_400Regular,
  IBMPlexMono_500Medium,
} from '@expo-google-fonts/ibm-plex-mono';

/**
 * Loads the three faces the signage system is built from.
 *
 *   Heebo         — the headline voice. Hebrew-designed, heavy enough to carry
 *                   a 62px "אפשר לישון" without looking inflated.
 *   Assistant     — running Hebrew copy and Hebrew labels.
 *   IBM Plex Mono — numerals and Latin codes only. It has no Hebrew coverage,
 *                   so Hebrew must never be set in it (see src/theme).
 *
 * The splash is held until this resolves. Rendering first would show a frame of
 * system-font Hebrew and then reflow — visible, and exactly the cheapness the
 * whole direction exists to avoid.
 */
export function useAppFonts(): boolean {
  const [loaded, error] = useFonts({
    Heebo_700Bold,
    Heebo_800ExtraBold,
    Heebo_900Black,
    Assistant_400Regular,
    Assistant_600SemiBold,
    Assistant_700Bold,
    IBMPlexMono_400Regular,
    IBMPlexMono_500Medium,
  });

  // A font that fails to load must never block the alarm from being armed —
  // the system face is an acceptable degradation, a stuck splash screen is not.
  return loaded || error !== null;
}
