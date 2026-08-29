import AsyncStorage from '@react-native-async-storage/async-storage';
import { createHash } from 'crypto';
import {
  __resetAccountGenerationForTests,
  beginAccountGeneration,
} from '../app/account_generation';
import {
  CLIENT_SHARD_GRANT_RECEIPT_PREFIX,
  CLIENT_SHARD_LEDGER_STATE_PREFIX,
  CLIENT_SHARD_OPERATION_PREFIX,
  clientShardPreparedStorageKey,
  clientShardConflictStorageKey,
  clientShardPhoneStateOutboxStorageKey,
  backfillClientShardPhoneStateOutbox,
  commitClientShardOperation,
  drainClientShardPhoneStateOutbox,
  recoverPreparedClientShardOperation,
} from '../app/economy/client_shard_operation_ledger';
import { configurePhoneStateEconomyBridge } from '../app/phone_state_economy_bridge';
import { CLIENT_SHARD_SEMANTIC_PAID_PREFIX } from '../app/economy/client_shard_semantic_reducer';
import { seasonPassEntitlementStorageKey } from '../app/season_pass_model';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/stable_id', () => ({ getStableId: jest.fn(async () => 'owner-1') }));

const storage: Record<string, string> = {};

const purchase = (operationId = 'energy:purchase:0001', energy = 5) => ({
  operationId,
  direction: 'debit' as const,
  amount: 5,
  reason: 'buy_energy',
  grant: { kind: 'energy_refill', subjectId: 'base_energy', payload: { energy } },
  localWrites: [['energy_state', JSON.stringify({ current: energy, lastRecoveryTime: 10 })]] as const,
});

const semanticEnergyPurchase = (operationId: string, energy = 5, lastRecoveryTime = 10) => ({
  ...purchase(operationId, energy),
  semanticResult: true,
  grant: { kind: 'energy_refill', subjectId: 'base_energy', payload: { current: energy } },
  localWrites: [['energy_state', JSON.stringify({ current: energy, lastRecoveryTime })]] as const,
});

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(storage).forEach((key) => delete storage[key]);
  storage.shards_balance = '20';
  __resetAccountGenerationForTests();
  beginAccountGeneration('owner-1');
  (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => storage[key] ?? null);
  (AsyncStorage.getAllKeys as jest.Mock).mockImplementation(async () => Object.keys(storage));
  (AsyncStorage.multiGet as jest.Mock).mockImplementation(async (keys: readonly string[]) => (
    keys.map((key) => [key, storage[key] ?? null])
  ));
  (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => {
    storage[key] = value;
  });
  (AsyncStorage.multiSet as jest.Mock).mockImplementation(async (pairs: readonly (readonly [string, string])[]) => {
    pairs.forEach(([key, value]) => { storage[key] = value; });
  });
  (AsyncStorage.removeItem as jest.Mock).mockImplementation(async (key: string) => {
    delete storage[key];
  });
});

function canonicalFingerprint(value: unknown): string {
  const normalize = (input: unknown): unknown => {
    if (Array.isArray(input)) return input.map(normalize);
    if (input && typeof input === 'object') {
      return Object.fromEntries(
        Object.entries(input as Record<string, unknown>)
          .filter(([, item]) => item !== undefined)
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([key, item]) => [key, normalize(item)]),
      );
    }
    return input;
  };
  return createHash('sha256').update(JSON.stringify(normalize(value))).digest('hex');
}

afterEach(() => {
  configurePhoneStateEconomyBridge(null);
});

it('returns the durable local purchase without waiting for a stalled PhoneState mirror', async () => {
  const phoneStateCommit = jest.fn(() => new Promise<never>(() => {}));
  configurePhoneStateEconomyBridge({
    scope: { stableUid: 'owner-1', accountGeneration: 1 },
    runtimeGeneration: 1,
    deviceId: 'device-1',
    store: { commit: phoneStateCommit, readProjection: jest.fn(), replay: jest.fn() } as never,
    triggerSync: jest.fn(),
  });

  let timer: ReturnType<typeof setTimeout> | undefined;
  const outcome = await Promise.race([
    commitClientShardOperation(purchase('energy:phone-state-stall:0001')),
    new Promise<'timed-out'>((resolve) => {
      timer = setTimeout(() => resolve('timed-out'), 50);
    }),
  ]);
  if (timer) clearTimeout(timer);
  await new Promise((resolve) => setTimeout(resolve, 0));

  expect(outcome).toMatchObject({ status: 'applied', balanceAfter: 15 });
  expect(phoneStateCommit).toHaveBeenCalledTimes(1);
  expect(storage.energy_state).toContain('"current":5');
  expect(storage.shards_balance).toBe('15');
  expect(JSON.parse(storage[clientShardPhoneStateOutboxStorageKey('owner-1', 1)])).toMatchObject({
    ownerStableId: 'owner-1',
    lineage: 1,
    operationIds: ['energy:phone-state-stall:0001'],
  });
});

