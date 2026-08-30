import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { GeocodingService, type SearchResult } from '../../services/location/GeocodingService';
import { isRTL, t } from '../../i18n';
import { colors, radii, spacing, typography } from '../../theme';
import { rowDirection, textAlign } from '../ui';
import { log } from '../../utils/logger';

type Props = {
  onSelect: (result: SearchResult) => void;
};

const DEBOUNCE_MS = 450;

/** Address search over the platform geocoder. Debounced; results as a dropdown. */
export function SearchBar({ onSelect }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Guards against a slow earlier request overwriting a newer one's results.
  const requestId = useRef(0);

  const runSearch = useCallback(async (value: string) => {
    const id = ++requestId.current;
    setLoading(true);
    setMessage(null);
    try {
      const found = await GeocodingService.search(value);
      if (id !== requestId.current) return;
      setResults(found);
      setMessage(found.length ? null : t('errors.searchEmpty'));
    } catch (error) {
      log.warn('location', 'search failed', error);
      if (id !== requestId.current) return;
      setResults([]);
      setMessage(t('errors.searchFailed'));
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, []);

  const onChange = useCallback(
    (value: string) => {
      setQuery(value);
      if (timer.current) clearTimeout(timer.current);

      if (value.trim().length < 2) {
        setResults([]);
        setMessage(null);
        setLoading(false);
        return;
      }
      timer.current = setTimeout(() => void runSearch(value), DEBOUNCE_MS);
    },
    [runSearch]
  );

  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    requestId.current += 1;
    setQuery('');
    setResults([]);
    setMessage(null);
    setLoading(false);
    Keyboard.dismiss();
  }, []);

  const pick = useCallback(
    (result: SearchResult) => {
      onSelect(result);
      clear();
    },
    [onSelect, clear]
  );

  return (
    <View style={styles.wrapper}>
      <View style={[styles.field, { flexDirection: rowDirection() }]}>
        <Ionicons name="search" size={20} color={colors.textFaint} />
        <TextInput
          value={query}
          onChangeText={onChange}
          onSubmitEditing={() => query.trim().length >= 2 && void runSearch(query)}
          placeholder={t('home.searchPlaceholder')}
          placeholderTextColor={colors.textFaint}
          style={[
            styles.input,
            { textAlign: textAlign(), writingDirection: isRTL() ? 'rtl' : 'ltr' },
          ]}
          returnKeyType="search"
          autoCorrect={false}
          accessibilityLabel={t('home.searchPlaceholder')}
        />
        {loading ? <ActivityIndicator size="small" color={colors.textFaint} /> : null}
        {query.length > 0 && !loading ? (
          <Pressable onPress={clear} hitSlop={10} accessibilityLabel={t('common.close')}>
            <Ionicons name="close-circle" size={20} color={colors.textFaint} />
          </Pressable>
        ) : null}
      </View>

      {results.length > 0 || message ? (
        <View style={styles.dropdown}>
          {message ? (
            <Text style={[styles.message, { textAlign: textAlign() }]}>{message}</Text>
          ) : (
            <ScrollView keyboardShouldPersistTaps="handled" style={styles.dropdownScroll}>
              {results.map((result, index) => (
                <Pressable
                  key={`${result.coords.latitude},${result.coords.longitude},${index}`}
                  onPress={() => pick(result)}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.resultRow,
                    { flexDirection: rowDirection() },
                    pressed ? styles.resultRowPressed : null,
                  ]}
                >
                  <Ionicons name="location-outline" size={18} color={colors.accent} />
                  <Text style={[styles.resultLabel, { textAlign: textAlign() }]} numberOfLines={2}>
                    {result.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.sm,
  },
  field: {
    alignItems: 'center',
    gap: spacing.md,
    height: 52,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    // Android adds vertical padding that de-centers the text in a fixed-height row.
    paddingVertical: 0,
  },
  dropdown: {
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  dropdownScroll: {
    maxHeight: 220,
  },
  resultRow: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  resultRowPressed: {
    backgroundColor: colors.surfaceAlt,
  },
  resultLabel: {
    flex: 1,
    ...typography.body,
    color: colors.text,
  },
  message: {
    ...typography.caption,
    color: colors.textMuted,
    padding: spacing.lg,
  },
});
