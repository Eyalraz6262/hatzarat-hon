import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing } from '../../theme';
import { Perforation } from '../ui';

/**
 * The paper stub docked to the bottom of the map.
 *
 * Not a draggable sheet, on purpose: the product's promise is "armed in under
 * ten seconds", and a gesture between opening the app and pressing the button
 * spends that budget for nothing. It is a ticket torn along a perforation —
 * which is also why the top edge is punched rather than rounded.
 */
export function TicketStub({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.stub, { paddingBottom: Math.max(insets.bottom, spacing.lg) + 14 }, style]}>
      <Perforation behind={colors.ink} />
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  stub: {
    backgroundColor: colors.paper,
    paddingTop: spacing.lg,
  },
  body: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    gap: 24,
  },
});
