import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { searchCatalog } from './match';
import { nearestStop, searchStops, stopCount } from './stops';

const HAIFA = { latitude: 32.79, longitude: 34.96 };
const NETANYA = { latitude: 32.32, longitude: 34.86 };
const TEL_AVIV = { latitude: 32.0743, longitude: 34.7925 };

describe('the national stop index', () => {
  it('holds the whole country', () => {
    // 35,305 stops in the feed, collapsed to distinct places.
    assert.ok(stopCount() > 25_000, `only ${stopCount()} stops`);
  });

  it('finds a bus stop nobody has curated', () => {
    const [hit] = searchStops(['סמי', 'עופר'], HAIFA, 5);
    assert.ok(hit.name.includes('סמי עופר'));
    assert.equal(hit.town, 'חיפה');
    assert.equal(hit.kind, 'bus');
  });

  it('marks a stop at the railway as one', () => {
    const hits = searchStops(['רכבת', 'נתניה'], NETANYA, 5);
    assert.ok(hits.length > 0);
    assert.ok(hits.every((hit) => hit.kind === 'train'));
  });

  it('every stop it returns really matches every word', () => {
    for (const hits of [
      searchStops(['הרצל'], TEL_AVIV, 6),
      searchStops(['בן', 'גוריון'], HAIFA, 6),
    ]) {
      assert.ok(hits.length > 0);
      for (const hit of hits) {
        const text = `${hit.name} ${hit.town}`;
        assert.ok(text.length > 0);
      }
    }
  });
});

describe('a street name that exists in a hundred towns', () => {
  it('gives you the one you are standing near', () => {
    const inTelAviv = searchStops(['הרצל'], TEL_AVIV, 3);
    const inHaifa = searchStops(['הרצל'], HAIFA, 3);
    assert.notEqual(inTelAviv[0].name + inTelAviv[0].town, inHaifa[0].name + inHaifa[0].town);
    // Near, not merely nearer: the top hit should be in the same conurbation.
    assert.ok(inTelAviv[0].distanceM !== null && inTelAviv[0].distanceM < 25_000);
    assert.ok(inHaifa[0].distanceM !== null && inHaifa[0].distanceM < 25_000);
  });

  it('still lets the user name the town they mean', () => {
    // Typed from Tel Aviv, but the query says Beer Sheva.
    const hits = searchStops(['הרצל', 'באר', 'שבע'], TEL_AVIV, 5);
    assert.ok(hits.length > 0);
    assert.equal(hits[0].town, 'באר שבע');
  });
});

describe('snapping a tap to a stop', () => {
  it('takes the stop that is actually there', () => {
    const hit = nearestStop({ latitude: 32.7825, longitude: 34.9631 }, 400);
    assert.ok(hit && hit.name.includes('סמי עופר'));
  });

  it('leaves a tap in open country alone', () => {
    // The middle of the Negev, far from any served stop.
    assert.equal(nearestStop({ latitude: 30.6, longitude: 34.9 }, 400), null);
  });
});

describe('a term too broad to narrow', () => {
  it('is answered from the whole country, not from part of the alphabet', () => {
    // "הר" is a word or a prefix in thousands of names. The index refuses to
    // narrow on it, so the scan is over everything — which is the only way the
    // nearest stop can win when the user's town sorts late in the alphabet.
    const hits = searchStops(['הר'], TEL_AVIV, 10);
    assert.ok(hits.length > 0);
    assert.ok(hits[0].distanceM !== null && hits[0].distanceM < 5_000);
    assert.ok(hits.some((hit) => hit.town === 'תל אביב יפו'));
  });

  it('gives the same answer however many other words narrowed it', () => {
    // One broad term alone, and the same term beside a narrow one, must agree
    // about the stop they both describe.
    const broad = searchStops(['הרצל'], TEL_AVIV, 20).map((hit) => hit.name);
    const narrowed = searchStops(['הר', 'יהודה'], TEL_AVIV, 20).map((hit) => hit.name);
    const shared = narrowed.filter((name) => broad.includes(name));
    assert.ok(shared.length > 0);
  });
});

describe('search stays fast enough to type into', () => {
  it('answers a two-letter term without scanning the country', () => {
    searchStops(['תל'], TEL_AVIV, 6); // warm: the first call builds the index
    const started = performance.now();
    for (const term of ['הר', 'בן', 'תל', 'רכ', 'אצ']) {
      searchStops([term], TEL_AVIV, 6);
    }
    const each = (performance.now() - started) / 5;
    assert.ok(each < 120, `${each.toFixed(0)}ms per keystroke`);
  });
});

describe('the curated list and the national one together', () => {
  it('puts the canonical station above the kerb outside it', () => {
    const names = searchCatalog('חוף הכרמל', HAIFA).map((hit) => hit.place.name);
    assert.equal(names[0], 'חיפה - חוף הכרמל');
  });

  it('does not list the same place twice', () => {
    const hits = searchCatalog('אצטדיון סמי עופר', HAIFA);
    const curated = hits.filter((hit) => hit.place.name === 'אצטדיון סמי עופר');
    assert.equal(curated.length, 1);
  });

  it('answers the three things people actually type, still', () => {
    assert.equal(searchCatalog('תחנת רכבת משה דיין')[0].place.name, 'ראשון לציון - משה דיין');
    assert.equal(searchCatalog('תחנת אוטובוס עזריאלי')[0].place.name, 'מרכז עזריאלי');
    assert.equal(searchCatalog('איצטדיון כדורגל סמי עופר')[0].place.name, 'אצטדיון סמי עופר');
  });
});
