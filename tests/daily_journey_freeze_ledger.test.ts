import AsyncStorage from '@react-native-async-storage/async-storage';
import { createHash } from 'crypto';

import {
  __resetAccountGenerationForTests,
  beginAccountGeneration,
} from '../app/account_generation';
import {
  commitDailyJourneyFreezeGrant,
  consumeDailyJourneyFreeze,
  consumeDailyJourneyFreezeBatch,
  readDailyJourneyFreezeProjection,
  readEffectiveStreakProtection,
} from '../app/daily_journey_freeze_ledger';
import { __cloudSyncTestHooks } from '../app/cloud_sync';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA256' },
  digestStringAsync: jest.fn(async (_algorithm: string, value: string) =>
    createHash('sha256').update(value).digest('hex')),
}));

const storage: Record<string, string> = {};
const projectionKey = 'daily_journey_freeze_projection_v1:owner-a';

beforeEach(() => {
  jest.clearAllMocks();
  __resetAccountGenerationForTests();
  Object.keys(storage).forEach((key) => delete storage[key]);
  (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => storage[key] ?? null);
  (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => {
    storage[key] = value;
  });
  (AsyncStorage.removeItem as jest.Mock).mockImplementation(async (key: string) => {
    delete storage[key];
  });
  (AsyncStorage.getAllKeys as jest.Mock).mockImplementation(async () => Object.keys(storage));
  (AsyncStorage.multiGet as jest.Mock).mockImplementation(async (keys: readonly string[]) =>
    keys.map((key) => [key, storage[key] ?? null]));
  (AsyncStorage.multiSet as jest.Mock).mockImplementation(async (
    pairs: readonly (readonly [string, string])[],
  ) => pairs.forEach(([key, value]) => { storage[key] = value; }));
  (AsyncStorage.multiRemove as jest.Mock).mockImplementation(async (keys: readonly string[]) => {
    keys.forEach((key) => delete storage[key]);
  });
});

it('commits an immutable exact grant once and consumes each stable protection use once', async () => {
  const token = beginAccountGeneration('owner-a');
  const input = {
    claimOperationId: 'daily-journey-gift-claim:freeze-grant-0001',
    amount: 2 as const,
    occurrenceFingerprint: 'a'.repeat(64),
  };

  await expect(commitDailyJourneyFreezeGrant(input, token)).resolves.toEqual({ status: 'applied' });
  await expect(commitDailyJourneyFreezeGrant(input, token)).resolves.toEqual({ status: 'already_applied' });
  await expect(consumeDailyJourneyFreeze('missed-day:2026-08-29:2026-08-30', token)).resolves.toBe(true);
  await expect(consumeDailyJourneyFreeze('missed-day:2026-08-29:2026-08-30', token)).resolves.toBe(true);

  await expect(readDailyJourneyFreezeProjection(token)).resolves.toMatchObject({
    grantedCount: 2,
    consumedCount: 1,
    remainingCount: 1,
    latestRevision: 2,
  });
  await expect(commitDailyJourneyFreezeGrant({ ...input, amount: 1 }, token))
    .rejects.toThrow('daily_journey_freeze_operation_conflict');
});

it('atomically refuses an undersupplied batch without consuming any freeze', async () => {
  const token = beginAccountGeneration('owner-a');
  await commitDailyJourneyFreezeGrant({
    claimOperationId: 'daily-journey-gift-claim:freeze-batch-short-0001',
    amount: 1,
    occurrenceFingerprint: '7'.repeat(64),
  }, token);

  await expect(consumeDailyJourneyFreezeBatch([
    'daily-journey-series-gap:aaaaaaaaaaaaaaaaaaaaaaaa:c1:2026-08-30',
    'daily-journey-series-gap:aaaaaaaaaaaaaaaaaaaaaaaa:c1:2026-08-31',
  ], token)).resolves.toEqual({ status: 'unavailable', consumedCount: 0 });
  await expect(readDailyJourneyFreezeProjection(token)).resolves.toMatchObject({
    consumedCount: 0,
    remainingCount: 1,
  });
  expect(storage['daily_journey_freeze_prepared_v1:owner-a']).toBeUndefined();
});

