import type { LatLng } from '../../types';

/**
 * A hand-kept index of named places in Israel.
 *
 * Why this file exists: `Location.geocodeAsync` is `CLGeocoder` on iOS and
 * `android.location.Geocoder` on Android. Both resolve *addresses* — a street,
 * a number, a city. Neither knows a point of interest, so "תחנת רכבת משה דיין",
 * "עזריאלי" and "אצטדיון סמי עופר" all return nothing on both platforms. The
 * things people actually name as a destination on public transport are exactly
 * the things an address geocoder cannot find.
 *
 * A hosted place API (Google Places, Mapbox) would solve it and costs an API
 * key, a billing account, and every search leaving the phone. For a country
 * this size the named landmarks worth waking up at are a list, not a service —
 * so it is a list, and it ships in the bundle. Offline, no key, no request.
 *
 * ── On the coordinates ───────────────────────────────────────────────────────
 * These are hand-entered and good to roughly a hundred metres, not surveyed.
 * They are not used as the final answer where anything better exists: the
 * catalog's real job is to recognise the *name* and hand the platform geocoder
 * a well-formed address string it can resolve precisely (see `resolve()` in
 * ./resolve.ts). The coordinate here is the anchor that decides whether the
 * geocoder's answer is the same place, and the fallback when it has none. A
 * hundred metres is ample for both, and the user sees the pin on the map
 * before they arm anything.
 *
 * Station names and the set of stations are the official rail.co.il list.
 */

export type PlaceKind =
  | 'train'
  | 'bus'
  | 'stadium'
  | 'airport'
  | 'campus'
  | 'hospital'
  | 'mall';

export type Place = {
  /** Hebrew name, spelled the way the operator spells it. */
  name: string;
  nameEn: string;
  kind: PlaceKind;
  /** Town, for disambiguating "מרכז" and for building a geocoder query. */
  city?: string;
  /** Other things people type for this place. Matched, never displayed. */
  aliases?: string[];
  coords: LatLng;
};

const train = (
  name: string,
  nameEn: string,
  latitude: number,
  longitude: number,
  aliases?: string[]
): Place => ({ name, nameEn, kind: 'train', aliases, coords: { latitude, longitude } });

