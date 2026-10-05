// зачем (координатор 05.10, шаг К1): восстановление проекции кошелька не перезаписывает проекцию и outbox, если новый
// JSON байт-в-байт совпадает с тем, что уже на диске. Сторожим: без изменений — нет записи; изменение — запись есть;
// пустой диск — первая запись есть; баланс при этом прежний.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createHash } from 'node:crypto';
import { beginAccountGeneration, captureAccountGeneration } from '../app/account_generation';
import {
  levelSpinStarGrantOutboxKey,
  levelSpinStarProjectionKey,
  readUnifiedLevelSpinStars,
} from '../app/level_spin_star_grants';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/phone_state_economy_bridge', () => ({
  commitPhoneStateNonMonetaryEconomyGrant: jest.fn(),
  readPhoneStateStarCreditState: jest.fn(),
}));
jest.mock('../app/community_packs/functionsClient', () => ({ callLevelSpinStarComposite: jest.fn() }));
jest.mock('../app/app_snapshot_store', () => ({ getAppSnapshot: jest.fn(), patchAppSnapshot: jest.fn() }));

const storage: Record<string, string> = {};

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

function writtenKeys(): string[] {
  return (AsyncStorage.multiSet as jest.Mock).mock.calls.flatMap(([pairs]) => (pairs as [string, string][]).map(([key]) => key));
}

beforeEach(() => {
  jest.clearAllMocks();
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
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('empty disk: the first recovery writes projection and outbox', async () => {
  const operation = exactOperation(1);
  storage[`level_spin_star_operation_v1:account-a:${encodeURIComponent(operation.operationId)}`] = JSON.stringify(operation);
  const visible = await readUnifiedLevelSpinStars(captureAccountGeneration());
  expect(visible.balance).toBe(10);
  expect(writtenKeys()).toEqual(expect.arrayContaining([
    levelSpinStarProjectionKey('account-a'),
    levelSpinStarGrantOutboxKey('account-a'),
  ]));
});

test('a repeated recovery with nothing changed writes neither projection nor outbox; balance is the same', async () => {
  const operation = exactOperation(1);
  storage[`level_spin_star_operation_v1:account-a:${encodeURIComponent(operation.operationId)}`] = JSON.stringify(operation);
  const first = await readUnifiedLevelSpinStars(captureAccountGeneration());
  const projectionAfterFirst = storage[levelSpinStarProjectionKey('account-a')];
  (AsyncStorage.multiSet as jest.Mock).mockClear();

  const second = await readUnifiedLevelSpinStars(captureAccountGeneration());
  expect(second).toEqual(first);
  expect(writtenKeys()).not.toContain(levelSpinStarProjectionKey('account-a'));
  expect(writtenKeys()).not.toContain(levelSpinStarGrantOutboxKey('account-a'));
  expect(storage[levelSpinStarProjectionKey('account-a')]).toBe(projectionAfterFirst);
});

test('a new operation between recoveries changes the projection and it is written', async () => {
  const first = exactOperation(1);
  storage[`level_spin_star_operation_v1:account-a:${encodeURIComponent(first.operationId)}`] = JSON.stringify(first);
  await readUnifiedLevelSpinStars(captureAccountGeneration());
  (AsyncStorage.multiSet as jest.Mock).mockClear();

  const second = exactOperation(2);
  storage[`level_spin_star_operation_v1:account-a:${encodeURIComponent(second.operationId)}`] = JSON.stringify(second);
  const visible = await readUnifiedLevelSpinStars(captureAccountGeneration());
  expect(visible.balance).toBe(20);
  expect(writtenKeys()).toContain(levelSpinStarProjectionKey('account-a'));
  expect(JSON.parse(storage[levelSpinStarProjectionKey('account-a')]).operations).toHaveLength(2);
});
