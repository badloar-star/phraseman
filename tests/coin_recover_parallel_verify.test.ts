// зачем (координатор 04.10, «ок» на пункт (б)): отпечатки сохранённых операций кошелька проверяются
// параллельно. Сторожим, что ускорение не ослабило защиту: любая битая операция по-прежнему роняет
// восстановление, причина — по первой битой строке в исходном порядке, ничего не пропускается.
// Плюс логи замка аккаунта (замер №11): держатель дольше 1 с и «кто держал» у долгого ожидания.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createHash } from 'node:crypto';
import {
  beginAccountGeneration,
  captureAccountGeneration,
  withAccountTransitionLock,
} from '../app/account_generation';
import { readUnifiedLevelSpinStars } from '../app/level_spin_star_grants';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/phone_state_economy_bridge', () => ({
  commitPhoneStateNonMonetaryEconomyGrant: jest.fn(),
  readPhoneStateStarCreditState: jest.fn(),
}));
jest.mock('../app/community_packs/functionsClient', () => ({ callLevelSpinStarComposite: jest.fn() }));
jest.mock('../app/app_snapshot_store', () => ({ getAppSnapshot: jest.fn(), patchAppSnapshot: jest.fn() }));

const storage: Record<string, string> = {};
let nowMs = Date.parse('2026-10-04T23:40:00.000Z');

function exactOperation(index: number) {
  const requestId = `request${String(index).padStart(12, '0')}`;
  const operationId = `level_spin:${requestId}.base`;
  const partial = { ownerStableId: 'account-a', requestId, lane: 'base' as const, giftId: 'stars_10' as const, amount: 10 as const };
  const requestFingerprint = createHash('sha256').update(JSON.stringify({
    schemaVersion: 1, ownerStableId: partial.ownerStableId, requestId, lane: partial.lane,
    deliveryToken: null, giftId: partial.giftId, amount: partial.amount, reason: 'level_spin_star_reward',
  })).digest('hex');
  return {
    schemaVersion: 'client-level-spin-star-operation.v1', operationId, ...partial,
    reason: 'level_spin_star_reward', createdAtMs: 1_800_000_000_000 + index, requestFingerprint,
    grant: { kind: 'star_credit', subjectId: operationId, payload: { requestId, lane: 'base', giftId: 'stars_10', amount: 10 } },
  };
}

function operationKey(operationId: string): string {
  return `level_spin_star_operation_v1:account-a:${encodeURIComponent(operationId)}`;
}

function storeOperation(operation: ReturnType<typeof exactOperation>): string {
  const key = operationKey(operation.operationId);
  storage[key] = JSON.stringify(operation);
  return key;
}

function corruptReasons(): string[] {
  return (console.warn as jest.Mock).mock.calls
    .filter(([tag]) => tag === '[RUNE-OP-CORRUPT]')
    .map(([, payload]) => (JSON.parse(String(payload)) as { reason: string }).reason);
}

