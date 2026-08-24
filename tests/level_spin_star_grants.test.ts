import AsyncStorage from '@react-native-async-storage/async-storage';
import { createHash } from 'node:crypto';
import {
  beginAccountGeneration,
  captureAccountGeneration,
  withAccountTransitionLock,
} from '../app/account_generation';
import {
  enqueueLevelSpinStarGrant,
  levelSpinStarGrantOutboxKey,
  levelSpinStarPreparedKey,
  levelSpinStarProjectionKey,
  levelSpinStarAmount,
  mergeLevelSpinServerStars,
  hydrateLevelSpinStarsAfterPhoneStatePull,
  readUnifiedLevelSpinStars,
  recoverAndHydrateLevelSpinStarGrants,
  syncPendingLevelSpinStarGrants,
} from '../app/level_spin_star_grants';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/phone_state_economy_bridge', () => ({
  commitPhoneStateNonMonetaryEconomyGrant: jest.fn(),
  readPhoneStateStarCreditState: jest.fn(),
}));
jest.mock('../app/community_packs/functionsClient', () => ({ callLevelSpinStarComposite: jest.fn() }));
jest.mock('../app/app_snapshot_store', () => ({ getAppSnapshot: jest.fn(), patchAppSnapshot: jest.fn() }));

type ExactOperation = Readonly<{
  schemaVersion: 'client-level-spin-star-operation.v1'; operationId: string; ownerStableId: string;
  requestId: string; lane: 'base' | 'premium'; giftId: 'stars_10'; amount: 10;
  reason: 'level_spin_star_reward'; createdAtMs: number; requestFingerprint: string;
  grant: Readonly<{ kind: 'star_credit'; subjectId: string; payload: Readonly<{
    requestId: string; lane: 'base' | 'premium'; giftId: 'stars_10'; amount: 10;
  }> }>;
}>;

const storage: Record<string, string> = {};
let visibleProgress: { stars: number; starsEarnedTotal: number };

function fingerprintFor(operation: Pick<ExactOperation, 'ownerStableId' | 'requestId' | 'lane' | 'giftId' | 'amount'>): string {
  return createHash('sha256').update(JSON.stringify({
    schemaVersion: 1, ownerStableId: operation.ownerStableId, requestId: operation.requestId,
    lane: operation.lane, deliveryToken: null, giftId: operation.giftId, amount: operation.amount,
    reason: 'level_spin_star_reward',
  })).digest('hex');
}

function exactOperation(index: number, lane: 'base' | 'premium' = 'base'): ExactOperation {
  const requestId = `request${String(index).padStart(12, '0')}`;
  const operationId = `level_spin:${requestId}.${lane}`;
  const partial = {
    ownerStableId: 'account-a', requestId, lane, giftId: 'stars_10' as const, amount: 10 as const,
  };
  return Object.freeze({
    schemaVersion: 'client-level-spin-star-operation.v1', operationId, ...partial,
    reason: 'level_spin_star_reward', createdAtMs: 1_800_000_000_000 + index,
    requestFingerprint: fingerprintFor(partial),
    grant: Object.freeze({ kind: 'star_credit', subjectId: operationId, payload: Object.freeze({
      requestId, lane, giftId: 'stars_10', amount: 10,
    }) }),
  });
}

function bridgeMocks() {
  return jest.requireMock('../app/phone_state_economy_bridge') as {
    commitPhoneStateNonMonetaryEconomyGrant: jest.Mock;
    readPhoneStateStarCreditState: jest.Mock;
  };
}

