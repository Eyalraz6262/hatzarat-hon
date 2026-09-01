import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { MAX_RADIUS_M, MIN_RADIUS_M, RADIUS_PRESETS } from '../../constants/config';
import { t } from '../../i18n';
import { Feedback } from '../../services/feedback/Haptics';
import { spacing, type, useTheme } from '../../theme';
import { PlusIcon } from '../icons';
import { OutlineButton, SignalButton, align } from '../ui';

type Props = {
  value: number;
  onChange: (radiusM: number) => void;
};

/**
 * The radius control, built as a fare-zone selector: one continuous bar of
 * square segments sharing borders, the way a paper ticket prints its zones.
 *
 * The selected segment is filled in ink rather than orange, with a thin orange
 * bar capping it. That keeps the screen's single orange on the primary action
 * where it belongs, while still tying the selection to the accent.
 */
export function RadiusSelector({ value, onChange }: Props) {
  const theme = useTheme();
  const s = theme.ticket;
  const [customOpen, setCustomOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [invalid, setInvalid] = useState(false);

  const isPreset = (RADIUS_PRESETS as readonly number[]).includes(value);

  const openCustom = () => {
    Feedback.tick();
    setDraft(isPreset ? '' : String(value));
    setInvalid(false);
    setCustomOpen(true);
  };

  const commitCustom = () => {
    const parsed = Number.parseInt(draft.replace(/\D/g, ''), 10);
    if (!Number.isFinite(parsed) || parsed < MIN_RADIUS_M || parsed > MAX_RADIUS_M) {
      Feedback.reject();
      setInvalid(true);
      return;
    }
    Feedback.tick();
    onChange(parsed);
    setCustomOpen(false);
  };

  const select = (preset: number) => {
    Feedback.tick();
    onChange(preset);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.bar, { borderColor: s.border }]} accessibilityRole="radiogroup">
        {RADIUS_PRESETS.map((preset, index) => {
          const selected = value === preset;
          return (
            <Pressable
              key={preset}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={String(preset)}
              onPress={() => select(preset)}
              style={({ pressed }) => [
                styles.segment,
                index > 0 ? { borderStartWidth: 1.5, borderStartColor: s.border } : null,
                selected ? { backgroundColor: s.textPrimary } : null,
                pressed && !selected ? { backgroundColor: s.pressed } : null,
              ]}
            >
              {selected ? (
                <View style={[styles.segmentCap, { backgroundColor: theme.accent.base }]} />
              ) : null}
              <Text style={[styles.segmentLabel, { color: selected ? s.bg : s.textPrimary }]}>
                {preset}
              </Text>
            </Pressable>
          );
        })}

        <Pressable
          accessibilityRole="radio"
          accessibilityState={{ selected: !isPreset }}
          accessibilityLabel={t('setup.custom')}
          onPress={openCustom}
          style={({ pressed }) => [
            styles.segment,
            { borderStartWidth: 1.5, borderStartColor: s.border },
            !isPreset ? { backgroundColor: s.textPrimary } : null,
            pressed && isPreset ? { backgroundColor: s.pressed } : null,
          ]}
        >
          {!isPreset ? (
            <>
              <View style={[styles.segmentCap, { backgroundColor: theme.accent.base }]} />
              <Text style={[styles.segmentLabel, { color: s.bg }]}>{value}</Text>
            </>
          ) : (
            <PlusIcon size={17} color={s.textPrimary} />
          )}
        </Pressable>
      </View>

      <Text style={[styles.unit, { color: s.textMuted }]}>{t('plate.metres')}</Text>

      <Modal
        visible={customOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCustomOpen(false)}
      >
        <Pressable
          style={[styles.backdrop, { backgroundColor: theme.scrim }]}
          onPress={() => setCustomOpen(false)}
        >
          {/* Stops taps inside the dialog from dismissing it. */}
          <Pressable style={[styles.dialog, { backgroundColor: s.bg }]} onPress={() => undefined}>
            <Text style={[styles.dialogTitle, { color: s.textPrimary, textAlign: align() }]}>
              {t('setup.customTitle')}
            </Text>

            <TextInput
              value={draft}
              onChangeText={(next) => {
                setDraft(next);
                setInvalid(false);
              }}
              keyboardType="number-pad"
              inputMode="numeric"
              placeholder={t('setup.customPlaceholder')}
              placeholderTextColor={s.textMuted}
              style={[
                styles.input,
                { backgroundColor: s.raised, borderColor: invalid ? theme.accent.onPaper : s.border, color: s.textPrimary },
              ]}
              autoFocus
              selectionColor={theme.accent.base}
              onSubmitEditing={commitCustom}
              accessibilityLabel={t('setup.customPlaceholder')}
            />

            <Text
              style={[
                styles.hint,
                { color: invalid ? theme.accent.onPaper : s.textSecondary, textAlign: align() },
              ]}
            >
              {invalid
                ? t('setup.customInvalid', { min: MIN_RADIUS_M, max: MAX_RADIUS_M })
                : t('setup.customRange', { min: MIN_RADIUS_M, max: MAX_RADIUS_M })}
            </Text>

            <SignalButton label={t('common.save')} onPress={commitCustom} />
            <OutlineButton
              label={t('common.cancel')}
              surface={s}
              onPress={() => setCustomOpen(false)}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  bar: {
    flexDirection: 'row',
    borderWidth: 1.5,
  },
  segment: {
    flex: 1,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** The thin orange bar that marks the live segment. */
  segmentCap: {
    position: 'absolute',
    top: 0,
    start: 0,
    end: 0,
    height: 3,
  },
  segmentLabel: {
    ...type.readoutSmall,
  },
  unit: {
    ...type.label,
    textAlign: 'left',
  },

  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  dialog: {
    width: '100%',
    maxWidth: 380,
    padding: spacing.xl,
    gap: spacing.md,
  },
  dialogTitle: {
    ...type.subtitle,
  },
  input: {
    height: 62,
    borderWidth: 1.5,
    paddingHorizontal: spacing.lg,
    ...type.readout,
    textAlign: 'center',
  },
  hint: {
    ...type.labelHeSmall,
  },
});