it('removes a durable PhoneState marker only after exact commit true', async () => {
  const phoneStateCommit = jest.fn(async () => ({ duplicate: false }));
  configurePhoneStateEconomyBridge({
    scope: { stableUid: 'owner-1', accountGeneration: 1 },
    runtimeGeneration: 1,
    deviceId: 'device-1',
    store: { commit: phoneStateCommit, readProjection: jest.fn(), replay: jest.fn() } as never,
    triggerSync: jest.fn(),
  });
  const applied = await commitClientShardOperation(purchase('energy:phone-state-ok:0001'));
  expect(applied).toMatchObject({ status: 'applied' });

  const drained = await drainClientShardPhoneStateOutbox();
  expect(drained.pending).toBe(0);
  expect(drained.synced).toBeLessThanOrEqual(1);
  expect(JSON.parse(storage[clientShardPhoneStateOutboxStorageKey('owner-1', 1)])).toMatchObject({
    ownerStableId: 'owner-1',
    lineage: 1,
    operationIds: [],
  });
  expect(phoneStateCommit).toHaveBeenCalledWith(expect.anything(), {
    idempotencyKey: 'economy:energy:phone-state-ok:0001',
  });
});

it.each([
  ['false', async () => { throw new Error('sqlite_busy'); }],
  ['hang', () => new Promise<never>(() => {})],
] as const)('retains the durable PhoneState marker when the mirror %s path does not commit', async (_label, commit) => {
  configurePhoneStateEconomyBridge({
    scope: { stableUid: 'owner-1', accountGeneration: 1 }, runtimeGeneration: 1, deviceId: 'device-1',
    store: { commit, readProjection: jest.fn(), replay: jest.fn() } as never,
    triggerSync: jest.fn(),
  });
  const operationId = `energy:phone-state-retry:${_label}`;
  await expect(commitClientShardOperation(purchase(operationId))).resolves.toMatchObject({ status: 'applied' });
  await expect(drainClientShardPhoneStateOutbox({ timeoutMs: 5 })).resolves.toEqual({ synced: 0, pending: 1 });
  expect(JSON.parse(storage[clientShardPhoneStateOutboxStorageKey('owner-1', 1)])).toMatchObject({
    ownerStableId: 'owner-1',
    lineage: 1,
    operationIds: [operationId],
  });
});

it('never drains a durable marker into a different persistent lineage', async () => {
  const firstLineageCommit = jest.fn(async () => { throw new Error('sqlite_busy'); });
  configurePhoneStateEconomyBridge({
    scope: { stableUid: 'owner-1', accountGeneration: 1 }, runtimeGeneration: 1, deviceId: 'device-1',
    store: { commit: firstLineageCommit, readProjection: jest.fn(), replay: jest.fn() } as never,
    triggerSync: jest.fn(),
  });
  const operationId = 'energy:old-lineage:0001';
  await expect(commitClientShardOperation(purchase(operationId))).resolves.toMatchObject({ status: 'applied' });

  const newLineageCommit = jest.fn(async () => ({ duplicate: false }));
  configurePhoneStateEconomyBridge({
    scope: { stableUid: 'owner-1', accountGeneration: 2 }, runtimeGeneration: 1, deviceId: 'device-2',
    store: { commit: newLineageCommit, readProjection: jest.fn(), replay: jest.fn() } as never,
    triggerSync: jest.fn(),
  });

  await expect(drainClientShardPhoneStateOutbox()).resolves.toEqual({ synced: 0, pending: 0 });
  expect(newLineageCommit).not.toHaveBeenCalled();
  expect(JSON.parse(storage[clientShardPhoneStateOutboxStorageKey('owner-1', 1)])).toMatchObject({
    lineage: 1,
    operationIds: [operationId],
  });
});