function transportMock(): jest.Mock {
  return (jest.requireMock('../app/community_packs/functionsClient') as {
    callLevelSpinStarComposite: jest.Mock;
  }).callLevelSpinStarComposite;
}

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(storage).forEach((key) => delete storage[key]);
  visibleProgress = { stars: 0, starsEarnedTotal: 0 };
  beginAccountGeneration('account-a');
  (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => storage[key] ?? null);
  (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => { storage[key] = value; });
  (AsyncStorage.multiSet as jest.Mock).mockImplementation(async (pairs: [string, string][]) => {
    pairs.forEach(([key, value]) => { storage[key] = value; });
  });
  (AsyncStorage.multiRemove as jest.Mock).mockImplementation(async (keys: string[]) => {
    keys.forEach((key) => { delete storage[key]; });
  });
  (AsyncStorage.getAllKeys as jest.Mock).mockImplementation(async () => Object.keys(storage));
  (AsyncStorage.multiGet as jest.Mock).mockImplementation(async (keys: string[]) => (
    keys.map((key) => [key, storage[key] ?? null])
  ));
  bridgeMocks().readPhoneStateStarCreditState.mockResolvedValue({ credits: [], acknowledgements: [] });
  bridgeMocks().commitPhoneStateNonMonetaryEconomyGrant.mockResolvedValue(true);
  transportMock().mockImplementation(async (operation: ExactOperation) => ({
    materialized: true, operationId: operation.operationId,
    requestFingerprint: operation.requestFingerprint, replayed: false,
    starsBalance: visibleProgress.stars, starsEarnedTotal: visibleProgress.starsEarnedTotal, starsSeq: 1,
  }));
  const snapshot = jest.requireMock('../app/app_snapshot_store') as {
    getAppSnapshot: jest.Mock; patchAppSnapshot: jest.Mock;
  };
  snapshot.getAppSnapshot.mockImplementation(() => ({ progress: { ...visibleProgress } }));
  snapshot.patchAppSnapshot.mockImplementation((updater: (current: unknown) => { progress?: typeof visibleProgress }) => {
    const patch = updater({ progress: { ...visibleProgress } });
    if (patch.progress) visibleProgress = { ...visibleProgress, ...patch.progress };
  });
});

test('uses a closed gift-id amount catalog', () => {
  expect(levelSpinStarAmount('stars_10')).toBe(10);
  expect(levelSpinStarAmount('stars_1000')).toBe(1000);
  expect(() => levelSpinStarAmount('stars_999999')).toThrow('level_spin_star_gift_invalid');
});

test('offline credit is durable, visible after restart, and replay stays exactly once', async () => {
  const token = captureAccountGeneration();
  const input = { token, requestId: 'request0000000001', lane: 'base', giftId: 'stars_250' } as const;
  await enqueueLevelSpinStarGrant(input, { syncNow: false });
  await enqueueLevelSpinStarGrant(input, { syncNow: false });
  expect(JSON.parse(storage[levelSpinStarGrantOutboxKey('account-a')])).toHaveLength(1);
  expect(visibleProgress.stars).toBe(250);
  visibleProgress = { stars: 0, starsEarnedTotal: 0 };
  await recoverAndHydrateLevelSpinStarGrants(token, { syncNow: false });
  expect(visibleProgress.stars).toBe(250);
  expect((await readUnifiedLevelSpinStars(token)).balance).toBe(250);
});

test('malformed non-null projection is preserved and recovery fails closed', async () => {
  const token = captureAccountGeneration();
  const key = levelSpinStarProjectionKey('account-a');
  const raw = '{"schemaVersion":"client-level-spin-star-projection.v2","ownerStableId":"wrong-owner"}';
  storage[key] = raw;
  await expect(recoverAndHydrateLevelSpinStarGrants(token, { syncNow: false }))
    .rejects.toThrow('level_spin_star_projection_corrupt');
  expect(storage[key]).toBe(raw);
  const snapshot = jest.requireMock('../app/app_snapshot_store') as { patchAppSnapshot: jest.Mock };
  expect(snapshot.patchAppSnapshot).not.toHaveBeenCalled();
});

test('duplicate projection operation id with conflicting fingerprint preserves evidence and throws conflict', async () => {
  const token = captureAccountGeneration();
  const key = levelSpinStarProjectionKey('account-a');
  const operation = exactOperation(11);
  const raw = JSON.stringify({
    schemaVersion: 'client-level-spin-star-projection.v2', ownerStableId: 'account-a',
    operations: [operation, { ...operation, requestFingerprint: 'b'.repeat(64) }],
    acknowledged: {}, serverBalance: 0, serverEarnedTotal: 0, serverSeq: 0,
  });
  storage[key] = raw;
  await expect(recoverAndHydrateLevelSpinStarGrants(token, { syncNow: false }))
    .rejects.toThrow('level_spin_star_request_conflict');
  expect(storage[key]).toBe(raw);
});

