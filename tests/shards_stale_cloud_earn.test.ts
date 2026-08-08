// Регрессия на баг-репорт 2026-07-04 (Анастасия): «поиграла в Арене, потом сделала
// урок — 200 осколков куда-то сдуло». Корень: прежний applyShardDeltaToCloud делал
// клиентский read-modify-write и строил дельту от ОБЛАЧНОГО баланса. Если фоновая
// синхронизация награды за Арену ещё не доехала (таймаут/оффлайн/гонка), облако
// отставало, и earn за урок обваливал локаль до cloud+delta.
//
// K3: класс бага устранён структурно. Клиент больше не читает облако и не строит
// дельту сам — он вызывает атомарный callable shardsApplyDelta, который в одной
// транзакции читает АВТОРИТЕТНЫЙ серверный баланс и прибавляет дельту. Двух путей
// записи (canonical `shards` + теневой progress.shards_balance наперегонки) больше
// нет, поэтому «отставшего облака» в earn-пути не существует. Клиент лишь зеркалит
// возвращённый сервером баланс.
import AsyncStorage from '@react-native-async-storage/async-storage';

(global as { __DEV__?: boolean }).__DEV__ = false;

// Мок callable: сервер — источник истины. Возвращает пост-транзакционный баланс.
// Тест задаёт, что «на сервере» после атомарного +delta получилось N.
const applyDeltaResult = jest.fn();
const callable = jest.fn((payload: { delta: number; type: string }) =>
  Promise.resolve({ data: applyDeltaResult(payload) }),
);
const httpsCallable = jest.fn(() => callable);

jest.mock('@react-native-async-storage/async-storage');
jest.mock('@react-native-firebase/functions', () => ({
  getFunctions: jest.fn(() => ({})),
  httpsCallable,
}));
jest.mock('@react-native-firebase/app', () => ({ getApp: jest.fn(() => ({})) }));
jest.mock('@react-native-firebase/firestore', () => ({
  __esModule: true,
  default: Object.assign(jest.fn(() => ({})), { FieldValue: { serverTimestamp: jest.fn(() => 'ts') } }),
}));
jest.mock('../app/config', () => ({ IS_EXPO_GO: false, CLOUD_SYNC_ENABLED: true }));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { error: jest.fn() } }));
jest.mock('../app/events', () => ({ emitAppEvent: jest.fn() }));
jest.mock('../app/user_id_policy', () => ({ getCanonicalUserId: jest.fn(async () => 'u1') }));
jest.mock('../app/lifetime_profile_stats', () => ({
  bumpLifetimeShardsEarned: jest.fn(),
  bumpLifetimeShardsSpent: jest.fn(),
}));
jest.mock('../app/storage_mutex', () => ({
  withStorageLock: jest.fn(async (fn: () => Promise<unknown>) => fn()),
}));
jest.mock('../app/account_generation', () => ({
  captureAccountGeneration: jest.fn(() => ({ generation: 1, stableId: 'u1', phase: 'active' })),
  isCurrentAccountGeneration: jest.fn(
    (token: { generation: number; stableId: string }, owner?: string) =>
      token.generation === 1 && token.stableId === 'u1' && (!owner || owner === 'u1'),
  ),
  withAccountTransitionLock: jest.fn(async (fn: () => Promise<unknown>) => fn()),
}));
jest.mock('../app/achievements', () => ({ checkAchievements: jest.fn() }));
jest.mock('../app/shards_delta_queue', () => ({
  enqueueShardDelta: jest.fn(async () => true),
  enqueueAppliedShardDeltaWithStorage: jest.fn(async (_p: unknown, build: () => Promise<unknown>) => {
    const update = await build() as { commit: boolean; value: unknown };
    return { ok: true, committed: update.commit, value: update.value };
  }),
  newShardOpId: jest.fn(() => 'op-earn-abcdef12'),
  readShardDeltaQueue: jest.fn(async () => []),
  removeShardDeltas: jest.fn(async () => true),
  hasQuarantinedShardDeltaQueue: jest.fn(async () => false),
  hasExactLegacyQuarantinedShardDelta: jest.fn(async () => false),
  consumeExactLegacyQuarantinedShardDelta: jest.fn(async () => false),
}));

import { addShards, addShardsRaw, getShardsBalance } from '../app/shards_system';

const STORAGE_KEY = 'shards_balance';
const BALANCE_META_KEY = 'shards_balance_meta_v1';

const mockStorage: Record<string, string> = {};

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
  (AsyncStorage.getItem as jest.Mock).mockImplementation((k: string) =>
    Promise.resolve(mockStorage[k] ?? null),
  );
  (AsyncStorage.setItem as jest.Mock).mockImplementation((k: string, v: string) => {
    mockStorage[k] = v;
    return Promise.resolve();
  });
  (AsyncStorage.multiSet as jest.Mock).mockImplementation((pairs: Array<[string, string]>) => {
    for (const [k, v] of pairs) mockStorage[k] = v;
    return Promise.resolve();
  });
});

describe('earn mirrors the authoritative server balance (no stale-cloud collapse)', () => {
  beforeEach(() => {
    // Локаль: 250 (награда за Арену уже начислена локально), метка свежая.
    mockStorage[STORAGE_KEY] = '250';
    mockStorage[BALANCE_META_KEY] = JSON.stringify({
      updatedAtMs: 6_000_000,
      op: 'earn',
      reason: 'arena_win',
    });
  });

  it('server transaction returns 252 (its own 250 + 2) → local mirrors 252, NOT 52', async () => {
    // Сервер атомарно читает СВОЙ баланс (250 — награда за Арену уже дошла в его
    // транзакции) и прибавляет 2. Клиент зеркалит результат.
    applyDeltaResult.mockReturnValue({
      ok: true,
      alreadyApplied: false,
      insufficient: false,
      balance: 252,
      shardsUpdatedAtMs: 7_000_000,
    });
    const gained = await addShardsRaw(2, 'lesson_perfect');
    expect(gained).toBe(2);
    await expect(getShardsBalance()).resolves.toBe(252);
    // Клиент вызвал callable с величиной 2 и type earn (знак ставит сервер).
    expect(callable).toHaveBeenCalledWith(
      expect.objectContaining({ delta: 2, type: 'earn', opId: 'op-earn-abcdef12' }),
    );
  });

  it('idempotent replay (alreadyApplied) mirrors the server balance without double-count', async () => {
    // Повтор с тем же opId: сервер уже применил дельту, возвращает текущий баланс.
    applyDeltaResult.mockReturnValue({
      ok: true,
      alreadyApplied: true,
      insufficient: false,
      balance: 252,
      shardsUpdatedAtMs: 7_000_000,
    });
    const gained = await addShardsRaw(2, 'lesson_perfect');
    expect(gained).toBe(2);
    await expect(getShardsBalance()).resolves.toBe(252);
  });

  it('new economy: catalog gameplay earns are 0 (монеты только покупаются, спека §7)', async () => {
    applyDeltaResult.mockReturnValue({
      ok: true,
      alreadyApplied: false,
      insufficient: false,
      balance: 250,
      shardsUpdatedAtMs: 7_000_000,
    });
    const gained = await addShards('lesson_perfect', { suppressEarnEvent: true });
    expect(gained).toBe(0);
    await expect(getShardsBalance()).resolves.toBe(250);
    expect(callable).not.toHaveBeenCalled();
  });
});