it('backfills a missing mirror marker from the immutable root when PhoneState opens later', async () => {
  const operationId = 'energy:runtime-backfill:0001';
  await expect(commitClientShardOperation(purchase(operationId))).resolves.toMatchObject({ status: 'applied' });
  expect(storage[clientShardPhoneStateOutboxStorageKey('owner-1', 1)]).toBeUndefined();

  const phoneStateCommit = jest.fn(async () => ({ duplicate: false }));
  configurePhoneStateEconomyBridge({
    scope: { stableUid: 'owner-1', accountGeneration: 1 }, runtimeGeneration: 1, deviceId: 'device-1',
    store: { commit: phoneStateCommit, readProjection: jest.fn(), replay: jest.fn() } as never,
    triggerSync: jest.fn(),
  });
  await expect(backfillClientShardPhoneStateOutbox()).resolves.toEqual({ added: 1, pending: 1 });
  await expect(drainClientShardPhoneStateOutbox()).resolves.toEqual({ synced: 1, pending: 0 });
  expect(phoneStateCommit).toHaveBeenCalledTimes(1);

  await expect(backfillClientShardPhoneStateOutbox()).resolves.toEqual({ added: 0, pending: 0 });
  expect(JSON.parse(storage[clientShardPhoneStateOutboxStorageKey('owner-1', 1)])).toMatchObject({
    operationIds: [],
    acknowledgedOperationIds: [operationId],
  });
});

it('publishes the exact grant before the immutable debit operation and balance projection', async () => {
  const writes: string[] = [];
  (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => {
    writes.push(key);
    storage[key] = value;
  });
  (AsyncStorage.multiSet as jest.Mock).mockImplementation(async (pairs: readonly (readonly [string, string])[]) => {
    pairs.forEach(([key, value]) => {
      writes.push(key);
      storage[key] = value;
    });
  });

  await expect(commitClientShardOperation(purchase())).resolves.toMatchObject({
    status: 'applied',
    balanceBefore: 20,
    balanceAfter: 15,
  });

  const grantIndex = writes.indexOf('energy_state');
  const receiptIndex = writes.findIndex((key) => key.startsWith(CLIENT_SHARD_GRANT_RECEIPT_PREFIX));
  const operationIndex = writes.findIndex((key) => key.startsWith(CLIENT_SHARD_OPERATION_PREFIX));
  const stateIndex = writes.findIndex((key) => key.startsWith(CLIENT_SHARD_LEDGER_STATE_PREFIX));
  const balanceIndex = writes.lastIndexOf('shards_balance');
  expect(grantIndex).toBeGreaterThanOrEqual(0);
  expect(grantIndex).toBeLessThan(receiptIndex);
  expect(receiptIndex).toBeLessThan(operationIndex);
  expect(operationIndex).toBeLessThan(stateIndex);
  expect(stateIndex).toBeLessThan(balanceIndex);
  expect(storage.energy_state).toContain('"current":5');
  expect(storage.shards_balance).toBe('15');
});

it('cannot publish a debit when persisting its result fails', async () => {
  (AsyncStorage.multiSet as jest.Mock).mockImplementation(async (pairs: readonly (readonly [string, string])[]) => {
    if (pairs.some(([key]) => key === 'energy_state')) throw new Error('disk_full');
    pairs.forEach(([key, value]) => { storage[key] = value; });
  });

  await expect(commitClientShardOperation(purchase())).resolves.toEqual({
    status: 'failed',
    reason: 'disk_full',
  });
  expect(storage.shards_balance).toBe('20');
  expect(Object.keys(storage).some((key) => key.startsWith(CLIENT_SHARD_OPERATION_PREFIX))).toBe(false);
});

it('deducts a stable operation id once and never replays a mutable grant', async () => {
  await expect(commitClientShardOperation(purchase())).resolves.toMatchObject({ status: 'applied' });
  storage.energy_state = JSON.stringify({ current: 2, lastRecoveryTime: 20 });

  await expect(commitClientShardOperation(purchase())).resolves.toMatchObject({
    status: 'already-applied',
    balanceAfter: 15,
  });
  expect(storage.shards_balance).toBe('15');
  expect(storage.energy_state).toContain('"current":2');
});

it('rejects reuse of an operation id for a different result', async () => {
  await expect(commitClientShardOperation(purchase())).resolves.toMatchObject({ status: 'applied' });
  await expect(commitClientShardOperation(purchase('energy:purchase:0001', 6))).resolves.toEqual({
    status: 'failed',
    reason: 'operation_id_conflict',
  });
  expect(storage.shards_balance).toBe('15');
});

it('checks insufficient funds locally without contacting a server or writing the grant', async () => {
  storage.shards_balance = '3';
  await expect(commitClientShardOperation(purchase())).resolves.toEqual({ status: 'insufficient', balance: 3 });
  expect(storage.energy_state).toBeUndefined();
  expect(Object.keys(storage).some((key) => key.startsWith(CLIENT_SHARD_OPERATION_PREFIX))).toBe(false);
});

