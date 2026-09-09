import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { PLACES } from './catalog';
import { labelFor, parseQuery, searchCatalog } from './match';
import { normalize } from './normalize';

const HAIFA = { latitude: 32.79, longitude: 34.96 };
const TEL_AVIV = { latitude: 32.0743, longitude: 34.7925 };

const top = (query: string, near = null as null | typeof HAIFA) =>
  searchCatalog(query, near)[0]?.place.name;

describe('the three things people actually type', () => {
  it('finds a station when the query says what kind of place it is', () => {
    // The station is called "ראשון לציון - משה דיין". Nobody types that.
    assert.equal(top('תחנת רכבת משה דיין'), 'ראשון לציון - משה דיין');
    assert.equal(top('משה דיין'), 'ראשון לציון - משה דיין');
  });

  it('finds a place the address geocoders have never heard of', () => {
    assert.equal(top('תחנת אוטובוס עזריאלי'), 'מרכז עזריאלי');
    assert.equal(top('עזריאלי'), 'מרכז עזריאלי');
  });

  it('finds a stadium by its name alone', () => {
    assert.equal(top('איצטדיון כדורגל סמי עופר'), 'אצטדיון סמי עופר');
    assert.equal(top('סמי עופר'), 'אצטדיון סמי עופר');
  });
});

describe('normalisation', () => {
  it('ignores the marks people type inconsistently', () => {
    assert.equal(normalize('נתב״ג'), 'נתבג');
    assert.equal(normalize('כפר חב"ד'), 'כפר חבד');
    assert.equal(normalize('חיפה - חוף הכרמל'), 'חיפה חוף הכרמל');
  });

  it('treats the definite article as optional', () => {
    // Typing the article must not decide whether a place is found. It can
    // change what else is found — "מפרץ" is also a word in "מפרץ שלמה" — so
    // this is about the two the catalog itself names after the bay.
    for (const query of ['המפרץ', 'מפרץ']) {
      const names = searchCatalog(query).map((hit) => hit.place.name);
      assert.ok(names.includes('תחנה מרכזית המפרץ'), query);
      assert.ok(names.includes('חוצות המפרץ'), query);
    }
  });

  it('does not strip a ה that is part of the word', () => {
    // "הרצליה" must not become "רצליה" and match something else.
    assert.equal(top('הרצליה'), 'הרצליה');
    assert.equal(top('הדסה'), 'הדסה עין כרם');
  });
});

describe('query parsing', () => {
  it('reads the category word as a hint and drops it from the terms', () => {
    const parsed = parseQuery('תחנת רכבת חדרה');
    assert.deepEqual(parsed.terms, ['חדרה']);
    assert.equal(parsed.kind, 'train');
  });

  it('keeps a term that only looks like filler', () => {
    // "מרכז" names things — "מרכז עזריאלי", "באר שבע - מרכז" — where the
    // feminine "מרכזית" only ever means a bus terminal.
    assert.equal(parseQuery('תחנה מרכזית').kind, 'bus');
    assert.deepEqual(parseQuery('באר שבע מרכז').terms, ['באר', 'שבע', 'מרכז']);
    assert.equal(top('באר שבע מרכז'), 'באר שבע - מרכז');
  });

  it('answers a query that is nothing but a category', () => {
    const results = searchCatalog('תחנה מרכזית', TEL_AVIV);
    assert.ok(results.length > 0);
    assert.ok(results.every((hit) => hit.place.kind === 'bus'));
    // Nearest first: the query said nothing else to go on.
    assert.equal(results[0].place.city, 'תל אביב');
  });

  it('returns nothing for a query with no signal', () => {
    assert.deepEqual(searchCatalog(''), []);
    assert.deepEqual(searchCatalog('של'), []);
  });
});

