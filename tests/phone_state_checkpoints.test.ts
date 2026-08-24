import type { PhoneStateScope } from '../modules/phone-state/account_secret';
import type { PersonalOperation, ProjectionEnvelope } from '../modules/phone-state/contracts';
import {
  buildCheckpoint,
  restoreCheckpoint,
  shouldCreateCheckpoint,
  type PhoneStateCheckpointLocalRepository,
} from '../modules/phone-state/checkpoints';
import { createReducerRegistry } from '../modules/phone-state/reducer_registry';
import { createCounterReducer } from '../modules/phone-state/reducers/counter';

const scope: PhoneStateScope = { stableUid: 'stable-1', accountGeneration: 1 };
const deviceId = 'device_0000000001';
const reducer = createCounterReducer('counter');

function operation(sequence: number): PersonalOperation {
  return {
    schemaVersion: 1,
    operationId: `${deviceId}:${sequence}`,
    stableUid: scope.stableUid,
    accountGeneration: scope.accountGeneration,
    deviceId,
    deviceSequence: sequence,
    hybridClock: { counter: sequence, deviceId },
    domain: 'counter',
    kind: 'delta',
    entityId: null,
    payload: { delta: 1 },
    exactResult: { value: sequence },
    createdAtMs: sequence,
    fingerprint: sequence.toString(16).padStart(64, '0'),
  };
}

function replay(
  operations: readonly PersonalOperation[],
  initial?: ProjectionEnvelope,
): ProjectionEnvelope {
  const registry = createReducerRegistry([reducer]);
  let projection = initial;
  for (const item of operations) {
    const result = registry.reduce(projection, item);
    if (result.kind !== 'applied') throw new Error(result.reason);
    projection = result.projection;
  }
  if (!projection) {
    const empty = registry.replay('counter', []);
    if (empty.kind !== 'applied') throw new Error(empty.reason);
    return empty.projection;
  }
  return projection;
}

function checkpointLocal() {
  let projections: readonly ProjectionEnvelope[] = [];
  let vector: Readonly<Record<string, number>> = {};
  let receipt: string | null = null;
  const repository: PhoneStateCheckpointLocalRepository = {
    applyCheckpointAtomically: async (input) => {
      projections = input.projections;
      vector = input.vector;
      receipt = input.checkpointId;
    },
  };
  return {
    repository,
    snapshot: () => ({ projections, vector, receipt }),
  };
}

test('checkpoint plus tail equals full operation replay', async () => {
  const operations = Array.from({ length: 500 }, (_, index) => operation(index + 1));
  const firstProjection = replay(operations.slice(0, 400));
  const checkpoint = await buildCheckpoint({
    scope,
    checkpointId: 'checkpoint_0001',
    reducerVersions: { counter: 1 },
    vector: { [deviceId]: 400 },
    projections: [firstProjection],
    createdAtMs: 400,
  });
  const local = checkpointLocal();

  const restored = await restoreCheckpoint({
    checkpoint,
    scope,
    expectedReducerVersions: { counter: 1 },
    local: local.repository,
  });
  const fromCheckpoint = replay(operations.slice(400), restored.projections[0]);

  expect(fromCheckpoint).toEqual(replay(operations));
  expect(local.snapshot()).toMatchObject({
    vector: { [deviceId]: 400 },
    receipt: 'checkpoint_0001',
  });
});

test('invalid vector or fingerprint rejects the checkpoint and keeps local state', async () => {
  const checkpoint = await buildCheckpoint({
    scope,
    checkpointId: 'checkpoint_0001',
    reducerVersions: { counter: 1 },
    vector: { [deviceId]: 1 },
    projections: [replay([operation(1)])],
    createdAtMs: 1,
  });
  const local = checkpointLocal();
  const before = local.snapshot();

  await expect(restoreCheckpoint({
    checkpoint: { ...checkpoint, vector: { [deviceId]: -1 } },
    scope,
    expectedReducerVersions: { counter: 1 },
    local: local.repository,
  })).rejects.toThrow('phone_state_checkpoint_invalid');
  await expect(restoreCheckpoint({
    checkpoint: { ...checkpoint, fingerprint: 'f'.repeat(64) },
    scope,
    expectedReducerVersions: { counter: 1 },
    local: local.repository,
  })).rejects.toThrow('phone_state_checkpoint_invalid');
  expect(local.snapshot()).toEqual(before);
});

test('checkpoint threshold is 2000 operations or 512 KiB acknowledged payload', () => {
  expect(shouldCreateCheckpoint({ acknowledgedOperations: 1_999, acknowledgedBytes: 1 }))
    .toBe(false);
  expect(shouldCreateCheckpoint({ acknowledgedOperations: 2_000, acknowledgedBytes: 0 }))
    .toBe(true);
  expect(shouldCreateCheckpoint({ acknowledgedOperations: 0, acknowledgedBytes: 512 * 1024 }))
    .toBe(true);
});

test('combined projections may exceed 64 KiB but remain bounded by 512 KiB', async () => {
  const projections: ProjectionEnvelope[] = Array.from({ length: 4 }, (_, index) => ({
    schemaVersion: 1,
    domain: `domain-${index}`,
    reducerVersion: 1,
    state: { payload: 'x'.repeat(20_000) },
    throughOperationCount: 1,
  }));

  const checkpoint = await buildCheckpoint({
    scope,
    checkpointId: 'checkpoint_large',
    reducerVersions: Object.fromEntries(projections.map((item) => [item.domain, 1])),
    vector: { [deviceId]: 1 },
    projections,
    createdAtMs: 1,
  });

  expect(checkpoint.byteSize).toBeGreaterThan(64 * 1024);
  expect(checkpoint.byteSize).toBeLessThanOrEqual(512 * 1024);
});
