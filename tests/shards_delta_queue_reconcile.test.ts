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
let appCheckReady = true;
let accountGeneration = { generation: 1, stableId: 'u1', phase: 'active' as const };

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
jest.mock('../app/app_check_init', () => ({
  initFirebaseAppCheckIfAvailable: jest.fn(async () => appCheckReady),
}));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { error: jest.fn() } }));
jest.mock('../app/events', () => ({ emitAppEvent: jest.fn() }));
jest.mock('../app/user_id_policy', () => ({
  getCanonicalUserId: jest.fn(async () => accountGeneration.stableId),
}));
jest.mock('../app/account_generation', () => ({
  captureAccountGeneration: jest.fn(() => ({ ...accountGeneration })),
  isCurrentAccountGeneration: jest.fn(
    (token: typeof accountGeneration, expectedStableId?: string | null) =>
      token.generation === accountGeneration.generation
      && token.stableId === accountGeneration.stableId
      && accountGeneration.phase === 'active'
      && (expectedStableId === undefined || expectedStableId === accountGeneration.stableId),
  ),
  withAccountTransitionLock: jest.fn(async (fn: () => Promise<unknown>) => fn()),
}));
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
  readShardDeltaQueue: jest.fn(async (ownerStableId: string) =>
    queueStore.items.filter((q: any) => q.ownerStableId === ownerStableId)),
  removeShardDeltas: jest.fn(async (ownerStableId: string, ids: string[]) => {
    queueStore.items = queueStore.items.filter(
      (q: any) => q.ownerStableId !== ownerStableId || !ids.includes(q.opId),
    );
    return true;
  }),
  enqueueShardDelta: jest.fn(async (e: unknown) => { queueStore.items.push(e); }),
}));

import { getShardsBalance, resumePendingShardDeltas } from '../app/shards_system';
import { readFileSync } from 'fs';
import { join } from 'path';

const STORAGE_KEY = 'shards_balance';
const META_KEY = 'shards_balance_meta_v1';
const mockStorage: Record<string, string> = {};