beforeEach(() => {
  jest.clearAllMocks();
  nowMs = Date.parse('2026-10-04T23:40:00.000Z');
  jest.spyOn(Date, 'now').mockImplementation(() => nowMs);
  Object.keys(storage).forEach((key) => delete storage[key]);
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
  (jest.requireMock('../app/phone_state_economy_bridge') as { readPhoneStateStarCreditState: jest.Mock })
    .readPhoneStateStarCreditState.mockResolvedValue({ credits: [], acknowledgements: [] });
  const snapshot = jest.requireMock('../app/app_snapshot_store') as { getAppSnapshot: jest.Mock; patchAppSnapshot: jest.Mock };
  snapshot.getAppSnapshot.mockImplementation(() => ({ progress: { stars: 0, starsEarnedTotal: 0 } }));
  snapshot.patchAppSnapshot.mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('все операции целы — каждая учтена (ничего не пропущено)', async () => {
  [1, 2, 3, 4, 5].forEach((index) => storeOperation(exactOperation(index)));
  const visible = await readUnifiedLevelSpinStars(captureAccountGeneration());
  expect(visible.balance).toBe(50);
});

test('больше одной пачки (40 > 32) — каждая операция учтена', async () => {
  Array.from({ length: 40 }, (_, i) => i + 1).forEach((index) => storeOperation(exactOperation(index)));
  const visible = await readUnifiedLevelSpinStars(captureAccountGeneration());
  expect(visible.balance).toBe(400);
});

test('битая строка во второй пачке тоже роняет восстановление', async () => {
  Array.from({ length: 39 }, (_, i) => i + 1).forEach((index) => storeOperation(exactOperation(index)));
  storeOperation({ ...exactOperation(40), requestFingerprint: 'd'.repeat(64) });
  await expect(readUnifiedLevelSpinStars(captureAccountGeneration()))
    .rejects.toThrow('level_spin_star_operation_corrupt');
  expect(corruptReasons()).toEqual(['fingerprint_invalid']);
});

test('одна операция с поддельным отпечатком среди целых роняет восстановление, данные не тронуты', async () => {
  [1, 2, 4, 5].forEach((index) => storeOperation(exactOperation(index)));
  const forged = { ...exactOperation(3), amount: 10 as const, requestFingerprint: 'f'.repeat(64) };
  const forgedKey = storeOperation(forged);
  const forgedRaw = storage[forgedKey];

  await expect(readUnifiedLevelSpinStars(captureAccountGeneration()))
    .rejects.toThrow('level_spin_star_operation_corrupt');
  expect(corruptReasons()).toEqual(['fingerprint_invalid']);
  expect(storage[forgedKey]).toBe(forgedRaw);
});

test('причина — по первой битой строке в порядке ключей, как при проверке по очереди', async () => {
  // Ключи сортируются: request…001 идёт раньше request…002.
  storage[operationKey('level_spin:request000000000001.base')] = '{not json';
  storeOperation({ ...exactOperation(2), requestFingerprint: 'e'.repeat(64) });

  await expect(readUnifiedLevelSpinStars(captureAccountGeneration()))
    .rejects.toThrow('level_spin_star_operation_corrupt');
  expect(corruptReasons()).toEqual(['json_parse']);
});

test('битая запись журнала практики роняет восстановление', async () => {
  storeOperation(exactOperation(1));
  storage['practice_rune_journal_v1:account-a:practice_rune%3Ax'] = '{"broken":true}';
  await expect(readUnifiedLevelSpinStars(captureAccountGeneration()))
    .rejects.toThrow('practice_rune_journal_corrupt');
});

test('[ACCOUNT-LOCK]: держатель дольше 1 с печатается, у долгого ожидания виден blockedBy', async () => {
  let releaseHolder!: () => void;
  const holderGate = new Promise<void>((resolve) => { releaseHolder = resolve; });
  const holder = withAccountTransitionLock(async () => { await holderGate; });
  const waiter = withAccountTransitionLock(async () => 'done');
  await Promise.resolve();
  nowMs += 2_500;
  releaseHolder();
  await holder;
  await expect(waiter).resolves.toBe('done');

  const warnings = (console.warn as jest.Mock).mock.calls;
  const hold = warnings.find(([tag]) => tag === '[ACCOUNT-LOCK] hold_exceeded');
  expect(hold).toBeDefined();
  expect(JSON.parse(String(hold?.[1]))).toEqual(expect.objectContaining({ heldMs: 2_500 }));
  const wait = warnings.find(([tag]) => tag === '[ACCOUNT-LOCK] wait_exceeded');
  expect(wait).toBeDefined();
  const waitPayload = JSON.parse(String(wait?.[1])) as { waitedMs: number; blockedBy: { heldMs: number }[] };
  expect(waitPayload.waitedMs).toBe(2_500);
  expect(waitPayload.blockedBy).toEqual([expect.objectContaining({ heldMs: 2_500 })]);
});
