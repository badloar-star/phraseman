import { canonicalJson } from '../modules/phone-state/canonical';
import type { PersonalOperation, ProjectionEnvelope } from '../modules/phone-state/contracts';
import {
  createReducerRegistry,
  type DomainReducer,
  type ReduceResult,
} from '../modules/phone-state/reducer_registry';

type CounterState = Readonly<{ total: number }>;

const counterReducer: DomainReducer<CounterState> = {
  domain: 'xp',
  version: 1,
  initial: () => ({ total: 0 }),
  apply: (state, operation) => ({
    total: state.total + (operation.payload as { delta: number }).delta,
  }),
  validate: (state): state is CounterState => (
    state !== null
    && typeof state === 'object'
    && Number.isFinite((state as { total?: unknown }).total)
  ),
};

function operation(
  overrides: Partial<PersonalOperation> = {},
): PersonalOperation {
  return {
    schemaVersion: 1,
    operationId: 'operation-1',
    stableUid: 'stable-1',
    accountGeneration: 1,
    deviceId: 'device-1',
    deviceSequence: 1,
    hybridClock: { counter: 1, deviceId: 'device-1' },
    domain: 'xp',
    kind: 'gain',
    entityId: null,
    payload: { delta: 3 },
    exactResult: { total: 3 },
    createdAtMs: 1,
    fingerprint: 'a'.repeat(64),
    ...overrides,
  };
}

function applied(result: ReduceResult): ProjectionEnvelope {
  expect(result.kind).toBe('applied');
  if (result.kind !== 'applied') {
    throw new Error(`expected_applied:${result.reason}`);
  }
  return result.projection;
}

test('unknown domains quarantine instead of mutating a projection', () => {
  const registry = createReducerRegistry([]);

  expect(registry.reduce(undefined, operation({ domain: 'future' }))).toEqual({
    kind: 'quarantine',
    reason: 'unknown_domain',
  });
});

test('replay and incremental apply are byte-identical', () => {
  const registry = createReducerRegistry([counterReducer]);
  const operations = [
    operation(),
    operation({
      operationId: 'operation-2',
      deviceSequence: 2,
      hybridClock: { counter: 2, deviceId: 'device-1' },
      payload: { delta: 5 },
      exactResult: { total: 8 },
      fingerprint: 'b'.repeat(64),
    }),
  ];

  const afterFirst = applied(registry.reduce(undefined, operations[0]));
  const incremental = registry.reduce(afterFirst, operations[1]);
  const replayed = registry.replay('xp', operations);

  expect(canonicalJson(replayed)).toBe(canonicalJson(incremental));
  expect(applied(replayed)).toEqual({
    schemaVersion: 1,
    domain: 'xp',
    reducerVersion: 1,
    state: { total: 8 },
    throughOperationCount: 2,
  });
});

test('rejects duplicate domains when the registry is created', () => {
  expect(() => createReducerRegistry([counterReducer, { ...counterReducer }]))
    .toThrow('duplicate_reducer_domain:xp');
});

test('registration is frozen against later mutation of the source array', () => {
  const reducers = [counterReducer];
  const registry = createReducerRegistry(reducers);
  reducers.push({ ...counterReducer, domain: 'future' });

  expect(registry.reduce(undefined, operation({ domain: 'future' }))).toEqual({
    kind: 'quarantine',
    reason: 'unknown_domain',
  });
});

test('an incompatible existing projection is quarantined without calling apply', () => {
  const apply = jest.fn(counterReducer.apply);
  const registry = createReducerRegistry([{ ...counterReducer, apply }]);
  const incompatible: ProjectionEnvelope = {
    schemaVersion: 1,
    domain: 'xp',
    reducerVersion: 2,
    state: { total: 10 },
    throughOperationCount: 4,
  };

  expect(registry.reduce(incompatible, operation())).toEqual({
    kind: 'quarantine',
    reason: 'invalid_operation',
  });
  expect(apply).not.toHaveBeenCalled();
});

test('unknown operation schema and invalid reducer output quarantine instead of throwing', () => {
  const invalidOutputReducer: DomainReducer<CounterState> = {
    ...counterReducer,
    apply: () => ({ total: Number.NaN }),
  };
  const registry = createReducerRegistry([invalidOutputReducer]);

  expect(registry.reduce(undefined, { ...operation(), schemaVersion: 2 } as never)).toEqual({
    kind: 'quarantine',
    reason: 'invalid_operation',
  });
  expect(registry.reduce(undefined, operation())).toEqual({
    kind: 'quarantine',
    reason: 'invalid_operation',
  });
});

test('replay rejects an operation from a different known domain', () => {
  const secondReducer: DomainReducer<CounterState> = {
    ...counterReducer,
    domain: 'streak',
  };
  const registry = createReducerRegistry([counterReducer, secondReducer]);

  expect(registry.replay('xp', [operation({ domain: 'streak' })])).toEqual({
    kind: 'quarantine',
    reason: 'invalid_operation',
  });
});
