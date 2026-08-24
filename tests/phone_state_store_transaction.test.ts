import type { PendingPersonalOperation } from '../modules/phone-state/contracts';
import { createReducerRegistry, type DomainReducer } from '../modules/phone-state/reducer_registry';
import {
  createPhoneStateStore,
  type PhoneStateCommitFailpoint,
} from '../modules/phone-state/store';
import { createMemoryPhoneStateDatabase } from '../modules/phone-state/testing/memory_database';

type XpState = Readonly<{ total: number }>;

const xpReducer: DomainReducer<XpState> = {
  domain: 'xp',
  version: 1,
  initial: () => ({ total: 0 }),
  apply: (state, operation) => ({
    total: state.total + (operation.payload as { amount: number }).amount,
  }),
  validate: (state): state is XpState => (
    state !== null
    && typeof state === 'object'
    && Number.isFinite((state as { total?: unknown }).total)
  ),
};

function xpGrant(amount: number): PendingPersonalOperation {
  return {
    schemaVersion: 1,
    stableUid: 'stable-1',
    accountGeneration: 1,
    deviceId: 'device-1',
    domain: 'xp',
    kind: 'grant',
    entityId: null,
    payload: { amount },
    exactResult: { amount },
    createdAtMs: 100,
  };
}

function harness(failpoint?: PhoneStateCommitFailpoint) {
  const database = createMemoryPhoneStateDatabase({ deviceId: 'device-1' });
  const registry = createReducerRegistry([xpReducer]);
  const store = createPhoneStateStore({ database, registry, failpoint });
  return { database, store };
}

for (const failpoint of [
  'after_sequence',
  'after_operation',
  'after_projection',
  'after_outbox',
] as const) {
  test(`rolls back the whole commit at ${failpoint}`, async () => {
    const { database, store } = harness(failpoint);

    await expect(store.commit(xpGrant(10))).rejects.toThrow(`failpoint:${failpoint}`);

    expect(database.snapshot()).toEqual({
      operations: [],
      projections: [],
      outbox: [],
      quarantine: [],
    });
    expect(database.deviceState()).toEqual({
      deviceId: 'device-1',
      nextSequence: 1,
      hybridCounter: 0,
    });
  });
}

test('a successful commit advances counters and persists operation, projection, and outbox atomically', async () => {
  const { database, store } = harness();

  const result = await store.commit(xpGrant(10));

  expect(result.duplicate).toBe(false);
  expect(result.operation.deviceSequence).toBe(1);
  expect(result.operation.hybridClock).toEqual({ counter: 1, deviceId: 'device-1' });
  expect(result.projection).toMatchObject({
    domain: 'xp',
    reducerVersion: 1,
    state: { total: 10 },
    throughOperationCount: 1,
  });
  expect(database.snapshot()).toMatchObject({
    operations: [{ operationId: 'device-1:1' }],
    projections: [{ domain: 'xp', throughOperationCount: 1 }],
    outbox: [{ operationIds: ['device-1:1'], operationCount: 1 }],
    quarantine: [],
  });
  expect(database.deviceState()).toEqual({
    deviceId: 'device-1',
    nextSequence: 2,
    hybridCounter: 1,
  });
});

test('same operation retry is idempotent and changed bytes conflict', async () => {
  const { database, store } = harness();
  const first = await store.commit(xpGrant(10), { idempotencyKey: 'lesson:1:q:1' });
  const retry = await store.commit(xpGrant(10), { idempotencyKey: 'lesson:1:q:1' });

  expect(first.duplicate).toBe(false);
  expect(retry).toEqual({ ...first, duplicate: true });
  expect(database.snapshot().operations).toHaveLength(1);
  expect(database.deviceState().nextSequence).toBe(2);

  await expect(
    store.commit(xpGrant(20), { idempotencyKey: 'lesson:1:q:1' }),
  ).rejects.toThrow('phone_state_operation_id_reused');
  expect(database.snapshot().operations).toHaveLength(1);
  expect(database.deviceState().nextSequence).toBe(2);
});

test('a recreated store reads the durable projection and deterministic replay matches it', async () => {
  const { database, store } = harness();
  await store.commit(xpGrant(4), { idempotencyKey: 'lesson:1:q:1' });
  await store.commit(xpGrant(6), { idempotencyKey: 'lesson:1:q:2' });

  const recreated = createPhoneStateStore({
    database,
    registry: createReducerRegistry([xpReducer]),
  });

  const stored = await recreated.readProjection('xp');
  const replayed = await recreated.replay('xp');
  expect(stored).toEqual(replayed);
  expect(replayed.state).toEqual({ total: 10 });
  expect(replayed.throughOperationCount).toBe(2);
});
