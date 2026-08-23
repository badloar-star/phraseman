import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  __resetAccountGenerationForTests,
  beginAccountGeneration,
} from '../app/account_generation';
import {
  CLIENT_SHARD_GRANT_RECEIPT_PREFIX,
  CLIENT_SHARD_LEDGER_STATE_PREFIX,
  CLIENT_SHARD_OPERATION_PREFIX,
  commitClientShardOperation,
  recoverPreparedClientShardOperation,
} from '../app/economy/client_shard_operation_ledger';
import { CLIENT_SHARD_SEMANTIC_PAID_PREFIX } from '../app/economy/client_shard_semantic_reducer';

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
  expect(JSON.parse(storage.season_pass_owned_v1)).toMatchObject({ seasonId: '2026-Q2' });

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