it('keeps refund and cross-device overspend as debt without revoking either exact result', async () => {
  storage.shards_balance = '3';
  const result = await commitClientShardOperation({
    ...purchase('remote:energy:0002'),
    expectedOwnerStableId: 'owner-1',
    mergeReplay: true,
    mergeSourceFingerprint: 'a'.repeat(64),
  });
  expect(result).toMatchObject({ status: 'applied', balanceAfter: -2 });
  expect(storage.energy_state).toContain('"current":5');
  expect(storage.shards_balance).toBe('0');

  const credit = await commitClientShardOperation({
    operationId: 'credit:future:0001',
    direction: 'credit',
    amount: 1,
    reason: 'lesson_reward',
    grant: { kind: 'lesson_reward', subjectId: 'lesson-1' },
    localWrites: [],
  });
  expect(credit).toMatchObject({ status: 'applied', balanceAfter: -1 });
  expect(storage.shards_balance).toBe('0');
});

it('recovers a prepared cross-device merge with the immutable cloud fingerprint', async () => {
  storage.shards_balance = '3';
  let failOperationWrite = true;
  (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => {
    if (failOperationWrite && key.startsWith(CLIENT_SHARD_OPERATION_PREFIX)) {
      failOperationWrite = false;
      throw new Error('simulated_crash');
    }
    storage[key] = value;
  });
  const merge = {
    ...purchase('remote:energy:0003'),
    expectedOwnerStableId: 'owner-1',
    mergeReplay: true,
    mergeSourceFingerprint: 'b'.repeat(64),
  } as const;

  await expect(commitClientShardOperation(merge)).resolves.toEqual({
    status: 'failed',
    reason: 'simulated_crash',
  });
  expect(storage.energy_state).toContain('"current":5');
  expect(storage.shards_balance).toBe('3');

  await expect(recoverPreparedClientShardOperation()).resolves.toMatchObject({
    status: 'applied',
    balanceAfter: -2,
  });
  expect(storage.shards_balance).toBe('0');
});

it('serializes Promise.all refills and debits only the operation that materializes energy', async () => {
  storage.energy_state = JSON.stringify({ current: 1, lastRecoveryTime: 7 });
  const [first, second] = await Promise.all([
    commitClientShardOperation(semanticEnergyPurchase('energy:race:000001', 5, 11)),
    commitClientShardOperation(semanticEnergyPurchase('energy:race:000002', 5, 22)),
  ]);
  expect([first.status, second.status].sort()).toEqual(['already-satisfied', 'applied']);
  expect(storage.shards_balance).toBe('15');
  expect(JSON.parse(storage.energy_state)).toEqual({ current: 5, lastRecoveryTime: 7 });
  expect(Object.keys(storage).filter((key) => key.startsWith(CLIENT_SHARD_OPERATION_PREFIX))).toHaveLength(1);
});

it('uses one semantic fingerprint across device-local snapshots and never double-debits', async () => {
  const first = await commitClientShardOperation({
    operationId: 'semantic:official-pack-0000000000000000000000000000000000000001',
    direction: 'debit',
    amount: 7,
    reason: 'card_pack',
    semanticResult: true,
    grant: { kind: 'official_card_pack', subjectId: 'pack-1', payload: { studyTarget: 'en' } },
    localWrites: [['flashcards_owned_packs_en_v1', JSON.stringify(['old-a', 'pack-1'])]],
  });
  expect(first).toMatchObject({ status: 'applied', balanceAfter: 13 });

  const second = await commitClientShardOperation({
    operationId: 'semantic:official-pack-0000000000000000000000000000000000000001',
    direction: 'debit',
    amount: 7,
    reason: 'card_pack',
    semanticResult: true,
    grant: { kind: 'official_card_pack', subjectId: 'pack-1', payload: { studyTarget: 'en' } },
    localWrites: [['flashcards_owned_packs_en_v1', JSON.stringify(['old-b', 'pack-1'])]],
  });
  expect(second).toMatchObject({ status: 'already-applied', balanceAfter: 13 });
  expect(storage.shards_balance).toBe('13');
});

it('collapses a different remote semantic operation when its result already exists', async () => {
  storage.flashcards_owned_packs_v1 = JSON.stringify(['pack-1']);
  const result = await commitClientShardOperation({
    expectedOwnerStableId: 'owner-1',
    mergeReplay: true,
    mergeSemanticResult: true,
    mergeSourceFingerprint: 'c'.repeat(64),
    operationId: 'remote:official-pack:0001',
    direction: 'debit',
    amount: 7,
    reason: 'card_pack',
    grant: { kind: 'official_card_pack', subjectId: 'pack-1', payload: { studyTarget: 'en' } },
    localWrites: [],
  });
  expect(result).toMatchObject({ status: 'already-satisfied', balance: 20 });
  expect(storage.shards_balance).toBe('20');
});

