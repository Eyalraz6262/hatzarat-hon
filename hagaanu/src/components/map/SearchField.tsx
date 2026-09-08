import MapPin from 'lucide-react-native/icons/map-pin';
import Search from 'lucide-react-native/icons/search';
import X from 'lucide-react-native/icons/x';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, StyleSheet, TextInput, View } from 'react-native';

import { t } from '../../i18n';
import { GeocodingService, type SearchResult } from '../../services/location/GeocodingService';
import { elevation, HIT, hitSlop, icon, radius, space, type, useTheme } from '../../theme';
import type { Destination } from '../../types';
import { log } from '../../utils/logger';
import { Touch, Txt, align, row } from '../ui';

/**
 * Finding a destination by name.
 *
 * Debounced at 400ms because forward geocoding on both platforms is a real
 * network call per keystroke, and a passenger typing a station name generates
 * a dozen of them. The list is capped at five by the geocoder, so a plain View
 * is correct here and a virtualized list would be overhead for nothing.
 */
export function SearchField({
  onPick,
  placeholder,
}: {
  onPick: (destination: Destination) => void;
  /** Defaults to the destination prompt; the change-of-vehicle field says so. */
  placeholder?: string;
}) {
  const s = useTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setFailed(false);
      return;
    }

    const id = ++requestId.current;
    setBusy(true);
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const found = await GeocodingService.search(trimmed);
          // A slower earlier request must not overwrite a newer one.
          if (id !== requestId.current) return;
          setResults(found);
          setFailed(false);
        } catch (error) {
          log.warn('location', 'search failed', error);
          if (id === requestId.current) {
            setResults([]);
            setFailed(true);
          }
        } finally {
          if (id === requestId.current) setBusy(false);
        }
      })();
    }, 400);

    return () => clearTimeout(timer);
  }, [query]);

  const pick = useCallback(
    (result: SearchResult) => {
      Keyboard.dismiss();
      setQuery('');
      setResults([]);
      onPick(result);
    },
    [onPick]
  );

  const showPanel = results.length > 0 || failed || (busy && query.trim().length >= 2);

  return (
    <View style={styles.wrap}>
      <View
        style={[
          styles.field,
          elevation(1, s),
          { backgroundColor: s.surface, flexDirection: row() },
        ]}
      >
        <Search size={icon.md} strokeWidth={icon.stroke} color={s.inkMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={placeholder ?? t('home.searchPlaceholder')}
          placeholderTextColor={s.inkMuted}
          style={[styles.input, { color: s.ink, textAlign: align() }]}
          returnKeyType="search"
          autoCorrect={false}
          autoComplete="street-address"
          textContentType="fullStreetAddress"
          accessibilityLabel={t('home.searchPlaceholder')}
        />
        {busy ? <ActivityIndicator size="small" color={s.inkMuted} /> : null}
        {query.length > 0 && !busy ? (
          <Touch
            accessibilityRole="button"
            accessibilityLabel={t('home.clearSearch')}
            hitSlop={hitSlop}
            onPress={() => setQuery('')}
          >
            <X size={icon.md} strokeWidth={icon.stroke} color={s.inkMuted} />
          </Touch>
        ) : null}
      </View>

      {showPanel ? (
        <View style={[styles.panel, elevation(2, s), { backgroundColor: s.surface }]}>
          {failed ? (
            <View style={styles.message}>
              <Txt variant="label" tone="muted">
                {t('errors.searchFailed')}
              </Txt>
            </View>
          ) : results.length === 0 ? (
            <View style={styles.message}>
              <Txt variant="label" tone="muted">
                {busy ? t('home.searching') : t('home.noResults')}
              </Txt>
            </View>
          ) : (
            results.map((result, index) => (
              <Touch
                key={`${result.label}-${index}`}
                accessibilityRole="button"
                accessibilityLabel={result.label}
                onPress={() => pick(result)}
                style={({ pressed }) => [
                  styles.result,
                  {
                    flexDirection: row(),
                    backgroundColor: pressed ? s.sunk : 'transparent',
                    borderTopWidth: index === 0 ? 0 : StyleSheet.hairlineWidth,
                    borderTopColor: s.line,
                  },
                ]}
              >
                <MapPin size={icon.md} strokeWidth={icon.stroke} color={s.inkMuted} />
                <Txt variant="label" numberOfLines={2} style={styles.resultText}>
                  {result.label}
                </Txt>
              </Touch>
            ))
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: space.sm,
  },
  field: {
    minHeight: 52,
    borderRadius: radius.control,
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
  },
  input: {
    flex: 1,
    ...type.body,
    paddingVertical: space.md,
  },
  panel: {
    borderRadius: radius.control,
    overflow: 'hidden',
  },
  message: {
    padding: space.lg,
  },
  result: {
    minHeight: HIT,
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  resultText: {
    flexShrink: 1,
  },
});
