import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  closeTrip,
  MAX_TRIPS,
  normaliseTrips,
  orderTrips,
  withTrip,
  type Trip,
} from './trips';

const place = (label: string) => ({ label, coords: { latitude: 32.07, longitude: 34.79 } });

const trip = (id: string, armedAt: number, outcome: Trip['outcome'] = 'open'): Trip => ({
  id,
  destination: place(`יעד ${id}`),
  radiusM: 500,
  armedAt,
  endedAt: outcome === 'open' ? null : armedAt + 1_000,
  outcome,
});

describe('recording a trip', () => {
  it('puts the newest first', () => {
    const list = withTrip(withTrip([], trip('a', 100)), trip('b', 200));
    assert.deepEqual(list.map((x) => x.id), ['b', 'a']);
  });

  it('replaces rather than duplicates the same session', () => {
    // The store re-records an armed session when it hydrates after a restart.
    const list = withTrip(withTrip([], trip('a', 100)), trip('a', 100));
    assert.equal(list.length, 1);
  });

  it('keeps the list bounded', () => {
    let list: Trip[] = [];
    for (let i = 0; i < MAX_TRIPS + 12; i++) list = withTrip(list, trip(`t${i}`, i));
    assert.equal(list.length, MAX_TRIPS);
    // The cap drops the oldest, never the newest.
    assert.equal(list[0].id, `t${MAX_TRIPS + 11}`);
  });
});

describe('closing a trip out', () => {
  it('closes the one named', () => {
    const list = closeTrip([trip('a', 100), trip('b', 200)], 'woken', 500, 'a');
    assert.equal(list.find((x) => x.id === 'a')?.outcome, 'woken');
    assert.equal(list.find((x) => x.id === 'b')?.outcome, 'open');
  });

  it('closes the newest open one when the id is gone', () => {
    // A process restarted between arming and arriving no longer knows which
    // session it was. Only one alarm is ever armed, so there is one candidate.
    const list = closeTrip([trip('a', 100), trip('b', 200)], 'cancelled', 500);
    assert.equal(list.find((x) => x.id === 'b')?.outcome, 'cancelled');
    assert.equal(list.find((x) => x.id === 'a')?.outcome, 'open');
  });

  it('never reopens or re-closes one that is already finished', () => {
    const done = [trip('a', 100, 'woken')];
    assert.deepEqual(closeTrip(done, 'cancelled', 900, 'a'), done);
    assert.deepEqual(closeTrip(done, 'cancelled', 900), done);
  });

  it('stamps when it ended', () => {
    const [only] = closeTrip([trip('a', 100)], 'woken', 777, 'a');
    assert.equal(only.endedAt, 777);
  });
});

describe('reading a stored blob back', () => {
  it('survives anything that is not a list', () => {
    for (const bad of [null, undefined, 7, 'x', {}]) {
      assert.deepEqual(normaliseTrips(bad), []);
    }
  });

  it('drops broken rows without losing the good ones', () => {
    const raw = [
      trip('good', 100),
      { id: 'no-coords', armedAt: 1, radiusM: 500, destination: { label: 'x' } },
      { armedAt: 1, radiusM: 500, destination: place('no id') },
      null,
    ];
    const clean = normaliseTrips(raw);
    assert.deepEqual(clean.map((x) => x.id), ['good']);
  });

  it('treats an unknown outcome as still open', () => {
    const [only] = normaliseTrips([{ ...trip('a', 100), outcome: 'exploded' }]);
    assert.equal(only.outcome, 'open');
  });

  it('orders and caps whatever it was given', () => {
    const raw = [trip('a', 100), trip('c', 300), trip('b', 200)];
    assert.deepEqual(orderTrips(normaliseTrips(raw)).map((x) => x.id), ['c', 'b', 'a']);
  });
});
