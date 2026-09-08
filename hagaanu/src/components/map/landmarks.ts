import type { LatLng } from '../../types';

/**
 * Real places, for the browser demo's map.
 *
 * `react-native-maps` wraps MapKit and the Google Maps SDK and has no web
 * build, and the published page cannot load map tiles either — the artifact
 * host blocks images from any outside origin. So the web map draws what it can
 * draw honestly: a small set of places at their true coordinates, in the same
 * projection as everything else on the screen.
 *
 * That is a real map, just a very sparse one. It is NOT an invented coastline
 * or a street grid dressed up to look like cartography — every point here is a
 * place that exists where it is plotted, and the ones without a station are
 * marked as cities rather than stops.
 *
 * The list is the coastal corridor because that is the journey this app is for.
 */
export type Landmark = {
  name: string;
  coords: LatLng;
  /** A rail station, or a city centre used only to orient the view. */
  kind: 'station' | 'city';
};

export const LANDMARKS: Landmark[] = [
  { name: 'נהריה', coords: { latitude: 33.0075, longitude: 35.0947 }, kind: 'station' },
  { name: 'עכו', coords: { latitude: 32.9281, longitude: 35.0817 }, kind: 'station' },
  { name: 'חיפה חוף הכרמל', coords: { latitude: 32.7909, longitude: 34.9564 }, kind: 'station' },
  { name: 'עתלית', coords: { latitude: 32.6885, longitude: 34.9425 }, kind: 'station' },
  { name: 'בנימינה', coords: { latitude: 32.5157, longitude: 34.9494 }, kind: 'station' },
  { name: 'חדרה מערב', coords: { latitude: 32.4364, longitude: 34.9174 }, kind: 'station' },
  { name: 'נתניה', coords: { latitude: 32.3186, longitude: 34.8541 }, kind: 'station' },
  { name: 'הרצליה', coords: { latitude: 32.1624, longitude: 34.8443 }, kind: 'station' },
  { name: 'תל אביב מרכז', coords: { latitude: 32.0836, longitude: 34.7981 }, kind: 'station' },
  { name: 'לוד', coords: { latitude: 31.9482, longitude: 34.8797 }, kind: 'station' },
  { name: 'רחובות', coords: { latitude: 31.8928, longitude: 34.8113 }, kind: 'station' },
  { name: 'אשדוד עד הלום', coords: { latitude: 31.8014, longitude: 34.6435 }, kind: 'station' },
  { name: 'באר שבע מרכז', coords: { latitude: 31.2530, longitude: 34.7915 }, kind: 'station' },
  { name: 'ירושלים', coords: { latitude: 31.7683, longitude: 35.2137 }, kind: 'city' },
];

/**
 * The nearest landmark, when the tap was close enough to mean it.
 *
 * Without this a tap on the demo map produces a nameless point and every screen
 * downstream says "the destination you chose", which tells the reader nothing
 * about where they are going. Snapping only within a few kilometres, so a tap
 * in open country stays a coordinate rather than being relabelled as a city it
 * is nowhere near.
 */
export function nearestLandmark(coords: LatLng, withinM = 6_000): Landmark | null {
  let best: Landmark | null = null;
  let bestM = Infinity;

  for (const landmark of LANDMARKS) {
    const dLat = (landmark.coords.latitude - coords.latitude) * 111_000;
    const dLon =
      (landmark.coords.longitude - coords.longitude) *
      111_000 *
      Math.cos((coords.latitude * Math.PI) / 180);
    const m = Math.hypot(dLat, dLon);
    if (m < bestM) {
      bestM = m;
      best = landmark;
    }
  }

  return bestM <= withinM ? best : null;
}
