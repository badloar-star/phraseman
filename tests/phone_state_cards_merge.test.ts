import {
  cardOperations,
  cardsProjectionFromReducerState,
  createCardsReducer,
  replayCards,
} from '../modules/phone-state/domains/cards';
import type { PersonalOperation } from '../modules/phone-state/contracts';

const clock = (deviceId: string, counter: number) => ({ deviceId, counter });

test('remote old add cannot resurrect a deleted card', () => {
  const state = replayCards([
    cardOperations.upsertCard('card-1', clock('a', 1), { front: 'one', back: 'uno' }),
    cardOperations.deleteCard('card-1', clock('a', 3)),
    cardOperations.upsertCard('card-1', clock('b', 2), { front: 'old', back: 'viejo' }),
  ]);
  expect(state.visibleCards).not.toHaveProperty('card-1');
});

test('editing one card never overwrites unrelated device cards', () => {
  const state = replayCards([
    cardOperations.upsertCard('a', clock('a', 1), { front: 'A' }),
    cardOperations.upsertCard('b', clock('b', 1), { front: 'B' }),
    cardOperations.upsertCard('a', clock('a', 2), { back: 'AA' }),
  ]);
  expect(Object.keys(state.visibleCards)).toEqual(['a', 'b']);
  expect(state.visibleCards.a).toEqual({ front: 'A', back: 'AA' });
});

test('membership changes merge per card and deck', () => {
  const state = replayCards([
    cardOperations.setDeckMembership('a', 'deck-1', true, clock('a', 1)),
    cardOperations.setDeckMembership('b', 'deck-1', true, clock('b', 1)),
    cardOperations.setDeckMembership('a', 'deck-1', false, clock('a', 2)),
  ]);
  expect(state.memberships['deck-1']).toEqual(['b']);
});

function operation(
  operationId: string,
  deviceId: string,
  counter: number,
  kind: string,
  entityId: string | null,
  payload: unknown,
): PersonalOperation {
  return {
    schemaVersion: 1,
    operationId,
    stableUid: 'stable-1',
    accountGeneration: 1,
    deviceId,
    deviceSequence: counter,
    hybridClock: clock(deviceId, counter),
    domain: 'cards',
    kind,
    entityId,
    payload,
    exactResult: null,
    createdAtMs: counter,
    fingerprint: 'a'.repeat(64),
  };
}

test('cards reducer imports legacy cards once and then preserves unrelated remote cards', () => {
  const reducer = createCardsReducer();
  let state = reducer.initial();
  state = reducer.apply(state, operation('opening', 'a', 1, 'opening_import', null, {
    cards: [{ id: 'legacy', front: 'old' }],
  }));
  state = reducer.apply(state, operation('remote', 'b', 2, 'upsert_card', 'remote', {
    fields: { front: 'new' },
  }));
  state = reducer.apply(state, operation('edit', 'a', 3, 'upsert_card', 'legacy', {
    fields: { back: 'kept' },
  }));

  expect(cardsProjectionFromReducerState(state).visibleCards).toEqual({
    legacy: { id: 'legacy', front: 'old', back: 'kept' },
    remote: { front: 'new' },
  });
  expect(state.legacyImported).toBe(true);
});
