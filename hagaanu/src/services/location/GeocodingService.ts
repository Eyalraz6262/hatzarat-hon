import * as Location from 'expo-location';

import { ISRAEL_BOUNDS } from '../../constants/config';
import { t } from '../../i18n';
import type { Destination, LatLng } from '../../types';
import { distanceMeters } from '../../utils/geo';
import { log } from '../../utils/logger';
import type { PlaceKind } from '../places/catalog';
import { labelFor, searchCatalog } from '../places/match';

/**
 * Address search and reverse lookup.
 *
 * Two sources, in order.
 *
 * First the bundled catalog (../places): every railway station and the named
 * landmarks people give as a destination. It answers offline, instantly, and it
 * is the only one of the two that knows what "סמי עופר" is.
 *
 * Then the *platform* geocoder — CLGeocoder on iOS, Android's Geocoder backed
 * by Play Services — for everything else, which in practice means street
 * addresses. That is a deliberate choice over a hosted place API: no key to
 * provision, no billing account, no third party seeing where our users sleep.
 * Its limitation is the reason the catalog exists at all: it resolves
 * addresses, so it cannot find a station, a stadium or a mall by name.
 *
 * Swapping in Places or Mapbox later means reimplementing only this file.
 */

/** True when a coordinate falls inside the country the app currently serves. */
function isInServiceArea(coords: LatLng): boolean {
  return (
    coords.latitude >= ISRAEL_BOUNDS.minLatitude &&
    coords.latitude <= ISRAEL_BOUNDS.maxLatitude &&
    coords.longitude >= ISRAEL_BOUNDS.minLongitude &&
    coords.longitude <= ISRAEL_BOUNDS.maxLongitude
  );
}

function labelFromAddress(address: Location.LocationGeocodedAddress): string {
  const parts = [
    address.name && address.name !== address.street ? address.name : null,
    [address.street, address.streetNumber].filter(Boolean).join(' ') || null,
    address.city ?? address.subregion ?? null,
  ].filter((part): part is string => Boolean(part && part.trim()));

  // Deduplicate — platform geocoders often repeat the street as `name`.
  const unique = parts.filter((part, index) => parts.indexOf(part) === index);

  // Every result is in Israel, so the country name is pure noise in a label
  // that has to fit on one line of a phone screen.
  return unique
    .filter((part) => !/^(ישראל|Israel)$/i.test(part.trim()))
    .join(', ');
}

export type SearchResult = Destination & {
  /** Set for catalog hits, so the list can show what kind of place it is. */
  kind?: PlaceKind;
  /** Metres from the user, when their position is known. */
  distanceM?: number | null;
};

/**
 * Close enough that two results are the same place.
 *
 * The geocoder often resolves a station's street address, which lands within a
 * block of the catalog entry. Showing both would be two identical-looking rows.
 */
const SAME_PLACE_M = 400;

export const GeocodingService = {
  /**
   * Turn a free-text query into candidate destinations.
   *
   * `near` is the user's last known position. It never filters — someone in
   * Haifa searching for a stadium in Jerusalem means it — it only decides the
   * order when the query alone cannot.
   */
  async search(query: string, near: LatLng | null = null): Promise<SearchResult[]> {
    const trimmed = query.trim();
    if (trimmed.length < 2) return [];

    const fromCatalog: SearchResult[] = searchCatalog(trimmed, near).map((hit) => ({
      coords: hit.place.coords,
      label: labelFor(hit.place),
      kind: hit.place.kind,
      distanceM: hit.distanceM,
    }));

    // A confident catalog answer is better than anything the address geocoder
    // can offer, and it is already on screen while the network call is out.
    const fromGeocoder = await GeocodingService.geocode(trimmed).catch((error) => {
      log.warn('location', 'forward geocode failed', error);
      // Only a hard failure when the catalog had nothing either — otherwise the
      // user has results and does not need to hear about it.
      if (fromCatalog.length === 0) throw error;
      return [] as SearchResult[];
    });

    const merged = [...fromCatalog];
    for (const result of fromGeocoder) {
      const duplicate = merged.some(
        (existing) => distanceMeters(existing.coords, result.coords) < SAME_PLACE_M
      );
      if (duplicate) continue;
      merged.push({
        ...result,
        distanceM: near ? Math.round(distanceMeters(near, result.coords)) : null,
      });
    }

    return merged.slice(0, 8);
  },

  /** The platform geocoder alone. Addresses, not places. */
  async geocode(trimmed: string): Promise<SearchResult[]> {
    const matches = await Location.geocodeAsync(trimmed);
    if (!matches.length) return [];

    // Prefer results inside Israel. A query like "הרצל" matches streets in a
    // dozen countries, and the user is on a train here — but if nothing local
    // matched at all we return what we got rather than showing "no results",
    // so someone planning a trip abroad is not silently blocked.
    const local = matches.filter((match) =>
      isInServiceArea({ latitude: match.latitude, longitude: match.longitude })
    );
    const ranked = local.length > 0 ? local : matches;

    // The platform geocoder returns coordinates only, so re-resolve each hit to
    // a printable label. Cap the fan-out: five results is plenty for a sheet.
    const top = ranked.slice(0, 5);
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