it('fails closed when a prepared operation id is retried with another fingerprint', async () => {
  let failResultOnce = true;
  (AsyncStorage.multiSet as jest.Mock).mockImplementation(async (pairs: readonly (readonly [string, string])[]) => {
    if (failResultOnce && pairs.some(([key]) => key === 'energy_state')) {
      failResultOnce = false;
      throw new Error('simulated_fault');
    }
    pairs.forEach(([key, value]) => { storage[key] = value; });
  });
  await expect(commitClientShardOperation(purchase('energy:prepared:0001', 5))).resolves.toEqual({
    status: 'failed',
    reason: 'simulated_fault',
  });
  await expect(commitClientShardOperation(purchase('energy:prepared:0001', 6))).resolves.toEqual({
    status: 'failed',
    reason: 'prepared_operation_fingerprint_conflict',
  });
  expect(storage.shards_balance).toBe('20');
});

it('recovers a semantic result receipt after a crash and charges exactly once', async () => {
  storage.energy_state = JSON.stringify({ current: 1, lastRecoveryTime: 9 });
  let failOperationOnce = true;
  (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => {
    if (failOperationOnce && key.startsWith(CLIENT_SHARD_OPERATION_PREFIX)) {
      failOperationOnce = false;
      throw new Error('crash_after_grant');
    }
    storage[key] = value;
  });
  await expect(commitClientShardOperation(semanticEnergyPurchase('energy:semantic:crash1'))).resolves.toEqual({
    status: 'failed',
    reason: 'crash_after_grant',
  });
  expect(storage.energy_state).toContain('"current":5');
  expect(storage.shards_balance).toBe('20');

  await expect(recoverPreparedClientShardOperation()).resolves.toMatchObject({
    status: 'applied',
    balanceAfter: 15,
  });
  expect(storage.shards_balance).toBe('15');
});

it('deduplicates a concurrent boost but permits another purchase after expiry', async () => {
  const now = Date.now();
  const boost = (operationId: string, startedAt: number) => ({
    operationId,
    direction: 'debit' as const,
    amount: 4,
    reason: 'league_boost',
    semanticResult: true,
    grant: {
      kind: 'personal_league_boost',
      subjectId: 'x2_30m',
      payload: { id: 'x2_30m', multiplier: 2, startedAt, expiresAt: startedAt + 60_000 },
    },
    localWrites: [[
      'league_personal_boost_v1',
      JSON.stringify({ id: 'x2_30m', multiplier: 2, startedAt, expiresAt: startedAt + 60_000 }),
    ]] as const,
  });
  const concurrent = await Promise.all([
    commitClientShardOperation(boost('boost:race:00000001', now)),
    commitClientShardOperation(boost('boost:race:00000002', now + 1)),
  ]);
  expect(concurrent.map((result) => result.status).sort()).toEqual(['already-satisfied', 'applied']);
  expect(storage.shards_balance).toBe('16');

  storage.league_personal_boost_v1 = JSON.stringify({ expiresAt: now - 1 });
  await expect(commitClientShardOperation(boost('boost:later:0000001', now + 120_000))).resolves.toMatchObject({
    status: 'applied',
    balanceAfter: 12,
  });
});

it('credits one semantic reward across different device-local marker snapshots', async () => {
  const base = {
    operationId: 'reward:lesson:semantic01',
    direction: 'credit' as const,
    amount: 3,
    reason: 'lesson_reward',
    semanticResult: true,
    grant: { kind: 'lesson_reward', subjectId: 'lesson-42' },
  };
  await expect(commitClientShardOperation({
    ...base,
    localWrites: [['lesson_reward_marker', 'device-a']],
  })).resolves.toMatchObject({ status: 'applied', balanceAfter: 23 });
  await expect(commitClientShardOperation({
    ...base,
    localWrites: [['lesson_reward_marker', 'device-b']],
  })).resolves.toMatchObject({ status: 'already-applied', balanceAfter: 23 });
  expect(storage.shards_balance).toBe('23');
  expect(storage.lesson_reward_marker).toBe('device-a');
});

it('merges an unknown remote credit because the balance delta is its portable result', async () => {
  const result = await commitClientShardOperation({
    expectedOwnerStableId: 'owner-1',
    mergeReplay: true,
    mergeSemanticResult: true,
    mergeSourceFingerprint: 'd'.repeat(64),
    operationId: 'remote:unknown:credit01',
    direction: 'credit',
    amount: 2,
    reason: 'future_reward',
    grant: { kind: 'future_unknown_reward', subjectId: 'future-1' },
    localWrites: [],
  });
  expect(result).toMatchObject({ status: 'applied', balanceAfter: 22 });
  expect(storage.shards_balance).toBe('22');
});

