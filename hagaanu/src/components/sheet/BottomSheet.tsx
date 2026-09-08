import { type ReactNode, useEffect, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useReducedMotion } from '../../hooks/useReducedMotion';
import { elevation, motion, radius, space, useTheme } from '../../theme';

/**
 * The sheet the whole app lives in.
 *
 * The map is the screen and the sheet is everything you do to it, so the sheet
 * is never modal and never covers the map completely — the destination and its
 * ring have to stay visible while you set the range, or the slider is a number
 * with no consequence.
 *
 * Hand-built rather than @gorhom/bottom-sheet. That library is excellent and it
 * needs Reanimated and Gesture Handler, two native modules this project would
 * be adding blind: there is no device here to verify them on, and they are the
 * kind of dependency that fails at the prebuild rather than in a test. What the
 * sheet actually needs is a spring, a drag, and snap points, and `Animated` with
 * a `PanResponder` does all three on the JS-free native driver.
 *
 * Height is driven from OUTSIDE. Each screen declares which snap point it wants
 * and the sheet springs there, which is why choosing a destination feels like
 * the sheet growing to meet the decision rather than a new screen appearing.
 */

export type Snap = 'peek' | 'half' | 'full';

type Props = {
  snap: Snap;
  children: ReactNode;
  /** Called when the user drags the sheet down past the smallest snap point. */
  onCollapse?: () => void;
  /** Sits under the sheet, above the tab bar: the arm button and its like. */
  footer?: ReactNode;
};

/** The grab handle, and the footer's own padded height. Both are fixed. */
const GRIP = 22;
const FOOTER = 76;

/** Fractions of the usable height — the CEILING for each snap, not the size. */
const FRACTION: Record<Snap, number> = { peek: 0.28, half: 0.56, full: 0.9 };

/**
 * How tall the sheet is at a given snap point.
 *
 * Exported because things floating over the map have to stay clear of it, and
 * the alternative is every caller keeping its own copy of these fractions and
 * drifting from them.
 */
export function useSheetHeight(snap: Snap): number {
  const insets = useSafeAreaInsets();
  const { height: screenH } = useWindowDimensions();
  const usable = Math.max(screenH - insets.top - 48, 320);
  return Math.round(usable * FRACTION[snap]);
}

export function BottomSheet({ snap, children, onCollapse, footer }: Props) {
  const s = useTheme();
  const insets = useSafeAreaInsets();
  const { height: screenH } = useWindowDimensions();
  const reduced = useReducedMotion();

  const usable = Math.max(screenH - insets.top - 48, 320);

  /*
    The sheet is as tall as what is in it, up to the snap point — not the snap
    point regardless.

    A fixed fraction is why every state had a void in it: the chosen panel is a
    title, a slider and a button, and stretching that to 56% of the screen left
    two hundred empty pixels above the button on the app's main screen. Content
    that overflows still scrolls and still stops at the snap; content that does
    not simply hands the rest of the screen back to the map, which is the thing
    the user is trying to look at.
  */
  const [content, setContent] = useState(0);
  const ceiling = Math.round(usable * FRACTION[snap]);
  const chrome = GRIP + (footer ? FOOTER : 0);
  const target = content > 0 ? Math.min(ceiling, Math.round(content) + chrome) : ceiling;

  const height = useRef(new Animated.Value(target)).current;
  // Tracked separately because Animated.Value cannot be read synchronously
  // inside a gesture without a listener, and the drag needs the start height.
  const current = useRef(target);
  const dragging = useRef(false);

  useEffect(() => {
    const id = height.addListener(({ value }) => {
      current.current = value;
    });
    return () => height.removeListener(id);
  }, [height]);

  useEffect(() => {
    if (dragging.current) return;
    if (reduced) {
      height.setValue(target);
      return;
    }
    Animated.spring(height, {
      toValue: target,
      ...motion.sheet,
      useNativeDriver: false, // height is a layout prop; the driver cannot own it
    }).start();
  }, [target, height, reduced]);

  const pan = useRef(
    PanResponder.create({
      // Only claim the gesture once it is clearly a vertical drag, so a
      // horizontal swipe inside the sheet still belongs to its content.
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dy) > 6 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderGrant: () => {
        dragging.current = true;
      },
      onPanResponderMove: (_e, g) => {
        height.setValue(Math.max(80, current.current - g.dy));
      },
      onPanResponderRelease: (_e, g) => {
        dragging.current = false;
        const settled = current.current;
        // Dragged down hard, or below the smallest snap: give the map back.
        if (onCollapse && (g.vy > 1.1 || settled < usable * FRACTION.peek * 0.7)) {
          onCollapse();
        }
        Animated.spring(height, {
          toValue: Math.round(usable * FRACTION[snap]),
          ...motion.sheet,
          useNativeDriver: false,
        }).start();
      },
    })
  ).current;

  return (
    <View style={styles.dock} pointerEvents="box-none">
      <Animated.View
        style={[
          styles.sheet,
          elevation(3, s),
          { backgroundColor: s.sheet, height, paddingBottom: insets.bottom },
        ]}
      >
        <View {...pan.panHandlers} style={styles.grip} accessibilityRole="adjustable">
          <View style={[styles.gripBar, { backgroundColor: s.lineStrong }]} />
        </View>

        {/*
          The body scrolls. The sheet's height is a snap point, not a promise
          about the content, and the armed panel grows by a whole gauge the
          moment the trip closes in — without this it simply ran off the bottom
          of the sheet and under the button.
        */}
        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          // Measured rather than guessed: this is what lets the sheet be the
          // size of its content. Height only, and only while not dragging, so
          // a scroll position change cannot fight the gesture.
          onContentSizeChange={(_w, h) => {
            if (!dragging.current) setContent(h);
          }}
        >
          {children}
        </ScrollView>

        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  dock: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    overflow: 'hidden',
  },
  grip: {
    paddingTop: space.sm,
    paddingBottom: space.xs,
    alignItems: 'center',
  },
  gripBar: {
    width: 38,
    height: 4,
    borderRadius: 999,
  },
  body: {
    flex: 1,
    /**
     * `minHeight: 0` is the whole reason this scrolls.
     *
     * A `flex: 1` child refuses to shrink below its own content height without
     * it, so the scroll view grew to fit the gauge and painted straight over
     * the footer instead of scrolling inside the sheet. It is the single most
     * common flexbox trap and it costs one line.
     */
    minHeight: 0,
    overflow: 'hidden',
  },
  bodyContent: {
    paddingHorizontal: space.screen,
    paddingTop: space.sm,
    paddingBottom: space.lg,
  },
  footer: {
    paddingHorizontal: space.screen,
    paddingTop: space.md,
  },
});
