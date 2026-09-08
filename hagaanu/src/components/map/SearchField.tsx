import Bus from 'lucide-react-native/icons/bus';
import GraduationCap from 'lucide-react-native/icons/graduation-cap';
import MapPin from 'lucide-react-native/icons/map-pin';
import Plane from 'lucide-react-native/icons/plane';
import Search from 'lucide-react-native/icons/search';
import ShoppingBag from 'lucide-react-native/icons/shopping-bag';
import Stethoscope from 'lucide-react-native/icons/stethoscope';
import TrainFront from 'lucide-react-native/icons/train-front';
import Trophy from 'lucide-react-native/icons/trophy';
import X from 'lucide-react-native/icons/x';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, StyleSheet, TextInput, View } from 'react-native';

import { t } from '../../i18n';
import { GeocodingService, type SearchResult } from '../../services/location/GeocodingService';
import { elevation, HIT, hitSlop, icon, radius, space, type, useTheme } from '../../theme';
import type { PlaceKind } from '../../services/places/catalog';
import type { Destination, LatLng } from '../../types';
import { formatDistance } from '../../utils/geo';
import { log } from '../../utils/logger';
import { Touch, Txt, align, row } from '../ui';

/**
 * Finding a destination by name.
 *
 * Debounced at 400ms because forward geocoding on both platforms is a real
 * network call per keystroke, and a passenger typing a station name generates
 * a dozen of them. The list is capped at eight, so a plain View is correct here
 * and a virtualized list would be overhead for nothing.
 */

/**
 * What a result is, at a glance.
 *
 * A row reading "נתניה" is a different decision depending on whether it is the
 * railway station, the bus terminal or the stadium, and all three are in the
 * catalog. The pin is for results from the address geocoder, which has no idea
 * what kind of thing it found.
 */
const KIND_ICON: Record<PlaceKind, typeof MapPin> = {
  train: TrainFront,
  bus: Bus,
  stadium: Trophy,
  airport: Plane,
  campus: GraduationCap,
  hospital: Stethoscope,
  mall: ShoppingBag,
};
export function SearchField({
  onPick,
  placeholder,
  onFocusChange,
  onClear,
  near,
}: {
  onPick: (destination: Destination) => void;
  /** Defaults to the destination prompt. */
  placeholder?: string;
  /**
   * Focus drives the sheet: typing opens it to full height so results have
   * somewhere to land, and dismissing gives the map back.
   */
  onFocusChange?: (focused: boolean) => void;
  /** Present only when there is a destination to clear. */
  onClear?: () => void;
  /**
   * Where the user is, if we know. Only ever reorders results — searching for
   * somewhere far away is the entire point of the app.
   */
  near?: LatLng | null;
}) {
  const s = useTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const requestId = useRef(0);
  // Read at call time, not depended on: a position update every second would
  // otherwise restart the debounce and the query would never fire.
  const nearRef = useRef(near);
  nearRef.current = near;

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
          const found = await GeocodingService.search(trimmed, nearRef.current ?? null);
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
          onFocus={() => onFocusChange?.(true)}
          onBlur={() => onFocusChange?.(false)}
          autoCorrect={false}
          autoComplete="street-address"
          textContentType="fullStreetAddress"
          accessibilityLabel={t('home.searchPlaceholder')}
        />
        {busy ? <ActivityIndicator size="small" color={s.inkMuted} /> : null}
        {/*
          One X, two jobs, and which one it does depends on what there is to
          clear: the typed query first, and the chosen destination once the
          field is empty. Two separate controls in a search bar this size would
          be two 20px targets side by side.
        */}
        {(query.length > 0 || onClear) && !busy ? (
          <Touch
            accessibilityRole="button"
            accessibilityLabel={
              query.length > 0 ? t('home.clearSearch') : t('route.changeDestination')
            }
            hitSlop={hitSlop}
            onPress={() => {
              if (query.length > 0) {
                setQuery('');
                return;
              }
              onClear?.();
            }}
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
            results.map((result, index) => {
              const Icon = result.kind ? KIND_ICON[result.kind] : MapPin;
              return (
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
                  <Icon size={icon.md} strokeWidth={icon.stroke} color={s.inkMuted} />
                  <Txt variant="label" numberOfLines={2} style={styles.resultText}>
                    {result.label}
                  </Txt>
                  {typeof result.distanceM === 'number' ? (
                    <Txt variant="caption" tone="faint">
                      {formatDistance(result.distanceM)}
                    </Txt>
                  ) : null}
                </Touch>
              );
            })
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