it.each([
  ['higher clock first', [
    { level: 1, cost: 20, createdAtMs: 200 },
    { level: 2, cost: 45, createdAtMs: 100 },
  ]],
  ['clock-skewed higher semantic level first', [
    { level: 2, cost: 45, createdAtMs: 100 },
    { level: 1, cost: 20, createdAtMs: 200 },
  ]],
] as const)('charges every distinct profile level in permutation: %s', async (_label, levels) => {
  storage.shards_balance = '100';
  for (const item of levels) {
    await expect(commitClientShardOperation({
      expectedOwnerStableId: 'owner-1',
      mergeReplay: true,
      mergeSemanticResult: true,
      mergeSourceFingerprint: String(item.level).repeat(64),
      operationId: `remote:profile:level:${item.level}`,
      direction: 'debit',
      amount: item.cost,
      reason: 'profile_card_upgrade',
      grant: {
        kind: 'profile_card_level',
        subjectId: String(item.level),
        payload: { level: item.level },
      },
      localWrites: [],
      createdAtMs: item.createdAtMs,
    })).resolves.toMatchObject({ status: 'applied' });
  }
  expect(storage.shards_balance).toBe('35');
  expect(storage.profile_card_level).toBe('2');

  await expect(commitClientShardOperation({
    expectedOwnerStableId: 'owner-1',
    mergeReplay: true,
    mergeSemanticResult: true,
    mergeSourceFingerprint: 'f'.repeat(64),
    operationId: 'legacy:duplicate:level:1',
    direction: 'debit',
    amount: 20,
    reason: 'profile_card_upgrade',
    grant: { kind: 'profile_card_level', subjectId: '1', payload: { level: 1 } },
    localWrites: [],
    createdAtMs: 300,
  })).resolves.toMatchObject({ status: 'already-satisfied', balance: 35 });
});

it.each([
  ['chronological', ['2026-Q1', '2026-Q2']],
  ['reverse semantic order despite client clock order', ['2026-Q2', '2026-Q1']],
] as const)('charges every distinct season purchase in permutation: %s', async (_label, seasons) => {
  storage.shards_balance = '100';
  for (const [index, seasonId] of seasons.entries()) {
    await expect(commitClientShardOperation({
      expectedOwnerStableId: 'owner-1',
      mergeReplay: true,
      mergeSemanticResult: true,
      mergeSourceFingerprint: (index === 0 ? 'a' : 'b').repeat(64),
      operationId: `remote:season:${seasonId}`,
      direction: 'debit',
      amount: 25,
      reason: 'season_pass_purchase',
      grant: { kind: 'season_pass', subjectId: seasonId, payload: { seasonId } },
      localWrites: [],
      createdAtMs: index === 0 ? 200 : 100,
    })).resolves.toMatchObject({ status: 'applied' });
  }
  expect(storage.shards_balance).toBe('50');
  expect(JSON.parse(storage[seasonPassEntitlementStorageKey('owner-1')]!)).toMatchObject({
    schemaVersion: 'season-pass-entitlement.v1',
    ownerStableId: 'owner-1',
    seasonId: '2026-Q2',
  });
  expect(storage.season_pass_owned_v1).toBeUndefined();

  await expect(commitClientShardOperation({
    expectedOwnerStableId: 'owner-1',
    mergeReplay: true,
    mergeSemanticResult: true,
    mergeSourceFingerprint: 'e'.repeat(64),
    operationId: 'legacy:duplicate:season:q1',
    direction: 'debit',
    amount: 25,
    reason: 'season_pass_purchase',
    grant: { kind: 'season_pass', subjectId: '2026-Q1', payload: { seasonId: '2026-Q1' } },
    localWrites: [],
    createdAtMs: 300,
  })).resolves.toMatchObject({ status: 'already-satisfied', balance: 50 });
});

it('rejects raw caller injection into semantic paid markers', async () => {
  await expect(commitClientShardOperation({
    ...purchase('energy:marker:inject1'),
    localWrites: [[`${CLIENT_SHARD_SEMANTIC_PAID_PREFIX}owner-1:profile_card_level:5`, '1']],
  })).resolves.toEqual({ status: 'failed', reason: 'reserved_local_write_key' });
});