it('recovers one torn composite batch before Hall can consume its reserved remainder', async () => {
  const token = beginAccountGeneration('owner-a');
  await commitDailyJourneyFreezeGrant({
    claimOperationId: 'daily-journey-gift-claim:freeze-batch-crash-0001',
    amount: 2,
    occurrenceFingerprint: '2'.repeat(64),
  }, token);
  const useOperationIds = [
    'daily-journey-series-gap:aaaaaaaaaaaaaaaaaaaaaaaa:c1:2026-08-30',
    'daily-journey-series-gap:aaaaaaaaaaaaaaaaaaaaaaaa:c1:2026-08-31',
  ] as const;
  let tearOnce = true;
  (AsyncStorage.multiSet as jest.Mock).mockImplementation(async (
    pairs: readonly (readonly [string, string])[],
  ) => {
    if (tearOnce) {
      tearOnce = false;
      const [operation] = pairs;
      storage[operation[0]] = operation[1];
      throw new Error('simulated_composite_batch_operation_only');
    }
    pairs.forEach(([key, value]) => { storage[key] = value; });
  });

  await expect(consumeDailyJourneyFreezeBatch(useOperationIds, token))
    .rejects.toThrow('simulated_composite_batch_operation_only');
  await expect(consumeDailyJourneyFreeze('hall-of-fame:after-batch-crash', token))
    .resolves.toBe(false);
  await expect(consumeDailyJourneyFreezeBatch(useOperationIds, token))
    .resolves.toEqual({ status: 'already_applied', consumedCount: 0 });
  await expect(readDailyJourneyFreezeProjection(token)).resolves.toMatchObject({
    grantedCount: 2,
    consumedCount: 2,
    remainingCount: 0,
    latestRevision: 2,
  });

  const operations = Object.entries(storage)
    .filter(([key]) => key.startsWith('daily_journey_freeze_operation_v1:owner-a:'))
    .map(([, raw]) => JSON.parse(raw) as Record<string, unknown>);
  const composite = operations.find((operation) => operation.kind === 'consume_batch');
  expect(operations).toHaveLength(2);
  expect(composite).toMatchObject({
    schemaVersion: 'daily-journey-freeze-operation.v2',
    operationId: `daily-journey-freeze-consume-batch:${useOperationIds[0]}`,
    sourceId: useOperationIds[0],
    sourceFingerprint: createHash('sha256')
      .update(JSON.stringify(useOperationIds))
      .digest('hex'),
    amount: 2,
    useOperationIds: [...useOperationIds],
  });
});

it('rejects the same composite operation id with a different ordered missed-day list', async () => {
  const token = beginAccountGeneration('owner-a');
  await commitDailyJourneyFreezeGrant({
    claimOperationId: 'daily-journey-gift-claim:freeze-batch-conflict-0001',
    amount: 2,
    occurrenceFingerprint: '3'.repeat(64),
  }, token);
  await commitDailyJourneyFreezeGrant({
    claimOperationId: 'daily-journey-gift-claim:freeze-batch-conflict-0002',
    amount: 2,
    occurrenceFingerprint: '4'.repeat(64),
  }, token);
  const stableFirst = 'daily-journey-series-gap:aaaaaaaaaaaaaaaaaaaaaaaa:c1:2026-08-30';
  await expect(consumeDailyJourneyFreezeBatch([
    stableFirst,
    'daily-journey-series-gap:aaaaaaaaaaaaaaaaaaaaaaaa:c1:2026-08-31',
  ], token)).resolves.toEqual({ status: 'applied', consumedCount: 2 });

  await expect(consumeDailyJourneyFreezeBatch([
    stableFirst,
    'daily-journey-series-gap:aaaaaaaaaaaaaaaaaaaaaaaa:c1:2026-09-01',
  ], token)).rejects.toThrow('daily_journey_freeze_operation_conflict');
  await expect(readDailyJourneyFreezeProjection(token)).resolves.toMatchObject({
    consumedCount: 2,
    remainingCount: 2,
  });
});

it('fails closed when a legacy grant is mislabeled as a composite v2 operation', async () => {
  const token = beginAccountGeneration('owner-a');
  const useOperationIds = [
    'daily-journey-series-gap:aaaaaaaaaaaaaaaaaaaaaaaa:c1:2026-08-30',
  ];
  const sourceFingerprint = createHash('sha256')
    .update(JSON.stringify(useOperationIds))
    .digest('hex');
  const body = {
    schemaVersion: 'daily-journey-freeze-operation.v2',
    operationId: 'daily-journey-gift-claim:cross-version-0001',
    ownerStableId: 'owner-a',
    kind: 'grant',
    sourceId: 'daily-journey-gift-claim:cross-version-0001',
    sourceFingerprint,
    amount: 1,
    revision: 1,
    createdAtMs: 1,
    useOperationIds,
  };
  const operation = {
    ...body,
    payloadFingerprint: createHash('sha256').update(JSON.stringify(body)).digest('hex'),
  };
  storage[
    `daily_journey_freeze_operation_v1:owner-a:${encodeURIComponent(operation.operationId)}`
  ] = JSON.stringify(operation);
  storage[projectionKey] = JSON.stringify({
    schemaVersion: 'daily-journey-freeze-projection.v1',
    ownerStableId: 'owner-a',
    grantedCount: 1,
    consumedCount: 0,
    remainingCount: 1,
    latestRevision: 1,
  });

  await expect(readDailyJourneyFreezeProjection(token))
    .rejects.toThrow('daily_journey_freeze_operation_corrupt');
});