beforeEach(() => {
  jest.clearAllMocks();
  appCheckReady = true;
  accountGeneration = { generation: 1, stableId: 'u1', phase: 'active' };
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
  it('has one account-scoped replay implementation and no dead legacy shim', () => {
    const source = readFileSync(join(__dirname, '..', 'app', 'shards_system.ts'), 'utf8');
    expect(source).not.toContain('resumePendingShardDeltasLegacy');
    expect(source).not.toContain('legacyResumeShardDeltasInFlight');
  });

  it('keeps the ordered replay queue untouched while App Check is unavailable', async () => {
    appCheckReady = false;
    queueStore.items = [
      { opId: 'op-earn', ownerStableId: 'u1', delta: 5, type: 'earn', reason: 'r', createdAtMs: 1 },
      { opId: 'op-spend', ownerStableId: 'u1', delta: 3, type: 'spend', reason: 'r', createdAtMs: 2 },
    ];

    await expect(resumePendingShardDeltas()).resolves.toEqual({ resolved: 0, pending: 2 });
    expect(httpsCallable).not.toHaveBeenCalled();
    expect(queueStore.items.map((item: any) => item.opId)).toEqual(['op-earn', 'op-spend']);
  });

  it('lowers an inflated local balance to the server value despite a newer local stamp / older server ts', () => {
    // Локаль завышена: 500 со СВЕЖЕЙ меткой реальной операции (op:'earn').
    mockStorage[STORAGE_KEY] = '500';
    mockStorage[META_KEY] = JSON.stringify({ updatedAtMs: 9_999_999_999_999, op: 'earn', reason: 'local_optimistic' });
    // В очереди spend, который сервер отвергает (insufficient) и отдаёт СТАРУЮ метку
    // + авторитетный баланс 300 (реально на сервере меньше, чем показывала локаль).
    queueStore.items = [{ opId: 'op-spend-1', ownerStableId: 'u1', delta: 10, type: 'spend', reason: 'card_pack', createdAtMs: 1 }];
    applyResult.mockReturnValue({ ok: false, alreadyApplied: false, insufficient: true, balance: 300, shardsUpdatedAtMs: 1000 });

    return resumePendingShardDeltas().then(async (res) => {
      expect(res.resolved).toBe(1);
      // Раньше guard отвергал зеркало (локальная метка новее) → оставалось 500.
      // Теперь коррекция (300−500=−200) применена к текущей локали (500) → 300.
      await expect(getShardsBalance()).resolves.toBe(300);
      // Очередь очищена.
      expect(queueStore.items).toHaveLength(0);
    });
  });

  it('final balance = last confirmed response (not the one with the largest server ts)', () => {
    mockStorage[STORAGE_KEY] = '100';
    queueStore.items = [
      { opId: 'op-a', ownerStableId: 'u1', delta: 5, type: 'earn', reason: 'r', createdAtMs: 1 },
      { opId: 'op-b', ownerStableId: 'u1', delta: 3, type: 'earn', reason: 'r', createdAtMs: 2 },
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
    queueStore.items = [{ opId: 'op-x', ownerStableId: 'u1', delta: 2, type: 'earn', reason: 'r', createdAtMs: 1 }];
    applyResult.mockReturnValue({ ok: false, alreadyApplied: false, insufficient: false, balance: 0, shardsUpdatedAtMs: null });

    return resumePendingShardDeltas().then(async (res) => {
      expect(res.pending).toBe(1);
      expect(queueStore.items).toHaveLength(1); // не снят
      await expect(getShardsBalance()).resolves.toBe(50); // локаль не тронута
    });
  });

  // Регресс аудита-фикса (находка ре-аудита): пока идёт async-replay, пользователь
  // делает легальный earn +30. Его дельты нет в latestBalance (opId не в снапшоте
  // очереди). Раньше reconcile СЛЕПО писал latestBalance и стирал +30. Теперь
  // reconcile применяет КОРРЕКЦИЮ (latestBalance − localSnapshot) к ТЕКУЩЕЙ локали.
  it('does NOT clobber a concurrent legal earn applied during the async replay', () => {
    // Снимок до replay = 100 (очередь op-a +50 уже применена оптимистично ранее).
    mockStorage[STORAGE_KEY] = '100';
    queueStore.items = [{ opId: 'op-a', ownerStableId: 'u1', delta: 50, type: 'earn', reason: 'r', createdAtMs: 1 }];
    // Сервер подтверждает op-a: его баланс = 100 (тоже включает +50). correction=0.
    // МОДЕЛИРУЕМ гонку: во время серверного вызова пользователь заработал +30 →
    // локаль стала 130. Делаем это в мок-ответе callable (побочный эффект до resolve).
    applyResult.mockImplementation(() => {
      mockStorage[STORAGE_KEY] = '130'; // конкурентный earn +30 применился локально
      return { ok: true, alreadyApplied: false, insufficient: false, balance: 100, shardsUpdatedAtMs: 5000 };
    });

    return resumePendingShardDeltas().then(async () => {
      // correction = 100 − 100 = 0 → к текущей локали (130) применяется 0 → 130.
      // Конкурентный +30 СОХРАНЁН (раньше слепое зеркало откатило бы до 100).
      await expect(getShardsBalance()).resolves.toBe(130);
    });
  });

  it('applies the server correction on top of the current (concurrently changed) balance', () => {
    // Снимок 100; сервер реально насчитал 90 (например insufficient-spend вернул
    // осколки иначе / рассинхрон) → correction = −10. Во время replay конкурентный
    // earn +40 сделал локаль 140. Итог: 140 + (−10) = 130, а не слепые 90.
    mockStorage[STORAGE_KEY] = '100';
    queueStore.items = [{ opId: 'op-s', ownerStableId: 'u1', delta: 5, type: 'spend', reason: 'r', createdAtMs: 1 }];
    applyResult.mockImplementation(() => {
      mockStorage[STORAGE_KEY] = '140';
      return { ok: false, alreadyApplied: false, insufficient: true, balance: 90, shardsUpdatedAtMs: 1000 };
    });

    return resumePendingShardDeltas().then(async () => {
      await expect(getShardsBalance()).resolves.toBe(130);
    });
  });

  it('does not remove or reconcile account A after its replay response crosses a switch to B', async () => {
    mockStorage[STORAGE_KEY] = '100';
    queueStore.items = [
      { opId: 'op-race-a', ownerStableId: 'u1', delta: 5, type: 'earn', reason: 'lesson_first', createdAtMs: 1 },
    ];
    let resolveCall!: (value: { data: unknown }) => void;
    callable.mockImplementationOnce(() => new Promise((resolve) => { resolveCall = resolve; }));

    const replayA = resumePendingShardDeltas();
    for (let index = 0; index < 20 && callable.mock.calls.length === 0; index += 1) {
      await Promise.resolve();
    }
    expect(callable).toHaveBeenCalledTimes(1);

    accountGeneration = { generation: 2, stableId: 'u2', phase: 'active' };
    mockStorage[STORAGE_KEY] = '7';
    resolveCall({
      data: {
        ok: true,
        alreadyApplied: false,
        insufficient: false,
        balance: 105,
        shardsUpdatedAtMs: 5000,
      },
    });
    await replayA;

    expect(queueStore.items.map((item: any) => item.opId)).toEqual(['op-race-a']);
    await expect(getShardsBalance()).resolves.toBe(7);

    const callsBeforeBReplay = callable.mock.calls.length;
    await expect(resumePendingShardDeltas()).resolves.toEqual({ resolved: 0, pending: 0 });
    expect(callable).toHaveBeenCalledTimes(callsBeforeBReplay);
  });
});
