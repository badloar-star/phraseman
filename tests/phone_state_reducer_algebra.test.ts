import { canonicalJson } from '../modules/phone-state/canonical';
import type { PersonalOperation } from '../modules/phone-state/contracts';
import { createReducerRegistry, type DomainReducer } from '../modules/phone-state/reducer_registry';
import { createCounterReducer } from '../modules/phone-state/reducers/counter';
import { createEntityReducer } from '../modules/phone-state/reducers/entities';
import {
  canSpend,
  economyReducer,
  type EconomyState,
} from '../modules/phone-state/reducers/economy';
import { createRegisterReducer } from '../modules/phone-state/reducers/register';
import { createSetMaxReducer } from '../modules/phone-state/reducers/sets';
import { streakReducer, type StreakState } from '../modules/phone-state/reducers/streak';

function operation(
  domain: string,
  operationId: string,
  counter: number,
  payload: unknown,
  options: Readonly<{ kind?: string; entityId?: string | null }> = {},
): PersonalOperation {
  return {
    schemaVersion: 1,
    operationId,
    stableUid: 'stable-1',
    accountGeneration: 1,
    deviceId: counter % 2 === 0 ? 'device-b' : 'device-a',
    deviceSequence: counter,
    hybridClock: {
      counter,
      deviceId: counter % 2 === 0 ? 'device-b' : 'device-a',
    },
    domain,
    kind: options.kind ?? 'apply',
    entityId: options.entityId ?? null,
    payload,
    exactResult: null,
    createdAtMs: counter,
    fingerprint: counter.toString(16).padStart(64, '0'),
  };
}

function replayState<State>(
  reducer: DomainReducer<State>,
  operations: readonly PersonalOperation[],
): State {
  const result = createReducerRegistry([reducer]).replay(reducer.domain, operations);
  expect(result.kind).toBe('applied');
  if (result.kind !== 'applied') {
    throw new Error(`unexpected_quarantine:${result.reason}`);
  }
  return result.projection.state as State;
}

function expectAlgebra<State>(
  reducer: DomainReducer<State>,
  operations: readonly PersonalOperation[],
): void {
  const once = canonicalJson(replayState(reducer, operations));
  expect(canonicalJson(replayState(reducer, [...operations, operations[0]]))).toBe(once);
  expect(canonicalJson(replayState(reducer, [...operations].reverse()))).toBe(once);
  const split = Math.ceil(operations.length / 2);
  expect(canonicalJson(replayState(reducer, [
    ...operations.slice(split),
    ...operations.slice(0, split),
  ]))).toBe(once);
}

const counterReducer = createCounterReducer('counter');
const counterOperations = [
  operation('counter', 'counter-a', 1, { delta: 3 }),
  operation('counter', 'counter-b', 2, { delta: -1 }),
  operation('counter', 'counter-c', 3, { delta: 5 }),
];

const setMaxReducer = createSetMaxReducer('set-max');
const setMaxOperations = [
  operation('set-max', 'set-a', 1, { ids: ['a', 'b'], observation: 2 }),
  operation('set-max', 'set-b', 2, { ids: ['b', 'c'], observation: 8 }),
  operation('set-max', 'set-c', 3, { ids: ['d'], observation: 4 }),
];

const registerReducer = createRegisterReducer('register');
const registerOperations = [
  operation('register', 'register-a', 1, { fields: { name: 'old', level: 1 } }),
  operation('register', 'register-b', 4, { fields: { name: 'new' } }),
  operation('register', 'register-c', 3, { fields: { level: 2 } }),
];

const entityReducer = createEntityReducer('entities');
const entityOperations = [
  operation('entities', 'entity-a', 1, { fields: { title: 'old' } }, {
    kind: 'upsert',
    entityId: 'card-1',
  }),
  operation('entities', 'entity-delete', 3, {}, {
    kind: 'delete',
    entityId: 'card-1',
  }),
  operation('entities', 'entity-new', 5, { fields: { title: 'restored' } }, {
    kind: 'upsert',
    entityId: 'card-1',
  }),
];

const streakOperations = [
  operation('streak', 'streak-a', 1, {
    activityDate: '2026-08-18',
    timezonePolicyVersion: 1,
  }),
  operation('streak', 'streak-b', 2, {
    activityDate: '2026-08-20',
    timezonePolicyVersion: 1,
  }),
  operation('streak', 'streak-c', 3, {
    activityDate: '2026-08-19',
    timezonePolicyVersion: 1,
  }),
];

const economyOperations = [
  operation('economy', 'opening', 1, { delta: 10, grants: [] }, { kind: 'composite' }),
  operation('economy', 'spend-a', 2, { delta: -8, grants: ['grant:a'] }, {
    kind: 'composite',
  }),
  operation('economy', 'spend-b', 3, { delta: -8, grants: ['grant:b'] }, {
    kind: 'composite',
  }),
];

const domainFixtures = [
  { domain: 'counter', assertAlgebra: () => expectAlgebra(counterReducer, counterOperations) },
  { domain: 'set-max', assertAlgebra: () => expectAlgebra(setMaxReducer, setMaxOperations) },
  { domain: 'register', assertAlgebra: () => expectAlgebra(registerReducer, registerOperations) },
  { domain: 'entities', assertAlgebra: () => expectAlgebra(entityReducer, entityOperations) },
  { domain: 'streak', assertAlgebra: () => expectAlgebra(streakReducer, streakOperations) },
  { domain: 'economy', assertAlgebra: () => expectAlgebra(economyReducer, economyOperations) },
];

test.each(domainFixtures)('$domain is idempotent, commutative, and partition-order invariant', ({
  assertAlgebra,
}) => {
  assertAlgebra();
});

test('counter sums integer deltas once per immutable operation', () => {
  expect(replayState(counterReducer, counterOperations)).toMatchObject({ value: 7 });
});

test('set/max unions IDs and preserves the maximum finite observation', () => {
  expect(replayState(setMaxReducer, setMaxOperations)).toMatchObject({
    ids: ['a', 'b', 'c', 'd'],
    maximum: 8,
  });
});

test('register resolves each field by hybrid counter and device ID', () => {
  expect(replayState(registerReducer, registerOperations)).toMatchObject({
    fields: {
      level: { value: 2 },
      name: { value: 'new' },
    },
  });
});

test('entity tombstone hides older fields while a newer upsert can restore the entity', () => {
  expect(replayState(entityReducer, entityOperations)).toMatchObject({
    entities: {
      'card-1': {
        visible: true,
        fields: { title: { value: 'restored' } },
      },
    },
  });
});

test('streak derives consecutive count from normalized dates and a versioned policy', () => {
  const state = replayState(streakReducer, streakOperations) as StreakState;
  expect(state.activityDates).toEqual(['2026-08-18', '2026-08-19', '2026-08-20']);
  expect(state.count).toBe(3);
  expect(state.timezonePolicyVersion).toBe(1);
});

test('concurrent pearl spends preserve both grants and may project debt', () => {
  const state = replayState(economyReducer, economyOperations) as EconomyState;
  expect(state.balance).toBe(-6);
  expect(state.grants).toEqual(expect.arrayContaining(['grant:a', 'grant:b']));
  expect(canSpend(state, 1)).toBe(false);
});

test('standalone negative economy delta without a bound grant is quarantined', () => {
  const invalidDebit = operation(
    'economy',
    'orphan-debit',
    1,
    { delta: -1, grants: [] },
    { kind: 'composite' },
  );

  expect(createReducerRegistry([economyReducer]).replay('economy', [invalidDebit])).toEqual({
    kind: 'quarantine',
    reason: 'invalid_operation',
  });
});
