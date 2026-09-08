import { PLACES } from '../../services/places/catalog';
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
 * place that exists where it is plotted.
 *
 * The points come from the search catalog rather than a second list of their
 * own, so the pin the demo draws and the pin the search returns are the same
 * pin. Only a subset is drawn: sixty-eight stations at this zoom is a smear of
 * overlapping labels, so this is the corridor a passenger would recognise.
 */
export type Landmark = {
  name: string;
  coords: LatLng;
};

/** Drawn on the demo map, north to south. Named exactly as the catalog names them. */
const SHOWN = [
  'נהריה',
  'עכו',
  'חיפה - חוף הכרמל',
  'עתלית',
  'בנימינה',
  'חדרה - מערב',
  'נתניה',
  'הרצליה',
  'תל אביב - סבידור מרכז',
  'לוד',
  'רחובות',
  'אשדוד - עד הלום',
  'אשקלון',
  'באר שבע - מרכז',
  'ירושלים - יצחק נבון',
];

/** How the name reads on a map label, where the qualifier is just noise. */
function short(name: string): string {
  return name.replace(/ - .*/, '').replace(/^תחנה מרכזית /, '');
}

export const LANDMARKS: Landmark[] = SHOWN.map((name) => {
  const place = PLACES.find((candidate) => candidate.name === name);
  // A typo here would silently drop a point off the map, so it is a build-time
  // failure rather than a hole in the drawing.
  if (!place) throw new Error(`landmarks: no catalog entry named "${name}"`);
  return { name: short(place.name), coords: place.coords };
});