// зачем (владелец 2026-08-27, «в TestFlight не покупаются аватары/ауры хотя
// жемчужин полно»): preparedKey — ОДИН слот на владельца. Раньше, если запись
// в нём была испорчена/несовместима с текущей версией приложения (пережиток
// старого билда после обновления), recoverPreparedClientShardOperation
// возвращала 'failed', а commitShardCompositeOperation на любой 'failed' от
// восстановления сразу отдавала ошибку, НЕ снимая слот — КАЖДАЯ следующая
// покупка проваливалась той же ошибкой навсегда. Тест сторожит самоочистку.
it('clears a corrupt prepared slot instead of blocking every future purchase forever', async () => {
  storage[clientShardPreparedStorageKey('owner-1')] = '{not json';

  const stuckRecovery = await recoverPreparedClientShardOperation();
  expect(stuckRecovery).toEqual({ status: 'failed', reason: 'prepared_operation_corrupt' });
  expect(storage[clientShardPreparedStorageKey('owner-1')]).toBeUndefined();

  // Следующая обычная покупка больше не видит зависшую запись и проходит.
  await expect(commitClientShardOperation(purchase('energy:after-corrupt:0001'))).resolves.toMatchObject({
    status: 'applied',
    balanceAfter: 15,
  });
});

// зачем (владелец 2026-08-27, «применение образа/ауры в Студии зависает
// прозрачной кнопкой навсегда, даже после покупки и после перезапуска
// приложения»): prepared-слот может застрять не только испорченным JSON, но и
// СТРУКТУРНЫМ конфликтом с уже записанной операцией того же operationId —
// commitUnlocked бросает 'operation_id_conflict', когда existing-операция на
// диске имеет другой fingerprint. Это не читалось раньше как terminal:
// recoverPreparedClientShardOperation возвращала 'failed' и НЕ снимала слот,
// а commitShardCompositeOperation на любой 'failed' от восстановления сразу
// отдавал ту же ошибку наружу — каждая следующая трата жемчужин (включая
// применение уже купленного образа) валилась ею же навсегда. Существующие
// данные на диске не меняются повторными попытками, поэтому это тот же класс
// «повтор не изменит исход», что и мусорный JSON — тест сторожит самоочистку.
it('uses the immutable root on a prepared operation-id conflict and preserves the conflicting evidence in quarantine', async () => {
  await expect(commitClientShardOperation(purchase('energy:conflict:0001'))).resolves.toMatchObject({
    status: 'applied',
    balanceAfter: 15,
  });

  const preparedKey = clientShardPreparedStorageKey('owner-1');
  const conflictingInput = purchase('energy:conflict:0001', 9);
  storage[preparedKey] = JSON.stringify({
    schemaVersion: 'client-shard-prepared.v1',
    ownerStableId: 'owner-1',
    input: conflictingInput,
    requestFingerprint: canonicalFingerprint({
      operationId: conflictingInput.operationId,
      authority: 'client',
      direction: conflictingInput.direction,
      amount: conflictingInput.amount,
      reason: conflictingInput.reason,
      grant: conflictingInput.grant,
      semanticResult: false,
      localWrites: conflictingInput.localWrites,
    }),
    preparedAtMs: Date.now(),
  });

  const stuckRecovery = await recoverPreparedClientShardOperation();
  expect(stuckRecovery).toMatchObject({ status: 'already-applied', balanceAfter: 15 });
  expect(storage[preparedKey]).toBeUndefined();
  expect(JSON.parse(storage[clientShardConflictStorageKey('owner-1')])).toMatchObject({
    reason: 'operation_id_conflict',
    operationId: 'energy:conflict:0001',
  });

  // Следующая обычная покупка (совсем другой товар) больше не блокируется.
  await expect(commitClientShardOperation(purchase('energy:after-conflict:0001'))).resolves.toMatchObject({
    status: 'applied',
    balanceAfter: 10,
  });
  expect(storage[preparedKey]).toBeUndefined();
});

it('quarantines but never discards a fingerprint-mismatched prepared grant receipt', async () => {
  // Оставляем prepared-слот тем же способом, что и «recovers a semantic result
  // receipt after a crash» ниже — крах ПОСЛЕ записи слота, ДО завершения
  // операции. Затем симулируем несовместимость со старой версией: запись
  // на диске повреждена так, что её отпечаток больше не сходится (как если бы
  // формат prepared-записи изменился между версиями приложения).
  let failOperationOnce = true;
  (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => {
    if (failOperationOnce && key.startsWith(CLIENT_SHARD_OPERATION_PREFIX)) {
      failOperationOnce = false;
      throw new Error('crash_after_grant');
    }
    storage[key] = value;
  });
  await expect(commitClientShardOperation(semanticEnergyPurchase('energy:stuck-shape:0001'))).resolves.toEqual({
    status: 'failed',
    reason: 'crash_after_grant',
  });
  const preparedKey = clientShardPreparedStorageKey('owner-1');
  expect(storage[preparedKey]).toBeDefined();
  const tampered = JSON.parse(storage[preparedKey]);
  tampered.input.amount = 999;
  storage[preparedKey] = JSON.stringify(tampered);

  const stuckRecovery = await recoverPreparedClientShardOperation();
  expect(stuckRecovery).toEqual({ status: 'failed', reason: 'prepared_evidence_quarantined' });
  expect(storage[preparedKey]).toBeDefined();
  expect(JSON.parse(storage[clientShardConflictStorageKey('owner-1')])).toMatchObject({
    reason: 'prepared_operation_fingerprint_mismatch',
    operationId: 'energy:stuck-shape:0001',
  });
  await expect(commitClientShardOperation(purchase('energy:after-stuck-shape:0001'))).resolves.toEqual({
    status: 'failed', reason: 'prepared_operation_recovery_required',
  });
});

