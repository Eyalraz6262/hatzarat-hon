import * as Location from 'expo-location';

import { t } from '../../i18n';
import type { Destination, LatLng } from '../../types';
import { log } from '../../utils/logger';

/**
 * Address search and reverse lookup.
 *
 * Uses the *platform* geocoder (CLGeocoder on iOS, Android's Geocoder backed by
 * Play Services) rather than a hosted API. That is a deliberate MVP choice: no
 * API key to provision, no billing account, no third party seeing where our
 * users sleep. The trade-off is that results are thinner than Google Places
 * autocomplete — swapping in a Places/Mapbox client later means reimplementing
 * only this file.
 */

function labelFromAddress(address: Location.LocationGeocodedAddress): string {
  const parts = [
    address.name && address.name !== address.street ? address.name : null,
    [address.street, address.streetNumber].filter(Boolean).join(' ') || null,
    address.city ?? address.subregion ?? null,
  ].filter((part): part is string => Boolean(part && part.trim()));

  // Deduplicate — platform geocoders often repeat the street as `name`.
  const unique = parts.filter((part, index) => parts.indexOf(part) === index);
  return unique.join(', ');
}

export type SearchResult = Destination;

export const GeocodingService = {
  /** Forward geocode a free-text query into candidate destinations. */
  async search(query: string): Promise<SearchResult[]> {
    const trimmed = query.trim();
    if (trimmed.length < 2) return [];

    const matches = await Location.geocodeAsync(trimmed);
    if (!matches.length) return [];

    // The platform geocoder returns coordinates only, so re-resolve each hit to
    // a printable label. Cap the fan-out: five results is plenty for a sheet.
    const top = matches.slice(0, 5);
    return Promise.all(
      top.map(async (match) => {
        const coords: LatLng = { latitude: match.latitude, longitude: match.longitude };
        const label = await GeocodingService.describe(coords);
        return { coords, label: label || trimmed };
      })
    );
  },

  /**
   * Reverse geocode a map tap into a human-readable label.
   * Falls back to a generic label rather than failing the flow — the user picked
   * a point on a map, they know where it is.
   */
  async describe(coords: LatLng): Promise<string> {
    try {
      const [address] = await Location.reverseGeocodeAsync(coords);
      if (!address) return t('errors.unknownPlace');
      const label = labelFromAddress(address);
      return label || t('errors.unknownPlace');
    } catch (error) {
      log.warn('location', 'reverse geocode failed', error);
      return t('errors.unknownPlace');
    }
  },
};
