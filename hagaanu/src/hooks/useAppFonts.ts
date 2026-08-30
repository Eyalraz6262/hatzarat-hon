import {
  useFonts,
  Assistant_400Regular,
  Assistant_500Medium,
  Assistant_600SemiBold,
  Assistant_700Bold,
  Assistant_800ExtraBold,
} from '@expo-google-fonts/assistant';

/**
 * Loads the Hebrew typeface.
 *
 * The splash screen is held until this resolves. Rendering before the faces are
 * ready would show a frame of system-font Hebrew and then reflow — visible, and
 * exactly the kind of cheapness the design brief rules out.
 */
export function useAppFonts(): boolean {
  const [loaded, error] = useFonts({
    Assistant_400Regular,
    Assistant_500Medium,
    Assistant_600SemiBold,
    Assistant_700Bold,
    Assistant_800ExtraBold,
  });

  // A font that fails to load must never block the alarm from being armed —
  // the system font is an acceptable degradation, a stuck splash screen is not.
  return loaded || error !== null;
}
