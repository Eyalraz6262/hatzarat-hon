import { Image, StyleSheet, View } from 'react-native';

/**
 * Paper tooth over a ticket surface.
 *
 * A printed ticket has grain; a perfectly flat cream fill was the one thing in
 * the system that still read as a screen rather than as paper. This is a tiled
 * 128px noise sample at 4.5% — deliberately below the threshold where anyone
 * would name it, and above the one where the surface looks vacuum-sealed.
 *
 * Absolutely positioned and non-interactive, so it never affects layout or
 * touch. The parent must be `overflow: hidden` or the tile bleeds past the
 * surface's edge.
 */
export function PaperGrain() {
  return (
    <View
      style={styles.grain}
      pointerEvents="none"
      accessible={false}
      // Purely decorative: excluded from the accessibility tree entirely.
      importantForAccessibility="no-hide-descendants"
    >
      <Image
        source={require('../../../assets/paper-grain.png')}
        style={styles.tile}
        resizeMode="repeat"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  grain: {
    ...StyleSheet.absoluteFill,
    opacity: 0.045,
  },
  tile: {
    ...StyleSheet.absoluteFill,
    width: undefined,
    height: undefined,
  },
});