test('valid legacy floor projection migrates without losing its visible values', async () => {
  const token = captureAccountGeneration();
  storage[levelSpinStarProjectionKey('account-a')] = JSON.stringify({
    schemaVersion: 'client-level-spin-star-projection.v2', ownerStableId: 'account-a',
    operations: [], acknowledged: {}, serverBalanceFloor: 12, serverEarnedFloor: 3,
  });
  await expect(recoverAndHydrateLevelSpinStarGrants(token, { syncNow: false }))
    .resolves.toEqual({ balance: 12, earnedTotal: 3 });
  expect(JSON.parse(storage[levelSpinStarProjectionKey('account-a')])).toMatchObject({
    serverBalance: 12, serverEarnedTotal: 3, serverSeq: 0,
  });
});

test('prepare intent recovers after a crash before the composite multiSet', async () => {
  const token = captureAccountGeneration();
  const normalMultiSet = (AsyncStorage.multiSet as jest.Mock).getMockImplementation();
  (AsyncStorage.multiSet as jest.Mock).mockImplementation(async (pairs: [string, string][]) => {
    if (pairs.some(([key]) => key.startsWith('level_spin_star_operation_v1:'))) throw new Error('fault_after_prepare');
    return normalMultiSet?.(pairs);
  });
  await expect(enqueueLevelSpinStarGrant({
    token, requestId: 'request0000000001', lane: 'base', giftId: 'stars_10',
  }, { syncNow: false })).rejects.toThrow('fault_after_prepare');
  expect(JSON.parse(storage[levelSpinStarPreparedKey('account-a')])).toHaveLength(1);
  (AsyncStorage.multiSet as jest.Mock).mockImplementation(async (pairs: [string, string][]) => {
    pairs.forEach(([key, value]) => { storage[key] = value; });
  });
  visibleProgress = { stars: 0, starsEarnedTotal: 0 };
  await recoverAndHydrateLevelSpinStarGrants(token, { syncNow: false });
  await recoverAndHydrateLevelSpinStarGrants(token, { syncNow: false });
  expect(visibleProgress.stars).toBe(10);
  expect(JSON.parse(storage[levelSpinStarGrantOutboxKey('account-a')])).toHaveLength(1);
  expect(JSON.parse(storage[levelSpinStarPreparedKey('account-a')])).toEqual([]);
});

test.each([1, 2, 3])('partial composite commit after %i write(s) recovers without duplicating the credit', async (writeCount) => {
  const token = captureAccountGeneration();
  const normalMultiSet = (AsyncStorage.multiSet as jest.Mock).getMockImplementation();
  let injected = false;
  (AsyncStorage.multiSet as jest.Mock).mockImplementation(async (pairs: [string, string][]) => {
    if (!injected && pairs.some(([key]) => key.startsWith('level_spin_star_operation_v1:'))) {
      injected = true;
      pairs.slice(0, writeCount).forEach(([key, value]) => { storage[key] = value; });
      throw new Error('fault_partial_commit');
    }
    return normalMultiSet?.(pairs);
  });
  await expect(enqueueLevelSpinStarGrant({
    token, requestId: 'request0000000001', lane: 'base', giftId: 'stars_10',
  }, { syncNow: false })).rejects.toThrow('fault_partial_commit');
  (AsyncStorage.multiSet as jest.Mock).mockImplementation(async (pairs: [string, string][]) => {
    pairs.forEach(([key, value]) => { storage[key] = value; });
  });
  await recoverAndHydrateLevelSpinStarGrants(token, { syncNow: false });
  await recoverAndHydrateLevelSpinStarGrants(token, { syncNow: false });
  expect((await readUnifiedLevelSpinStars(token)).balance).toBe(10);
  expect(JSON.parse(storage[levelSpinStarGrantOutboxKey('account-a')])).toHaveLength(1);
});

test('remote PhoneState replay materializes as one local overlay and pending sync', async () => {
  const token = captureAccountGeneration();
  bridgeMocks().readPhoneStateStarCreditState.mockResolvedValue({
    credits: [exactOperation(7)], acknowledgements: [],
  });
  await recoverAndHydrateLevelSpinStarGrants(token, { syncNow: false });
  await recoverAndHydrateLevelSpinStarGrants(token, { syncNow: false });
  expect(visibleProgress.stars).toBe(10);
  expect(JSON.parse(storage[levelSpinStarGrantOutboxKey('account-a')])).toHaveLength(1);
});

