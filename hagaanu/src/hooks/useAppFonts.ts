import { useFonts } from 'expo-font';

/**
 * Loads the six faces the type scale names — and only those.
 *
 * Imported by weight subpath rather than from the package root. Each
 * `@expo-google-fonts/*` root index re-exports every weight it ships, so a
 * root import makes Metro bundle all of them: three families at 9, 8 and 8
 * weights pulled 30 .ttf files into the app to use six. The subpath form
 * reaches one file each.
 *
 *   Heebo         — the headline voice. Hebrew-designed, heavy enough to carry
 *                   a 52px "אפשר לישון" without looking inflated.
 *   Assistant     — running Hebrew copy and Hebrew labels.
 *   IBM Plex Mono — numerals and Latin plates only. It has NO Hebrew coverage,
 *                   so Hebrew must never be set in it (see src/theme).
 *
 * The splash is held until this resolves. Rendering first would show a frame of
 * system-font Hebrew and then reflow — visible, and exactly the cheapness the
 * whole direction exists to avoid.
 */
export function useAppFonts(): boolean {
  const [loaded, error] = useFonts({
    Heebo_800ExtraBold: require('@expo-google-fonts/heebo/800ExtraBold/Heebo_800ExtraBold.ttf'),
    Heebo_900Black: require('@expo-google-fonts/heebo/900Black/Heebo_900Black.ttf'),
    Assistant_600SemiBold: require('@expo-google-fonts/assistant/600SemiBold/Assistant_600SemiBold.ttf'),
    Assistant_700Bold: require('@expo-google-fonts/assistant/700Bold/Assistant_700Bold.ttf'),
    IBMPlexMono_400Regular: require('@expo-google-fonts/ibm-plex-mono/400Regular/IBMPlexMono_400Regular.ttf'),
    IBMPlexMono_500Medium: require('@expo-google-fonts/ibm-plex-mono/500Medium/IBMPlexMono_500Medium.ttf'),
  });

  // A font that fails to load must never block the alarm from being armed —
  // the system face is an acceptable degradation, a stuck splash screen is not.
  return loaded || error !== null;
}
