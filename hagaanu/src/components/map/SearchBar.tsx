import { useCallback, useEffect, useRef, useState } from 'react';
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

import { isRTL, t } from '../../i18n';
import { GeocodingService, type SearchResult } from '../../services/location/GeocodingService';
import { colors, spacing, type } from '../../theme';
import { log } from '../../utils/logger';
import { CloseIcon, SearchIcon, StationNode } from '../icons';
import { align, row } from '../ui';

type Props = {
  onSelect: (result: SearchResult) => void;
};

const DEBOUNCE_MS = 450;

/**
 * Address search, presented as the paper form field of a ticket machine.
 *
 * The field is the one piece of paper on the map screen before a destination
 * exists, which is what makes it read as the thing to fill in.
 */
export function SearchBar({ onSelect }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Guards against a slow earlier request overwriting a newer one's results.
  const requestId = useRef(0);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

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
      <View style={[styles.field, { flexDirection: row() }]}>
        <SearchIcon size={19} color={colors.paperSub} />
        <TextInput
          value={query}
          onChangeText={onChange}
          onSubmitEditing={() => {
            if (query.trim().length >= 2) void runSearch(query);
          }}
          placeholder={t('home.searchPlaceholder')}
          placeholderTextColor={colors.paperSub}
          style={[
            styles.input,
            { textAlign: align(), writingDirection: isRTL() ? 'rtl' : 'ltr' },
          ]}
          returnKeyType="search"
          autoCorrect={false}
          selectionColor={colors.signal}
          accessibilityLabel={t('home.searchPlaceholder')}
        />
        {loading ? <ActivityIndicator size="small" color={colors.paperSub} /> : null}
        {query.length > 0 && !loading ? (
          <Pressable onPress={clear} hitSlop={14} accessibilityLabel={t('common.close')}>
            <CloseIcon size={19} color={colors.paperSub} />
          </Pressable>
        ) : null}
      </View>

      {results.length > 0 || message ? (
        <View style={styles.dropdown}>
          {message ? (
            <Text style={[styles.message, { textAlign: align() }]}>{message}</Text>
          ) : (
            <ScrollView keyboardShouldPersistTaps="handled" style={styles.dropdownScroll}>
              {results.map((result, index) => (
                <Pressable
                  key={`${result.coords.latitude},${result.coords.longitude},${index}`}
                  onPress={() => pick(result)}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.resultRow,
                    { flexDirection: row() },
                    index > 0 ? styles.resultRowDivided : null,
                    pressed ? styles.resultRowPressed : null,
                  ]}
                >
                  <StationNode size={18} color={colors.signal} />
                  <Text style={[styles.resultLabel, { textAlign: align() }]} numberOfLines={2}>
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
    gap: 11,
    height: 52,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.paper,
  },
  input: {
    flex: 1,
    ...type.body,
    fontSize: 15.5,
    lineHeight: undefined,
    color: colors.ink,
    // Android adds vertical padding that de-centres text in a fixed-height row.
    paddingVertical: 0,
  },
  dropdown: {
    backgroundColor: colors.paper,
    overflow: 'hidden',
  },
  dropdownScroll: {
    maxHeight: 224,
  },
  resultRow: {
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 52,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  resultRowDivided: {
    borderTopWidth: 1,
    borderTopColor: colors.paperRule,
  },
  resultRowPressed: {
    backgroundColor: colors.paperShade,
  },
  resultLabel: {
    flex: 1,
    ...type.bodySmall,
    color: colors.ink,
  },
  message: {
    ...type.bodySmall,
    color: colors.paperSub,
    padding: spacing.lg,
  },
});