it('never clears an unidentifiable prepared record while immutable owner evidence exists', async () => {
  await expect(commitClientShardOperation(purchase('energy:evidence-root:0001'))).resolves.toMatchObject({
    status: 'applied', balanceAfter: 15,
  });
  const preparedKey = clientShardPreparedStorageKey('owner-1');
  storage[preparedKey] = '{unreadable-prepared';

  await expect(recoverPreparedClientShardOperation()).resolves.toEqual({
    status: 'failed', reason: 'prepared_evidence_quarantined',
  });
  expect(storage[preparedKey]).toBe('{unreadable-prepared');
  expect(JSON.parse(storage[clientShardConflictStorageKey('owner-1')])).toMatchObject({
    reason: 'prepared_operation_corrupt_unidentified_evidence',
    operationId: null,
  });
});

it('rebuilds projection and exact grant from an immutable root after a crash cut', async () => {
  let failStateOnce = true;
  (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => {
    if (failStateOnce && key.startsWith(CLIENT_SHARD_LEDGER_STATE_PREFIX)) {
      failStateOnce = false;
      throw new Error('crash_after_immutable_root');
    }
    storage[key] = value;
  });
  await expect(commitClientShardOperation(purchase('energy:root-recovery:0001', 9))).resolves.toEqual({
    status: 'failed', reason: 'crash_after_immutable_root',
  });
  expect(Object.keys(storage).some((key) => key.includes('energy:root-recovery:0001'))).toBe(true);
  delete storage.energy_state;
  delete storage.shards_balance;

  await expect(recoverPreparedClientShardOperation()).resolves.toMatchObject({
    status: 'already-applied', balanceBefore: 20, balanceAfter: 15,
  });
  expect(JSON.parse(storage.energy_state)).toMatchObject({ current: 9 });
  expect(storage.shards_balance).toBe('15');
  expect(storage[clientShardPreparedStorageKey('owner-1')]).toBeUndefined();
});

// зачем: раньше флаг «оплачено» завершал операцию с пустым writes, поэтому
// покупка, потерявшая свой товар на диске (гонка/чистка кэша), не выдавалась
// уже НИКОГДА — жемчужины списаны, а набора нет. Тест сторожит до-выдачу.
it('re-materializes a paid card pack whose local entitlement disappeared', async () => {
  const packGrant = {
    kind: 'official_card_pack',
    subjectId: 'travel_basic',
    payload: { studyTarget: 'en' },
  };
  const ownedKey = 'flashcards_owned_packs_v1';

  // Первая покупка: списывает жемчуг и кладёт набор в «Мои».
  await expect(commitClientShardOperation({
    expectedOwnerStableId: 'owner-1',
    operationId: 'pack:travel_basic:0001',
    direction: 'debit',
    amount: 5,
    reason: 'card_pack',
    grant: packGrant,
    localWrites: [],
    semanticResult: true,
  })).resolves.toMatchObject({ status: 'applied', balanceAfter: 15 });
  expect(JSON.parse(storage[ownedKey] ?? '[]')).toContain('travel_basic');

  // Набор пропал с диска, флаг «оплачено» остался — состояние из репортов.
  delete storage[ownedKey];
  expect(storage[`${CLIENT_SHARD_SEMANTIC_PAID_PREFIX}owner-1:official_card_pack:travel_basic`]).toBe('1');

  const balanceBeforeRetry = storage.shards_balance;
  const retry = await commitClientShardOperation({
    expectedOwnerStableId: 'owner-1',
    operationId: 'pack:travel_basic:0002',
    direction: 'debit',
    amount: 5,
    reason: 'card_pack',
    grant: packGrant,
    localWrites: [],
    semanticResult: true,
  });

  // Набор снова выдан, повторного списания не произошло.
  expect(retry.status).toBe('already-satisfied');
  expect(JSON.parse(storage[ownedKey] ?? '[]')).toContain('travel_basic');
  expect(storage.shards_balance).toBe(balanceBeforeRetry);
});
