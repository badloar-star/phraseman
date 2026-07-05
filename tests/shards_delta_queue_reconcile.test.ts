// Аудит K3 (находки A+B): resumePendingShardDeltas зеркалит АВТОРИТЕТНЫЙ серверный
// баланс после проигрывания очереди. Раньше зеркалирование гасил timestamp-guard в
// replaceShardsBalanceLocal, когда локальная оптимистичная метка (свежий Date.now())
// была новее серверной (для alreadyApplied/insufficient сервер отдаёт СТАРУЮ метку).
// В итоге завышенная локаль не опускалась. Фикс: reconcile идёт без updatedAtMs →
// guard не срабатывает, серверный баланс применяется безусловно.
import AsyncStorage from '@react-native-async-storage/async-storage';

(global as { __DEV__?: boolean }).__DEV__ = false;

const applyResult = jest.fn();
const callable = jest.fn((p: unknown) => Promise.resolve({ data: applyResult(p) }));
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
jest.mock('../app/achievements', () => ({ checkAchievements: jest.fn() }));

// Реальный модуль очереди с мок-хранилищем — проверяем полный путь read→replay→remove.
const queueStore: { items: unknown[] } = { items: [] };
jest.mock('../app/shards_delta_queue', () => ({
  newShardOpId: jest.fn(() => 'op-generated-1'),
  readShardDeltaQueue: jest.fn(async () => queueStore.items),
  removeShardDeltas: jest.fn(async (ids: string[]) => {
    queueStore.items = queueStore.items.filter((q: any) => !ids.includes(q.opId));
  }),
  enqueueShardDelta: jest.fn(async (e: unknown) => { queueStore.items.push(e); }),
}));

import { getShardsBalance, resumePendingShardDeltas } from '../app/shards_system';

const STORAGE_KEY = 'shards_balance';
const META_KEY = 'shards_balance_meta_v1';
const mockStorage: Record<string, string> = {};

beforeEach(() => {
  jest.clearAllMocks();
  queueStore.items = [];
  Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
  (AsyncStorage.getItem as jest.Mock).mockImplementation((k: string) => Promise.resolve(mockStorage[k] ?? null));
  (AsyncStorage.setItem as jest.Mock).mockImplementation((k: string, v: string) => { mockStorage[k] = v; return Promise.resolve(); });
  (AsyncStorage.multiSet as jest.Mock).mockImplementation((pairs: Array<[string, string]>) => {
    for (const [k, v] of pairs) mockStorage[k] = v;
    return Promise.resolve();
  });
});

describe('resumePendingShardDeltas — authoritative server balance wins (K3 findings A+B)', () => {
  it('lowers an inflated local balance to the server value despite a newer local stamp / older server ts', () => {
    // Локаль завышена: 500 со СВЕЖЕЙ меткой реальной операции (op:'earn').
    mockStorage[STORAGE_KEY] = '500';
    mockStorage[META_KEY] = JSON.stringify({ updatedAtMs: 9_999_999_999_999, op: 'earn', reason: 'local_optimistic' });
    // В очереди spend, который сервер отвергает (insufficient) и отдаёт СТАРУЮ метку
    // + авторитетный баланс 300 (реально на сервере меньше, чем показывала локаль).
    queueStore.items = [{ opId: 'op-spend-1', delta: 10, type: 'spend', reason: 'card_pack', createdAtMs: 1 }];
    applyResult.mockReturnValue({ ok: false, alreadyApplied: false, insufficient: true, balance: 300, shardsUpdatedAtMs: 1000 });

    return resumePendingShardDeltas().then(async (res) => {
      expect(res.resolved).toBe(1);
      // Раньше guard отвергал зеркало (локальная метка новее) → оставалось 500.
      // Теперь серверный баланс безусловно применён.
      await expect(getShardsBalance()).resolves.toBe(300);
      // Очередь очищена.
      expect(queueStore.items).toHaveLength(0);
    });
  });

  it('final balance = last confirmed response (not the one with the largest server ts)', () => {
    mockStorage[STORAGE_KEY] = '100';
    queueStore.items = [
      { opId: 'op-a', delta: 5, type: 'earn', reason: 'r', createdAtMs: 1 },
      { opId: 'op-b', delta: 3, type: 'earn', reason: 'r', createdAtMs: 2 },
    ];
    // Первый ответ: свежая метка, баланс 105. Второй (последний): СТАРАЯ метка
    // (как при alreadyApplied), но это финальный живой баланс 108.
    applyResult
      .mockReturnValueOnce({ ok: true, alreadyApplied: false, insufficient: false, balance: 105, shardsUpdatedAtMs: 5000 })
      .mockReturnValueOnce({ ok: true, alreadyApplied: true, insufficient: false, balance: 108, shardsUpdatedAtMs: 1000 });

    return resumePendingShardDeltas().then(async (res) => {
      expect(res.resolved).toBe(2);
      // По порядку вызовов финальный = 108, а не 105 (несмотря на бо́льшую метку у 105).
      await expect(getShardsBalance()).resolves.toBe(108);
    });
  });

  it('leaves the op queued when the server call fails (retried next boot)', () => {
    mockStorage[STORAGE_KEY] = '50';
    queueStore.items = [{ opId: 'op-x', delta: 2, type: 'earn', reason: 'r', createdAtMs: 1 }];
    applyResult.mockReturnValue({ ok: false, alreadyApplied: false, insufficient: false, balance: 0, shardsUpdatedAtMs: null });

    return resumePendingShardDeltas().then(async (res) => {
      expect(res.pending).toBe(1);
      expect(queueStore.items).toHaveLength(1); // не снят
      await expect(getShardsBalance()).resolves.toBe(50); // локаль не тронута
    });
  });
});
