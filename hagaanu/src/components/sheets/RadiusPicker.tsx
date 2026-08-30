import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { MAX_RADIUS_M, MIN_RADIUS_M, RADIUS_PRESETS } from '../../constants/config';
import { t } from '../../i18n';
import { colors, radii, spacing, typography } from '../../theme';
import { formatDistance } from '../../utils/geo';
import { Chip, PrimaryButton, SecondaryButton, rowDirection, textAlign } from '../ui';

type Props = {
  value: number;
  onChange: (radiusM: number) => void;
};

/** Quick-pick radius chips plus a custom-distance dialog. */
export function RadiusPicker({ value, onChange }: Props) {
  const [customOpen, setCustomOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [invalid, setInvalid] = useState(false);

  const isPreset = (RADIUS_PRESETS as readonly number[]).includes(value);

  const openCustom = () => {
    setDraft(isPreset ? '' : String(value));
    setInvalid(false);
    setCustomOpen(true);
  };

  const commitCustom = () => {
    const parsed = Number.parseInt(draft.replace(/\D/g, ''), 10);
    if (!Number.isFinite(parsed) || parsed < MIN_RADIUS_M || parsed > MAX_RADIUS_M) {
      setInvalid(true);
      return;
    }
    onChange(parsed);
    setCustomOpen(false);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.chips, { flexDirection: rowDirection() }]}>
        {RADIUS_PRESETS.map((preset) => (
          <Chip
            key={preset}
            label={formatDistance(preset)}
            selected={value === preset}
            onPress={() => onChange(preset)}
          />
        ))}
        <Chip
          label={isPreset ? t('setup.custom') : formatDistance(value)}
          selected={!isPreset}
          onPress={openCustom}
        />
      </View>

      <Modal
        visible={customOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCustomOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setCustomOpen(false)}>
          {/* Stop taps inside the dialog from dismissing it. */}
          <Pressable style={styles.dialog} onPress={() => undefined}>
            <Text style={[styles.dialogTitle, { textAlign: textAlign() }]}>
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
              placeholderTextColor={colors.textFaint}
              style={[styles.input, invalid ? styles.inputInvalid : null]}
              autoFocus
              onSubmitEditing={commitCustom}
              accessibilityLabel={t('setup.customPlaceholder')}
            />

            <Text style={[styles.hint, invalid ? styles.hintInvalid : null, { textAlign: textAlign() }]}>
              {invalid
                ? t('setup.customInvalid', { min: MIN_RADIUS_M, max: MAX_RADIUS_M })
                : t('setup.customRange', { min: MIN_RADIUS_M, max: MAX_RADIUS_M })}
            </Text>

            <PrimaryButton label={t('common.save')} onPress={commitCustom} />
            <SecondaryButton label={t('common.cancel')} onPress={() => setCustomOpen(false)} />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  chips: {
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  dialog: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.md,
  },
  dialogTitle: {
    ...typography.title,
    color: colors.text,
  },
  input: {
    height: 56,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    ...typography.title,
    color: colors.text,
    textAlign: 'center',
  },
  inputInvalid: {
    borderColor: colors.alert,
  },
  hint: {
    ...typography.caption,
    color: colors.textMuted,
  },
  hintInvalid: {
    color: colors.alert,
  },
});