/** Israel Railways, all 69 stations. */
const RAIL: Place[] = [
  train('נהריה', 'Nahariya', 33.0068, 35.0975),
  train('עכו', 'Ako', 32.9268, 35.079, ['עכו']),
  train('כרמיאל', 'Karmiel', 32.913, 35.29),
  train('אחיהוד', 'Ahihud', 32.919, 35.183),
  train('קריית מוצקין', 'Kiryat Motzkin', 32.8341, 35.0722, ['קרית מוצקין']),
  train('קריית חיים', 'Kiryat Hayim', 32.8253, 35.051, ['קרית חיים']),
  train('חוצות המפרץ', 'Hutsot HaMifrats', 32.8028, 35.0452),
  train('תחנה מרכזית המפרץ', 'HaMifrats Central Station', 32.7938, 35.0554, [
    'מרכזית המפרץ',
    'לב המפרץ',
  ]),
  train('חיפה - בת גלים', 'Haifa-Bat Galim', 32.832, 34.9905, ['בת גלים']),
  train('חיפה מרכז - השמונה', 'Haifa Center-HaShmona', 32.8212, 35.0005, [
    'חיפה מרכז',
    'השמונה',
  ]),
  train('חיפה - חוף הכרמל', 'Haifa-Hof HaKarmel', 32.7906, 34.9585, ['חוף הכרמל']),
  train('עתלית', 'Atlit', 32.6937, 34.9403),
  train('בנימינה', 'Binyamina', 32.5183, 34.949),
  train('קיסריה - פרדס חנה', 'Caesarea-Pardes Hana', 32.4783, 34.942, ['פרדס חנה']),
  train('חדרה - מערב', 'Hadera-West', 32.4405, 34.9038, ['חדרה']),
  train('נתניה', 'Netanya', 32.317, 34.8595),
  train('נתניה - ספיר', 'Netanya-Sapir', 32.29, 34.854, ['ספיר']),
  train('בית יהושע', 'Bet Yehoshua', 32.274, 34.8615),
  train('הרצליה', 'Hertsliya', 32.1646, 34.8322),
  train('תל אביב - אוניברסיטה', 'Tel Aviv-University', 32.1032, 34.8047, [
    'אוניברסיטה',
    'תל אביב אוניברסיטה',
  ]),
  train('תל אביב - סבידור מרכז', 'Tel Aviv-Savidor Center', 32.0836, 34.798, [
    'סבידור',
    'רכבת מרכז',
    'ארלוזורוב',
  ]),
  train('תל אביב - השלום', 'Tel Aviv-HaShalom', 32.0733, 34.7935, ['השלום', 'עזריאלי']),
  train('תל אביב - ההגנה', 'Tel Aviv-HaHagana', 32.0545, 34.788, ['ההגנה']),
  train('בני ברק', 'Bnei Brak', 32.0885, 34.832),
  train('פתח תקווה - קריית אריה', 'Petah Tikva-Kiryat Arye', 32.0968, 34.8508, [
    'קריית אריה',
    'קרית אריה',
  ]),
  train('פתח תקווה - סגולה', 'Petah Tikva-Segula', 32.1088, 34.879, ['סגולה']),
  train('ראש העין - צפון', 'Rosh HaAyin-North', 32.109, 34.956, ['ראש העין']),
  train('כפר סבא - נורדאו', 'Kfar Sava-Nordau', 32.172, 34.913, ['כפר סבא']),
  train('הוד השרון - סוקולוב', 'Hod HaSharon-Sokolov', 32.15, 34.884, ['הוד השרון']),
  train('רעננה מערב', 'Raanana West', 32.193, 34.848),
  train('רעננה דרום', 'Raanana South', 32.174, 34.86),
  train('צומת חולון', 'Holon Junction', 32.0292, 34.7855, ['חולון']),
  train('חולון - וולפסון', 'Holon-Wolfson', 32.0175, 34.777, ['וולפסון']),
  train('בת ים - יוספטל', 'Bat Yam-Yoseftal', 32.014, 34.753, ['יוספטל']),
  train('בת ים - קוממיות', 'Bat Yam-Komemiyut', 32.006, 34.748, ['קוממיות']),
  train('כפר חב״ד', 'Kfar Habad', 31.993, 34.856, ['כפר חבד']),
  train('נתב״ג', 'Ben Gurion Airport', 32.0, 34.871, ['נתבג', 'שדה התעופה', 'בן גוריון']),
  train('לוד', 'Lod', 31.948, 34.876),
  train('לוד - גני אביב', 'Lod-Gane Aviv', 31.967, 34.883, ['גני אביב']),
  train('רמלה', 'Ramla', 31.928, 34.872),
  train('באר יעקב', 'Beer Yaakov', 31.942, 34.833),
  train('רחובות', 'Rehovot', 31.907, 34.796),
  train('מזכרת בתיה', 'Mazkeret Batya', 31.856, 34.838),
  train('ראשון לציון - הראשונים', 'Rishon LeTsiyon-HaRishonim', 31.97, 34.802, [
    'הראשונים',
  ]),
  train('ראשון לציון - משה דיין', 'Rishon LeTsiyon-Moshe Dayan', 31.963, 34.7845, [
    'משה דיין',
  ]),
  train('יבנה - מזרח', 'Yavne-East', 31.87, 34.748),
  train('יבנה - מערב', 'Yavne-West', 31.879, 34.728),
  train('אשדוד - עד הלום', 'Ashdod-Ad Halom', 31.781, 34.67, ['אשדוד', 'עד הלום']),
  train('אשקלון', 'Ashkelon', 31.682, 34.592),
  train('קריית מלאכי - יואב', 'Kiryat Malakhi-Yoav', 31.696, 34.748, ['קרית מלאכי']),
  train('קריית גת', 'Kiryat Gat', 31.603, 34.772, ['קרית גת']),
  train('שדרות', 'Sderot', 31.525, 34.596),
  train('נתיבות', 'Netivot', 31.42, 34.59),
  train('אופקים', 'Ofakim', 31.312, 34.618),
  train('להבים - רהט', 'Lehavim-Rahat', 31.372, 34.801, ['להבים', 'רהט']),
  train('באר שבע - צפון', 'Beer Sheva-North', 31.262, 34.801, ['באר שבע צפון']),
  train('באר שבע - מרכז', 'Beer Sheva-Center', 31.243, 34.798, ['באר שבע מרכז']),
  train('דימונה', 'Dimona', 31.07, 35.025),
  train('בית שמש', 'Bet Shemesh', 31.748, 34.988),
  train('ירושלים - יצחק נבון', 'Jerusalem-Yitzhak Navon', 31.788, 35.203, [
    'יצחק נבון',
    'ירושלים',
    'הרכבת המהירה',
  ]),
  train('ירושלים - מלחה', 'Jerusalem-Malha', 31.755, 35.188, ['מלחה']),
  train('ירושלים - גן החיות', 'Jerusalem-Biblical Zoo', 31.748, 35.183, ['גן החיות']),
  train('פאתי מודיעין', 'Paate Modiin', 31.9048, 35.008),
  train('מודיעין - מרכז', 'Modiin-Center', 31.9013, 35.008, ['מודיעין']),
  train('יקנעם - כפר יהושע', 'Yokneam-Kfar Yehoshua', 32.691, 35.161, ['יקנעם']),
  train('מגדל העמק - כפר ברוך', 'Migdal HaEmek-Kfar Barukh', 32.6773, 35.232, [
    'מגדל העמק',
  ]),
  train('עפולה ר. איתן', 'Afula R.Eitan', 32.61, 35.288, ['עפולה']),
  train('בית שאן', 'Beit Shean', 32.4993, 35.5017),
];