it('holds the shared transition and storage locks across the whole batch', async () => {
  const token = beginAccountGeneration('owner-a');
  await commitDailyJourneyFreezeGrant({
    claimOperationId: 'daily-journey-gift-claim:freeze-batch-race-0001',
    amount: 2,
    occurrenceFingerprint: '8'.repeat(64),
  }, token);
  let entered!: () => void;
  let release!: () => void;
  const enteredBatch = new Promise<void>((resolve) => { entered = resolve; });
  const releaseBatch = new Promise<void>((resolve) => { release = resolve; });
  const digest = require('expo-crypto').digestStringAsync as jest.Mock;
  digest.mockImplementationOnce(async (_algorithm: string, value: string) => {
    entered();
    await releaseBatch;
    return createHash('sha256').update(value).digest('hex');
  });

  const batch = consumeDailyJourneyFreezeBatch([
    'daily-journey-series-gap:aaaaaaaaaaaaaaaaaaaaaaaa:c1:2026-08-30',
    'daily-journey-series-gap:aaaaaaaaaaaaaaaaaaaaaaaa:c1:2026-08-31',
  ], token);
  await enteredBatch;
  const competing = consumeDailyJourneyFreeze('hall-of-fame:competing-day', token);
  release();

  await expect(batch).resolves.toEqual({ status: 'applied', consumedCount: 2 });
  await expect(competing).resolves.toBe(false);
  await expect(readDailyJourneyFreezeProjection(token)).resolves.toMatchObject({
    consumedCount: 2,
    remainingCount: 0,
  });
});

it('keeps committed Daily Journey protection effective after cloud restore removes a missing server shield', async () => {
  const token = beginAccountGeneration('owner-a');
  await commitDailyJourneyFreezeGrant({
    claimOperationId: 'daily-journey-gift-claim:freeze-cloud-0001',
    amount: 2,
    occurrenceFingerprint: 'b'.repeat(64),
  }, token);
  storage.chain_shield = JSON.stringify({ daysLeft: 3, grantedAt: 'server' });

  await __cloudSyncTestHooks.applyRestoreFromUserDoc({
    exists: true,
    data: () => ({ progress: { user_total_xp: '0', streak_count: '0' } }),
  });

  await expect(readEffectiveStreakProtection(token)).resolves.toEqual({
    serverShieldDays: 0,
    dailyJourneyFreezeCount: 2,
    totalProtectionCount: 2,
  });
});

it('recovers an occurrence-only torn grant without minting twice', async () => {
  const token = beginAccountGeneration('owner-a');
  let tearOnce = true;
  (AsyncStorage.multiSet as jest.Mock).mockImplementation(async (
    pairs: readonly (readonly [string, string])[],
  ) => {
    if (tearOnce) {
      tearOnce = false;
      const [operation] = pairs;
      storage[operation[0]] = operation[1];
      throw new Error('simulated_freeze_torn_commit');
    }
    pairs.forEach(([key, value]) => { storage[key] = value; });
  });
  const input = {
    claimOperationId: 'daily-journey-gift-claim:freeze-torn-0001',
    amount: 2 as const,
    occurrenceFingerprint: 'c'.repeat(64),
  };

  await expect(commitDailyJourneyFreezeGrant(input, token))
    .rejects.toThrow('simulated_freeze_torn_commit');
  await expect(commitDailyJourneyFreezeGrant(input, token))
    .resolves.toEqual({ status: 'already_applied' });
  await expect(readDailyJourneyFreezeProjection(token)).resolves.toMatchObject({
    grantedCount: 2,
    remainingCount: 2,
    latestRevision: 1,
  });
});

