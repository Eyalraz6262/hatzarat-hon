import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing, useTheme } from '../../theme';
import { Perforation } from '../ui';
import { PaperGrain } from '../ui/PaperGrain';

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
  const theme = useTheme();

  return (
    <View
      style={[
        styles.stub,
        { backgroundColor: theme.ticket.bg, paddingBottom: Math.max(insets.bottom, spacing.lg) + 16 },
        style,
      ]}
    >
      <PaperGrain />
      <Perforation behind={theme.world.bg} dashes={theme.ticket.faint} />
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  stub: {
    paddingTop: spacing.lg,
    // Clips the grain tile to the stub's own edge.
    overflow: 'hidden',
  },
  body: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    gap: 24,
  },
});