describe('the kind hint', () => {
  it('separates two places that share a name', () => {
    // Both are in the catalog at nearly the same point in Jerusalem.
    assert.equal(top('קניון מלחה'), 'קניון מלחה');
    assert.equal(top('תחנת רכבת מלחה'), 'ירושלים - מלחה');
  });

  it('does not exclude a place of another kind', () => {
    // "תחנה מרכזית המפרץ" is the official name of a railway station, even
    // though "מרכזית" hints at a bus terminal.
    const names = searchCatalog('תחנה מרכזית המפרץ').map((hit) => hit.place.name);
    assert.ok(names.includes('תחנה מרכזית המפרץ'));
  });
});

describe('proximity', () => {
  it('orders two equally good matches by who is closer', () => {
    const fromHaifa = searchCatalog('אוניברסיטה', HAIFA)[0].place.name;
    const fromTelAviv = searchCatalog('אוניברסיטה', TEL_AVIV)[0].place.name;
    assert.notEqual(fromHaifa, fromTelAviv);
  });

  it('never lets closeness beat a better name match', () => {
    // Typed in Haifa, but "טדי" is a stadium in Jerusalem and nothing else.
    assert.equal(top('טדי', HAIFA), 'אצטדיון טדי');
  });

  it('reports the distance when it knows where the user is', () => {
    const [hit] = searchCatalog('סמי עופר', HAIFA);
    assert.ok(hit.distanceM !== null && hit.distanceM < 10_000);
    assert.equal(searchCatalog('סמי עופר')[0].distanceM, null);
  });
});

describe('labels', () => {
  it('adds the town when the name does not already say it', () => {
    const stadium = PLACES.find((place) => place.name === 'אצטדיון סמי עופר');
    assert.equal(labelFor(stadium!), 'אצטדיון סמי עופר, חיפה');
  });

  it('does not repeat the town', () => {
    const bus = PLACES.find((place) => place.name === 'התחנה המרכזית נתניה');
    assert.equal(labelFor(bus!), 'התחנה המרכזית נתניה');
  });
});

describe('the catalog itself', () => {
  it('holds the whole railway network', () => {
    assert.equal(PLACES.filter((place) => place.kind === 'train').length, 68);
  });

  it('has no duplicate names', () => {
    const names = PLACES.map((place) => place.name);
    assert.equal(new Set(names).size, names.length);
  });

  it('is entirely inside the country the app serves', () => {
    for (const place of PLACES) {
      const { latitude, longitude } = place.coords;
      assert.ok(
        latitude > 29.4 && latitude < 33.4 && longitude > 34.2 && longitude < 35.9,
        `${place.name} is outside Israel`
      );
    }
  });

  it('finds every place by its own name', () => {
    for (const place of PLACES) {
      const names = searchCatalog(place.name).map((hit) => hit.place.name);
      assert.ok(names.includes(place.name), `${place.name} does not find itself`);
    }
  });
});

describe('words that are not part of any name', () => {
  it('still answers when the query carries an extra word', () => {
    // No curated name has all four of these words, but a real place does: the
    // bus terminal at Hof HaKarmel, which is "ת. מרכזית חוף הכרמל" in Haifa.
    // The station itself stays in the list behind it.
    const names = searchCatalog('חיפה חוף הכרמל מרכז').map((hit) => hit.place.name);
    assert.ok(names.length > 0);
    assert.ok(names.some((name) => name.includes('חוף הכרמל')));
  });

  it('reads a number as part of a name when that is all it can be', () => {
    // "כביש 4" is two words, one of them a number, and it names real stops.
    const names = searchCatalog('כביש 4').map((hit) => hit.place.name);
    assert.ok(names.length > 0);
    assert.ok(names.every((name) => name.includes('4')));
  });

  it('leaves a street address to the geocoder', () => {
    // "תל אביב" matches half a dozen places in the catalog, but a house number
    // means the user is typing an address and none of them is the answer.
    assert.deepEqual(searchCatalog('הרצל 5 תל אביב'), []);
    assert.deepEqual(searchCatalog('דיזנגוף 100'), []);
  });

  it('does not answer on the strength of one word out of four', () => {
    assert.deepEqual(searchCatalog('רחוב ההסתדרות פינת ויצמן'), []);
  });
});