it('recovers an operation-only torn consume at revision two from the exact prior projection', async () => {
  const token = beginAccountGeneration('owner-a');
  await commitDailyJourneyFreezeGrant({
    claimOperationId: 'daily-journey-gift-claim:freeze-consume-head-0001',
    amount: 2,
    occurrenceFingerprint: 'e'.repeat(64),
  }, token);
  let tearOnce = true;
  (AsyncStorage.multiSet as jest.Mock).mockImplementation(async (
    pairs: readonly (readonly [string, string])[],
  ) => {
    if (tearOnce) {
      tearOnce = false;
      const [operation] = pairs;
      storage[operation[0]] = operation[1];
      throw new Error('simulated_consume_operation_only');
    }
    pairs.forEach(([key, value]) => { storage[key] = value; });
  });
  const useId = 'daily-journey-missed-day:2026-08-28:2026-08-30';

  await expect(consumeDailyJourneyFreeze(useId, token))
    .rejects.toThrow('simulated_consume_operation_only');
  await expect(consumeDailyJourneyFreeze(useId, token)).resolves.toBe(true);
  await expect(readDailyJourneyFreezeProjection(token)).resolves.toMatchObject({
    grantedCount: 2,
    consumedCount: 1,
    remainingCount: 1,
    latestRevision: 2,
  });
});

it('recovers a projection-only torn consume at revision two only from the exact next projection', async () => {
  const token = beginAccountGeneration('owner-a');
  await commitDailyJourneyFreezeGrant({
    claimOperationId: 'daily-journey-gift-claim:freeze-projection-head-0001',
    amount: 2,
    occurrenceFingerprint: 'f'.repeat(64),
  }, token);
  let tearOnce = true;
  (AsyncStorage.multiSet as jest.Mock).mockImplementation(async (
    pairs: readonly (readonly [string, string])[],
  ) => {
    if (tearOnce) {
      tearOnce = false;
      const [, projection] = pairs;
      storage[projection[0]] = projection[1];
      throw new Error('simulated_consume_projection_only');
    }
    pairs.forEach(([key, value]) => { storage[key] = value; });
  });
  const useId = 'daily-journey-missed-day:2026-08-27:2026-08-29';

  await expect(consumeDailyJourneyFreeze(useId, token))
    .rejects.toThrow('simulated_consume_projection_only');
  await expect(consumeDailyJourneyFreeze(useId, token)).resolves.toBe(true);
  await expect(readDailyJourneyFreezeProjection(token)).resolves.toMatchObject({
    consumedCount: 1,
    remainingCount: 1,
    latestRevision: 2,
  });
});

it.each(['operation-only', 'projection-only'] as const)(
  'rejects %s recovery when the explanatory projection bytes are corrupt',
  async (tearKind) => {
    const token = beginAccountGeneration('owner-a');
    await commitDailyJourneyFreezeGrant({
      claimOperationId: `daily-journey-gift-claim:freeze-corrupt-${tearKind}`,
      amount: 2,
      occurrenceFingerprint: '1'.repeat(64),
    }, token);
    let tearOnce = true;
    (AsyncStorage.multiSet as jest.Mock).mockImplementation(async (
      pairs: readonly (readonly [string, string])[],
    ) => {
      if (tearOnce) {
        tearOnce = false;
        const pair = tearKind === 'operation-only' ? pairs[0] : pairs[1];
        storage[pair[0]] = pair[1];
        throw new Error(`simulated_${tearKind}`);
      }
      pairs.forEach(([key, value]) => { storage[key] = value; });
    });
    const useId = `daily-journey-missed-day:corrupt:${tearKind}`;
    await expect(consumeDailyJourneyFreeze(useId, token)).rejects.toThrow(`simulated_${tearKind}`);
    const projection = JSON.parse(storage[projectionKey]) as Record<string, number>;
    storage[projectionKey] = JSON.stringify({
      ...projection,
      grantedCount: 9,
      remainingCount: tearKind === 'operation-only' ? 9 : 8,
    });

    await expect(consumeDailyJourneyFreeze(useId, token))
      .rejects.toThrow('daily_journey_freeze_projection_corrupt');
  },
);

it('rejects a stale owner token at the async storage boundary', async () => {
  const token = beginAccountGeneration('owner-a');
  (AsyncStorage.setItem as jest.Mock).mockImplementationOnce(async (key: string, value: string) => {
    storage[key] = value;
    beginAccountGeneration('owner-b');
  });

  await expect(commitDailyJourneyFreezeGrant({
    claimOperationId: 'daily-journey-gift-claim:freeze-switch-0001',
    amount: 1,
    occurrenceFingerprint: 'd'.repeat(64),
  }, token)).rejects.toThrow('daily_journey_freeze_account_stale');

  const ownerBToken = beginAccountGeneration('owner-b');
  await expect(readDailyJourneyFreezeProjection(ownerBToken)).resolves.toMatchObject({
    grantedCount: 0,
    remainingCount: 0,
  });
});