/** Everything that is not a railway station. */
const LANDMARKS: Place[] = [
  // ── Bus ────────────────────────────────────────────────────────────────────
  {
    name: 'התחנה המרכזית תל אביב',
    nameEn: 'Tel Aviv Central Bus Station',
    kind: 'bus',
    city: 'תל אביב',
    aliases: ['תחנה מרכזית תל אביב', 'התחנה המרכזית החדשה'],
    coords: { latitude: 32.057, longitude: 34.779 },
  },
  {
    name: 'התחנה המרכזית ירושלים',
    nameEn: 'Jerusalem Central Bus Station',
    kind: 'bus',
    city: 'ירושלים',
    aliases: ['תחנה מרכזית ירושלים'],
    coords: { latitude: 31.789, longitude: 35.203 },
  },
  {
    name: 'התחנה המרכזית באר שבע',
    nameEn: 'Beer Sheva Central Bus Station',
    kind: 'bus',
    city: 'באר שבע',
    aliases: ['תחנה מרכזית באר שבע'],
    coords: { latitude: 31.243, longitude: 34.798 },
  },
  {
    name: 'התחנה המרכזית נתניה',
    nameEn: 'Netanya Central Bus Station',
    kind: 'bus',
    city: 'נתניה',
    coords: { latitude: 32.329, longitude: 34.857 },
  },
  {
    name: 'התחנה המרכזית אשדוד',
    nameEn: 'Ashdod Central Bus Station',
    kind: 'bus',
    city: 'אשדוד',
    coords: { latitude: 31.8, longitude: 34.648 },
  },
  {
    name: 'התחנה המרכזית פתח תקווה',
    nameEn: 'Petah Tikva Central Bus Station',
    kind: 'bus',
    city: 'פתח תקווה',
    coords: { latitude: 32.088, longitude: 34.883 },
  },

  // ── Air ────────────────────────────────────────────────────────────────────
  {
    name: 'נמל התעופה בן גוריון',
    nameEn: 'Ben Gurion Airport',
    kind: 'airport',
    aliases: ['נתבג', 'נתב״ג', 'שדה התעופה', 'טרמינל 3'],
    coords: { latitude: 32.0055, longitude: 34.8854 },
  },
  {
    name: 'שדה התעופה רמון',
    nameEn: 'Ramon Airport',
    kind: 'airport',
    city: 'אילת',
    aliases: ['נמל התעופה רמון'],
    coords: { latitude: 29.723, longitude: 35.014 },
  },

  // ── Stadiums and arenas ────────────────────────────────────────────────────
  {
    name: 'אצטדיון סמי עופר',
    nameEn: 'Sammy Ofer Stadium',
    kind: 'stadium',
    city: 'חיפה',
    aliases: ['סמי עופר'],
    coords: { latitude: 32.7838, longitude: 34.9655 },
  },
  {
    name: 'אצטדיון בלומפילד',
    nameEn: 'Bloomfield Stadium',
    kind: 'stadium',
    city: 'תל אביב',
    aliases: ['בלומפילד'],
    coords: { latitude: 32.0525, longitude: 34.762 },
  },
  {
    name: 'אצטדיון טדי',
    nameEn: 'Teddy Stadium',
    kind: 'stadium',
    city: 'ירושלים',
    aliases: ['טדי'],
    coords: { latitude: 31.7515, longitude: 35.1875 },
  },
  {
    name: 'אצטדיון טרנר',
    nameEn: 'Turner Stadium',
    kind: 'stadium',
    city: 'באר שבע',
    aliases: ['טרנר'],
    coords: { latitude: 31.247, longitude: 34.809 },
  },
  {
    name: 'אצטדיון נתניה',
    nameEn: 'Netanya Stadium',
    kind: 'stadium',
    city: 'נתניה',
    coords: { latitude: 32.293, longitude: 34.862 },
  },
  {
    name: 'אצטדיון המושבה',
    nameEn: 'HaMoshava Stadium',
    kind: 'stadium',
    city: 'פתח תקווה',
    aliases: ['המושבה'],
    coords: { latitude: 32.087, longitude: 34.872 },
  },
  {
    name: 'היכל מנורה מבטחים',
    nameEn: 'Menora Mivtachim Arena',
    kind: 'stadium',
    city: 'תל אביב',
    aliases: ['יד אליהו', 'היכל נוקיה'],
    coords: { latitude: 32.051, longitude: 34.794 },
  },

  // ── Malls and centres ──────────────────────────────────────────────────────
  {
    name: 'מרכז עזריאלי',
    nameEn: 'Azrieli Center',
    kind: 'mall',
    city: 'תל אביב',
    aliases: ['עזריאלי', 'קניון עזריאלי', 'מגדלי עזריאלי'],
    coords: { latitude: 32.0743, longitude: 34.7925 },
  },
  {
    name: 'דיזנגוף סנטר',
    nameEn: 'Dizengoff Center',
    kind: 'mall',
    city: 'תל אביב',
    aliases: ['דיזנגוף'],
    coords: { latitude: 32.0755, longitude: 34.7745 },
  },
  {
    name: 'קניון איילון',
    nameEn: 'Ayalon Mall',
    kind: 'mall',
    city: 'רמת גן',
    aliases: ['איילון'],
    coords: { latitude: 32.084, longitude: 34.801 },
  },
  {
    name: 'קניון רמת אביב',
    nameEn: 'Ramat Aviv Mall',
    kind: 'mall',
    city: 'תל אביב',
    aliases: ['רמת אביב'],
    coords: { latitude: 32.113, longitude: 34.796 },
  },
  {
    name: 'גרנד קניון חיפה',
    nameEn: 'Grand Kanyon Haifa',
    kind: 'mall',
    city: 'חיפה',
    aliases: ['גרנד קניון'],
    coords: { latitude: 32.794, longitude: 35.018 },
  },
  {
    name: 'קניון מלחה',
    nameEn: 'Malha Mall',
    kind: 'mall',
    city: 'ירושלים',
    coords: { latitude: 31.751, longitude: 35.187 },
  },
  {
    name: 'קניון הזהב',
    nameEn: 'HaZahav Mall',
    kind: 'mall',
    city: 'ראשון לציון',
    coords: { latitude: 31.984, longitude: 34.777 },
  },

  // ── Campuses ───────────────────────────────────────────────────────────────
  {
    name: 'אוניברסיטת תל אביב',
    nameEn: 'Tel Aviv University',
    kind: 'campus',
    city: 'תל אביב',
    coords: { latitude: 32.1133, longitude: 34.8044 },
  },
  {
    name: 'האוניברסיטה העברית - הר הצופים',
    nameEn: 'Hebrew University-Mount Scopus',
    kind: 'campus',
    city: 'ירושלים',
    aliases: ['הר הצופים', 'האוניברסיטה העברית'],
    coords: { latitude: 31.794, longitude: 35.244 },
  },
  {
    name: 'הטכניון',
    nameEn: 'Technion',
    kind: 'campus',
    city: 'חיפה',
    coords: { latitude: 32.777, longitude: 35.023 },
  },
  {
    name: 'אוניברסיטת חיפה',
    nameEn: 'University of Haifa',
    kind: 'campus',
    city: 'חיפה',
    coords: { latitude: 32.762, longitude: 35.02 },
  },
  {
    name: 'אוניברסיטת בן גוריון',
    nameEn: 'Ben Gurion University',
    kind: 'campus',
    city: 'באר שבע',
    aliases: ['בן גוריון בנגב'],
    coords: { latitude: 31.262, longitude: 34.801 },
  },
  {
    name: 'אוניברסיטת בר אילן',
    nameEn: 'Bar Ilan University',
    kind: 'campus',
    city: 'רמת גן',
    aliases: ['בר אילן'],
    coords: { latitude: 32.07, longitude: 34.843 },
  },
  {
    name: 'מכון ויצמן למדע',
    nameEn: 'Weizmann Institute',
    kind: 'campus',
    city: 'רחובות',
    aliases: ['ויצמן'],
    coords: { latitude: 31.907, longitude: 34.81 },
  },
  {
    name: 'האוניברסיטה הפתוחה',
    nameEn: 'Open University',
    kind: 'campus',
    city: 'רעננה',
    coords: { latitude: 32.181, longitude: 34.876 },
  },
  {
    name: 'אוניברסיטת אריאל',
    nameEn: 'Ariel University',
    kind: 'campus',
    city: 'אריאל',
    coords: { latitude: 32.105, longitude: 35.205 },
  },

  // ── Hospitals ──────────────────────────────────────────────────────────────
  {
    name: 'איכילוב',
    nameEn: 'Ichilov Hospital',
    kind: 'hospital',
    city: 'תל אביב',
    aliases: ['תל אביב סוראסקי', 'סוראסקי'],
    coords: { latitude: 32.08, longitude: 34.79 },
  },
  {
    name: 'שיבא תל השומר',
    nameEn: 'Sheba Tel HaShomer',
    kind: 'hospital',
    city: 'רמת גן',
    aliases: ['תל השומר', 'שיבא'],
    coords: { latitude: 32.044, longitude: 34.843 },
  },
  {
    name: 'רמב״ם',
    nameEn: 'Rambam Hospital',
    kind: 'hospital',
    city: 'חיפה',
    aliases: ['רמבם'],
    coords: { latitude: 32.834, longitude: 34.988 },
  },
  {
    name: 'הדסה עין כרם',
    nameEn: 'Hadassah Ein Kerem',
    kind: 'hospital',
    city: 'ירושלים',
    aliases: ['עין כרם'],
    coords: { latitude: 31.765, longitude: 35.121 },
  },
  {
    name: 'בילינסון',
    nameEn: 'Beilinson Hospital',
    kind: 'hospital',
    city: 'פתח תקווה',
    aliases: ['רבין'],
    coords: { latitude: 32.087, longitude: 34.856 },
  },
  {
    name: 'סורוקה',
    nameEn: 'Soroka Hospital',
    kind: 'hospital',
    city: 'באר שבע',
    coords: { latitude: 31.257, longitude: 34.8 },
  },
  {
    name: 'שמיר - אסף הרופא',
    nameEn: 'Shamir-Assaf HaRofe',
    kind: 'hospital',
    city: 'באר יעקב',
    aliases: ['אסף הרופא', 'שמיר'],
    coords: { latitude: 31.964, longitude: 34.839 },
  },
  {
    name: 'וולפסון',
    nameEn: 'Wolfson Hospital',
    kind: 'hospital',
    city: 'חולון',
    coords: { latitude: 32.017, longitude: 34.777 },
  },
  {
    name: 'מאיר',
    nameEn: 'Meir Hospital',
    kind: 'hospital',
    city: 'כפר סבא',
    coords: { latitude: 32.175, longitude: 34.908 },
  },
];

export const PLACES: Place[] = [...RAIL, ...LANDMARKS];