test('a completed PhoneState pull hydrates a remote star credit in the same session', async () => {
  const token = captureAccountGeneration();
  bridgeMocks().readPhoneStateStarCreditState.mockResolvedValue({
    credits: [exactOperation(8)], acknowledgements: [],
  });
  await hydrateLevelSpinStarsAfterPhoneStatePull(token, { downloaded: 1 });
  expect(visibleProgress.stars).toBe(10);
  expect(JSON.parse(storage[levelSpinStarGrantOutboxKey('account-a')])).toHaveLength(1);
});

test('remote PhoneState replay rejects a shaped receipt with a false fingerprint', async () => {
  const token = captureAccountGeneration();
  bridgeMocks().readPhoneStateStarCreditState.mockResolvedValue({ credits: [{
    ...exactOperation(7), requestFingerprint: 'b'.repeat(64),
  }], acknowledgements: [] });
  await expect(recoverAndHydrateLevelSpinStarGrants(token, { syncNow: false }))
    .rejects.toThrow('level_spin_star_phone_state_corrupt');
  expect(visibleProgress.stars).toBe(0);
});

function exactAck(operation: ExactOperation, starsBalance: number, starsSeq: number) {
  return Object.freeze({
    schemaVersion: 'client-level-spin-star-ack.v1' as const,
    operationId: operation.operationId,
    ownerStableId: operation.ownerStableId,
    requestFingerprint: operation.requestFingerprint,
    starsBalance,
    starsEarnedTotal: 0,
    starsSeq,
  });
}

test('remote PhoneState credit plus acknowledgement hydrates the materialized balance without overlay', async () => {
  const token = captureAccountGeneration();
  const operation = exactOperation(9);
  bridgeMocks().readPhoneStateStarCreditState.mockResolvedValue({
    credits: [],
    acknowledgements: [exactAck(operation, 40, 5)],
  });
  await hydrateLevelSpinStarsAfterPhoneStatePull(token, { downloaded: 2 });
  expect(visibleProgress.stars).toBe(40);
  expect(JSON.parse(storage[levelSpinStarGrantOutboxKey('account-a')])).toEqual([]);
});

test('restart after durable PhoneState acknowledgement but before local cleanup does not double the overlay', async () => {
  const token = captureAccountGeneration();
  await enqueueLevelSpinStarGrant({
    token, requestId: 'request0000000001', lane: 'base', giftId: 'stars_10',
  }, { syncNow: false });
  const operation = JSON.parse(storage[levelSpinStarGrantOutboxKey('account-a')])[0] as ExactOperation;
  bridgeMocks().readPhoneStateStarCreditState.mockResolvedValue({
    credits: [],
    acknowledgements: [exactAck(operation, 10, 1)],
  });
  visibleProgress = { stars: 0, starsEarnedTotal: 0 };
  await recoverAndHydrateLevelSpinStarGrants(token, { syncNow: false });
  expect(visibleProgress.stars).toBe(10);
  expect(JSON.parse(storage[levelSpinStarGrantOutboxKey('account-a')])).toEqual([]);
});

test('stale PhoneState acknowledgement sequence cannot lower a newer server projection', async () => {
  const token = captureAccountGeneration();
  storage[levelSpinStarProjectionKey('account-a')] = JSON.stringify({
    schemaVersion: 'client-level-spin-star-projection.v2', ownerStableId: 'account-a',
    operations: [], acknowledged: {}, serverBalance: 80, serverEarnedTotal: 3, serverSeq: 7,
  });
  bridgeMocks().readPhoneStateStarCreditState.mockResolvedValue({
    credits: [], acknowledgements: [exactAck(exactOperation(10), 20, 6)],
  });
  expect((await recoverAndHydrateLevelSpinStarGrants(token, { syncNow: false })).balance).toBe(80);
});

