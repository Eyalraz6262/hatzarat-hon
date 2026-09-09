import { useFonts } from 'expo-font';

/**
 * Loads the five faces the type scale names, and only those.
 *
 * Imported by weight subpath rather than from the package root. Each
 * `@expo-google-fonts/*` root index re-exports every weight it ships, so a
 * root import makes Metro bundle all of them: two families at 9 and 8 weights
 * would pull 17 .ttf files into the app to use five. The subpath form reaches
 * one file each.
 *
 *   Heebo      display, numerals, anything structural. Hebrew-designed, and
 *              heavy enough to carry the armed screen's headline.
 *   Assistant  running copy. The permission screens have real paragraphs and
 *              Heebo is not a reading face at 16px.
 *
 * The splash is held until this resolves. Rendering first would show a frame
 * of system-font Hebrew and then reflow, which is visible and cheap-looking.
 */
export function useAppFonts(): boolean {
  const [loaded, error] = useFonts({
    Heebo_500Medium: require('@expo-google-fonts/heebo/500Medium/Heebo_500Medium.ttf'),
    Heebo_700Bold: require('@expo-google-fonts/heebo/700Bold/Heebo_700Bold.ttf'),
    Heebo_800ExtraBold: require('@expo-google-fonts/heebo/800ExtraBold/Heebo_800ExtraBold.ttf'),
    Assistant_500Medium: require('@expo-google-fonts/assistant/500Medium/Assistant_500Medium.ttf'),
    Assistant_700Bold: require('@expo-google-fonts/assistant/700Bold/Assistant_700Bold.ttf'),
  });

  // A font that fails to load must never block the alarm from being armed:
  // the system face is an acceptable degradation, a stuck splash is not.
  return loaded || error !== null;
}
