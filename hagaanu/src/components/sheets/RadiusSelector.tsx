import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { MAX_RADIUS_M, MIN_RADIUS_M, RADIUS_PRESETS } from '../../constants/config';
import { t } from '../../i18n';
import { Feedback } from '../../services/feedback/Haptics';
import { colors, spacing, type } from '../../theme';
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
      <View style={styles.bar} accessibilityRole="radiogroup">
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
                index > 0 ? styles.segmentDivided : null,
                selected ? styles.segmentSelected : null,
                pressed && !selected ? styles.segmentPressed : null,
              ]}
            >
              {selected ? <View style={styles.segmentCap} /> : null}
              <Text style={[styles.segmentLabel, selected ? styles.segmentLabelSelected : null]}>
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
            styles.segmentDivided,
            !isPreset ? styles.segmentSelected : null,
            pressed && isPreset ? styles.segmentPressed : null,
          ]}
        >
          {!isPreset ? (
            <>
              <View style={styles.segmentCap} />
              <Text style={[styles.segmentLabel, styles.segmentLabelSelected]}>{value}</Text>
            </>
          ) : (
            <PlusIcon size={17} color={colors.ink} />
          )}
        </Pressable>
      </View>

      <Text style={styles.unit}>{t('plate.metres')}</Text>

      <Modal
        visible={customOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCustomOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setCustomOpen(false)}>
          {/* Stops taps inside the dialog from dismissing it. */}
          <Pressable style={styles.dialog} onPress={() => undefined}>
            <Text style={[styles.dialogTitle, { textAlign: align() }]}>
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
              placeholderTextColor={colors.paperMuted}
              style={[styles.input, invalid ? styles.inputInvalid : null]}
              autoFocus
              selectionColor={colors.signal}
              onSubmitEditing={commitCustom}
              accessibilityLabel={t('setup.customPlaceholder')}
            />

            <Text style={[styles.hint, invalid ? styles.hintInvalid : null, { textAlign: align() }]}>
              {invalid
                ? t('setup.customInvalid', { min: MIN_RADIUS_M, max: MAX_RADIUS_M })
                : t('setup.customRange', { min: MIN_RADIUS_M, max: MAX_RADIUS_M })}
            </Text>

            <SignalButton label={t('common.save')} onPress={commitCustom} />
            <OutlineButton label={t('common.cancel')} onPress={() => setCustomOpen(false)} />
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
    borderColor: colors.ink,
  },
  segment: {
    flex: 1,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentDivided: {
    borderStartWidth: 1.5,
    borderStartColor: colors.ink,
  },
  segmentPressed: {
    backgroundColor: colors.paperShade,
  },
  segmentSelected: {
    backgroundColor: colors.ink,
  },
  /** The thin orange bar that marks the live segment. */
  segmentCap: {
    position: 'absolute',
    top: 0,
    start: 0,
    end: 0,
    height: 3,
    backgroundColor: colors.signal,
  },
  segmentLabel: {
    ...type.readoutSmall,
    fontSize: 13,
    color: colors.ink,
  },
  segmentLabelSelected: {
    color: colors.paper,
  },
  unit: {
    ...type.label,
    color: colors.paperMuted,
    textAlign: 'left',
  },

  backdrop: {
    flex: 1,
    backgroundColor: colors.scrim,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  dialog: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.paper,
    padding: spacing.xl,
    gap: spacing.md,
  },
  dialogTitle: {
    ...type.subtitle,
    color: colors.ink,
  },
  input: {
    height: 62,
    backgroundColor: colors.paperShade,
    borderWidth: 1.5,
    borderColor: colors.ink,
    paddingHorizontal: spacing.lg,
    ...type.readout,
    color: colors.ink,
    textAlign: 'center',
  },
  inputInvalid: {
    borderColor: colors.signalDeep,
  },
  hint: {
    ...type.labelHeSmall,
    color: colors.paperSub,
  },
  hintInvalid: {
    color: colors.signalDeep,
  },
});