test('older server observations never reconcile a committed local overlay down', async () => {
  const token = captureAccountGeneration();
  visibleProgress = { stars: 100, starsEarnedTotal: 20 };
  await enqueueLevelSpinStarGrant({
    token, requestId: 'request0000000001', lane: 'base', giftId: 'stars_20',
  }, { syncNow: false });
  expect((await mergeLevelSpinServerStars(token, {
    stars: 80, starsEarnedTotal: 10, starsSeq: 0,
  })).balance).toBe(120);
  expect(visibleProgress.stars).toBe(120);
});

test('exact materialization acknowledgement removes overlay without double counting', async () => {
  const token = captureAccountGeneration();
  visibleProgress = { stars: 100, starsEarnedTotal: 20 };
  await enqueueLevelSpinStarGrant({
    token, requestId: 'request0000000001', lane: 'base', giftId: 'stars_20',
  }, { syncNow: false });
  transportMock().mockImplementation(async (operation: ExactOperation) => ({
    materialized: true, operationId: operation.operationId,
    requestFingerprint: operation.requestFingerprint, replayed: false,
    starsBalance: 120, starsEarnedTotal: 20, starsSeq: 1,
  }));
  expect(await syncPendingLevelSpinStarGrants(token)).toEqual({ synced: 1, pending: 0 });
  expect(visibleProgress.stars).toBe(120);
  expect((await readUnifiedLevelSpinStars(token)).balance).toBe(120);
  expect((await mergeLevelSpinServerStars(token, {
    stars: 80, starsEarnedTotal: 20, starsSeq: 2,
  })).balance).toBe(80);
  expect((await mergeLevelSpinServerStars(token, {
    stars: 60, starsEarnedTotal: 20, starsSeq: 1,
  })).balance).toBe(80);
  expect(visibleProgress.stars).toBe(80);
  // A stale unversioned bootstrap snapshot must not raise a revisioned ledger
  // after restart (the next legitimate spend may have lowered it).
  visibleProgress = { stars: 100, starsEarnedTotal: 20 };
  expect((await recoverAndHydrateLevelSpinStarGrants(token, { syncNow: false })).balance).toBe(80);
});

test('ambiguous network retry preserves intent and exact replay remains idempotent', async () => {
  const token = captureAccountGeneration();
  await enqueueLevelSpinStarGrant({
    token, requestId: 'request0000000001', lane: 'base', giftId: 'stars_10',
  }, { syncNow: false });
  transportMock().mockRejectedValueOnce(new Error('response_lost'));
  expect(await syncPendingLevelSpinStarGrants(token)).toEqual({ synced: 0, pending: 1 });
  transportMock().mockImplementationOnce(async (operation: ExactOperation) => ({
    materialized: true, operationId: operation.operationId,
    requestFingerprint: operation.requestFingerprint, replayed: true,
    starsBalance: 10, starsEarnedTotal: 0, starsSeq: 1,
  }));
  expect(await syncPendingLevelSpinStarGrants(token)).toEqual({ synced: 1, pending: 0 });
  expect(visibleProgress.stars).toBe(10);
});

test('rejects 4097th pending operation and preserves all 4096 durable intents', async () => {
  const token = captureAccountGeneration();
  const operations = Array.from({ length: 4_096 }, (_, index) => exactOperation(index));
  storage[levelSpinStarProjectionKey('account-a')] = JSON.stringify({
    schemaVersion: 'client-level-spin-star-projection.v2', ownerStableId: 'account-a',
    operations, acknowledged: {}, serverBalance: 0, serverEarnedTotal: 0, serverSeq: 0,
  });
  storage[levelSpinStarGrantOutboxKey('account-a')] = JSON.stringify(operations);
  await expect(enqueueLevelSpinStarGrant({
    token, requestId: 'request9999999999', lane: 'base', giftId: 'stars_10',
  }, { syncNow: false })).rejects.toThrow('level_spin_star_outbox_full');
  expect(JSON.parse(storage[levelSpinStarGrantOutboxKey('account-a')])).toHaveLength(4_096);
});

test('compacts 4096 exactly acknowledged operations and admits the 4097th intent', async () => {
  const token = captureAccountGeneration();
  const operations = Array.from({ length: 4_096 }, (_, index) => exactOperation(index));
  const acknowledged = Object.fromEntries(operations.map((operation) => [
    operation.operationId, operation.requestFingerprint,
  ]));
  storage[levelSpinStarProjectionKey('account-a')] = JSON.stringify({
    schemaVersion: 'client-level-spin-star-projection.v2', ownerStableId: 'account-a',
    operations, acknowledged, serverBalance: 40_960, serverEarnedTotal: 0, serverSeq: 4_096,
  });
  for (const operation of operations) {
    storage[`level_spin_star_operation_v1:${encodeURIComponent('account-a')}:${encodeURIComponent(operation.operationId)}`]
      = JSON.stringify(operation);
  }
  await recoverAndHydrateLevelSpinStarGrants(token, { syncNow: false });
  await enqueueLevelSpinStarGrant({
    token, requestId: 'request9999999999', lane: 'base', giftId: 'stars_10',
  }, { syncNow: false });
  expect(JSON.parse(storage[levelSpinStarGrantOutboxKey('account-a')])).toHaveLength(1);
  const projection = JSON.parse(storage[levelSpinStarProjectionKey('account-a')]);
  expect(projection.operations).toHaveLength(1);
});

test('account transition lock prevents a delayed recovery write from recreating wiped A keys', async () => {
  const token = captureAccountGeneration();
  let releaseWrite!: () => void;
  let writeStarted!: () => void;
  const started = new Promise<void>((resolve) => { writeStarted = resolve; });
  const delayed = new Promise<void>((resolve) => { releaseWrite = resolve; });
  (AsyncStorage.multiSet as jest.Mock).mockImplementationOnce(async (pairs: [string, string][]) => {
    writeStarted();
    await delayed;
    pairs.forEach(([key, value]) => { storage[key] = value; });
  });
  const recovery = recoverAndHydrateLevelSpinStarGrants(token, { syncNow: false });
  await started;
  const wipe = withAccountTransitionLock(async () => {
    beginAccountGeneration('account-b');
    Object.keys(storage).filter((key) => key.includes('level_spin_star_')).forEach((key) => { delete storage[key]; });
  });
  releaseWrite();
  await Promise.allSettled([recovery, wipe]);
  expect(Object.keys(storage).filter((key) => key.includes('level_spin_star_'))).toEqual([]);
});

test('base and premium use distinct stable operation ids', async () => {
  const token = captureAccountGeneration();
  for (const lane of ['base', 'premium'] as const) {
    await enqueueLevelSpinStarGrant({
      token, requestId: 'request0000000001', lane, giftId: 'stars_20',
    }, { syncNow: false });
  }
  const rows = JSON.parse(storage[levelSpinStarGrantOutboxKey('account-a')]);
  expect(rows.map((row: ExactOperation) => row.operationId)).toEqual([
    'level_spin:request0000000001.base', 'level_spin:request0000000001.premium',
  ]);
});

test('account switch during await cannot acknowledge, remove, or publish old operation', async () => {
  const token = captureAccountGeneration();
  await enqueueLevelSpinStarGrant({
    token, requestId: 'request0000000001', lane: 'base', giftId: 'stars_10',
  }, { syncNow: false });
  let resolveCommit!: (value: boolean) => void;
  bridgeMocks().commitPhoneStateNonMonetaryEconomyGrant.mockReturnValueOnce(new Promise((resolve) => {
    resolveCommit = resolve;
  }));
  const snapshot = jest.requireMock('../app/app_snapshot_store') as { patchAppSnapshot: jest.Mock };
  const syncing = syncPendingLevelSpinStarGrants(token);
  for (let index = 0; index < 10 && bridgeMocks().commitPhoneStateNonMonetaryEconomyGrant.mock.calls.length === 0; index += 1) {
    await new Promise<void>((resolve) => setImmediate(resolve));
  }
  expect(bridgeMocks().commitPhoneStateNonMonetaryEconomyGrant).toHaveBeenCalledTimes(1);
  snapshot.patchAppSnapshot.mockClear();
  beginAccountGeneration('account-b');
  resolveCommit(true);
  expect(await syncing).toEqual({ synced: 0, pending: 0 });
  expect(JSON.parse(storage[levelSpinStarGrantOutboxKey('account-a')])).toHaveLength(1);
  expect(transportMock()).not.toHaveBeenCalled();
  expect(snapshot.patchAppSnapshot).not.toHaveBeenCalled();
});
