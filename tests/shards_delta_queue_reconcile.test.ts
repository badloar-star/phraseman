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
let queueQuarantined = false;
let accountGeneration = { generation: 1, stableId: 'u1', phase: 'active' as const };
const hasQuarantinedShardDeltaQueue = jest.fn(async () => queueQuarantined);

jest.mock('@react-native-async-storage/async-storage');
jest.mock('@react-native-firebase/functions', () => ({
  getFunctions: jest.fn(() => ({})),
  httpsCallable,
}));
jest.mock('@react-native-firebase/app', () => ({ getApp: jest.fn(() => ({})) }));
// Облачный документ пользователя: нужен для сверки баланса после перманентного
// отказа сервера (сервер там авторитетен, читаем его значение напрямую).
const cloudUserDoc: { shards?: number } = {};
jest.mock('@react-native-firebase/firestore', () => ({
  __esModule: true,
  default: Object.assign(
    jest.fn(() => ({
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({
          get: jest.fn(async () => ({
            exists: true,
            data: () => cloudUserDoc,
          })),
        })),
      })),
    })),
    { FieldValue: { serverTimestamp: jest.fn(() => 'ts') } },
  ),
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
  hasQuarantinedShardDeltaQueue,
  readShardDeltaQueue: jest.fn(async (ownerStableId: string) =>
    queueStore.items
      .filter((q: any) => q.ownerStableId === ownerStableId)
      .map((q: any) => ({ localApplied: true, ...q }))),
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
  queueQuarantined = false;
  hasQuarantinedShardDeltaQueue.mockReset();
  hasQuarantinedShardDeltaQueue.mockImplementation(async () => queueQuarantined);
  accountGeneration = { generation: 1, stableId: 'u1', phase: 'active' };
  queueStore.items = [];
  delete cloudUserDoc.shards;
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

  // Раньше эти два кейса требовали «не досылать НИЧЕГО, пока есть карантин».
  // Это и создавало вечно незавершённые покупки: карантин относится к другому,
  // отложенному хранилищу, но выключал досылку целиком — живое списание висело
  // в очереди навсегда и запирало выход из аккаунта. Незавершённых покупок быть
  // не должно, поэтому читаемая очередь проигрывается независимо от карантина.
  it('replays a readable queue even while a separate quarantine exists', async () => {
    queueQuarantined = true;
    mockStorage[STORAGE_KEY] = '40';
    queueStore.items = [
      { opId: 'op-quarantined', ownerStableId: 'u1', delta: 5, type: 'earn', reason: 'r', createdAtMs: 1 },
    ];
    applyResult.mockReturnValue({
      ok: true, alreadyApplied: false, insufficient: false, balance: 45,
    });

    await expect(resumePendingShardDeltas()).resolves.toEqual({ resolved: 1, pending: 0 });
    expect(queueStore.items).toHaveLength(0);
  });

  // Защита при порче СВОЕЙ очереди никуда не делась и работает сама по себе:
  // readShardDeltaQueue уносит нечитаемые записи в карантин и возвращает пусто,
  // поэтому отправлять просто нечего — недоверенные байты в транспорт не уходят.
  it('sends nothing when reading the queue quarantines its own rows', async () => {
    queueStore.items = [];
    hasQuarantinedShardDeltaQueue
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    await expect(resumePendingShardDeltas()).resolves.toEqual({ resolved: 0, pending: 0 });
    expect(callable).not.toHaveBeenCalled();
  });

  // Незавершённых покупок быть не должно: строку, которую сервер отверг
  // ОКОНЧАТЕЛЬНО, повтор не спасёт. Раньше она навсегда вставала в голове
  // очереди и блокировала всё за собой.
  it.each([
    ['permission-denied'],
    ['invalid-argument'],
    ['failed-precondition'],
    ['functions/permission-denied'],
  ])('drops a row the server rejected permanently (%s) instead of queueing it forever', async (code) => {
    mockStorage[STORAGE_KEY] = '40';
    cloudUserDoc.shards = 50;
    queueStore.items = [
      { opId: 'op-rejected', ownerStableId: 'u1', delta: 10, type: 'spend', reason: 'r', createdAtMs: 1 },
    ];
    applyResult.mockImplementation(() => { throw Object.assign(new Error('rejected'), { code }); });

    await expect(resumePendingShardDeltas()).resolves.toEqual({ resolved: 1, pending: 0 });
    expect(queueStore.items).toHaveLength(0);
    // Списание не состоялось на сервере — локальный баланс возвращается к облачному,
    // иначе юзер просто потерял бы жемчужины.
    expect(await getShardsBalance()).toBe(50);
  });

  it('keeps retrying a transient failure instead of dropping the operation', async () => {
    mockStorage[STORAGE_KEY] = '40';
    queueStore.items = [
      { opId: 'op-offline', ownerStableId: 'u1', delta: 10, type: 'spend', reason: 'r', createdAtMs: 1 },
    ];
    applyResult.mockImplementation(() => { throw Object.assign(new Error('offline'), { code: 'unavailable' }); });

    await expect(resumePendingShardDeltas()).resolves.toEqual({ resolved: 0, pending: 1 });
    expect(queueStore.items).toHaveLength(1);
  });

  it('drops a permanently rejected row but still replays the healthy rows behind it', async () => {
    mockStorage[STORAGE_KEY] = '40';
    queueStore.items = [
      { opId: 'op-rejected', ownerStableId: 'u1', delta: 10, type: 'spend', reason: 'r', createdAtMs: 1 },
      { opId: 'op-good', ownerStableId: 'u1', delta: 4, type: 'spend', reason: 'r', createdAtMs: 2 },
    ];
    applyResult.mockImplementation((payload: any) => {
      if (payload.opId === 'op-rejected') {
        throw Object.assign(new Error('rejected'), { code: 'permission-denied' });
      }
      return { ok: true, alreadyApplied: false, insufficient: false, balance: 46 };
    });

    await expect(resumePendingShardDeltas()).resolves.toEqual({ resolved: 2, pending: 0 });
    expect(queueStore.items).toHaveLength(0);
    expect(await getShardsBalance()).toBe(46);
  });

  it('stops at the first unknown failure and keeps the full optimistic suffix in the local balance', async () => {
    mockStorage[STORAGE_KEY] = '75';
    queueStore.items = [
      { opId: 'op-spend-pending', ownerStableId: 'u1', delta: 30, type: 'spend', reason: 'card_pack', createdAtMs: 1 },
      { opId: 'op-earn-later', ownerStableId: 'u1', delta: 5, type: 'earn', reason: 'lesson_first', createdAtMs: 2 },
    ];
    applyResult.mockReturnValue({
      ok: false,
      alreadyApplied: false,
      insufficient: false,
      balance: 100,
      shardsUpdatedAtMs: null,
    });

    await expect(resumePendingShardDeltas()).resolves.toEqual({ resolved: 0, pending: 2 });
    expect(callable).toHaveBeenCalledTimes(1);
    expect(queueStore.items.map((item: any) => item.opId))
      .toEqual(['op-spend-pending', 'op-earn-later']);
    await expect(getShardsBalance()).resolves.toBe(75);
  });

  it('reconciles a confirmed prefix to server balance plus the still-pending optimistic suffix', async () => {
    mockStorage[STORAGE_KEY] = '75';
    queueStore.items = [
      { opId: 'op-spend-confirmed', ownerStableId: 'u1', delta: 30, type: 'spend', reason: 'card_pack', createdAtMs: 1 },
      { opId: 'op-earn-pending', ownerStableId: 'u1', delta: 5, type: 'earn', reason: 'lesson_first', createdAtMs: 2 },
    ];
    applyResult
      .mockReturnValueOnce({
        ok: true,
        alreadyApplied: false,
        insufficient: false,
        balance: 70,
        shardsUpdatedAtMs: 1000,
      })
      .mockReturnValueOnce({
        ok: false,
        alreadyApplied: false,
        insufficient: false,
        balance: 70,
        shardsUpdatedAtMs: null,
      });

    await expect(resumePendingShardDeltas()).resolves.toEqual({ resolved: 1, pending: 1 });
    expect(callable).toHaveBeenCalledTimes(2);
    expect(queueStore.items.map((item: any) => item.opId)).toEqual(['op-earn-pending']);
    await expect(getShardsBalance()).resolves.toBe(75);
  });

  it('does not refund a pending spend after a confirmed earn prefix', async () => {
    mockStorage[STORAGE_KEY] = '75';
    queueStore.items = [
      { opId: 'op-earn-confirmed', ownerStableId: 'u1', delta: 5, type: 'earn', reason: 'lesson_first', createdAtMs: 1 },
      { opId: 'op-spend-pending', ownerStableId: 'u1', delta: 30, type: 'spend', reason: 'card_pack', createdAtMs: 2 },
    ];
    applyResult
      .mockReturnValueOnce({
        ok: true,
        alreadyApplied: false,
        insufficient: false,
        balance: 105,
        shardsUpdatedAtMs: 1000,
      })
      .mockImplementationOnce(() => {
        throw new Error('transport unavailable');
      });

    await expect(resumePendingShardDeltas()).resolves.toEqual({ resolved: 1, pending: 1 });
    expect(queueStore.items.map((item: any) => item.opId)).toEqual(['op-spend-pending']);
    await expect(getShardsBalance()).resolves.toBe(75);
  });

  it.each([
    ['spend', 30],
    ['earn', 5],
  ] as const)(
    'does not send a queued-before-wallet-commit %s after a crash',
    async (type, delta) => {
      mockStorage[STORAGE_KEY] = '100';
      queueStore.items = [{
        opId: `op-crash-${type}`,
        ownerStableId: 'u1',
        delta,
        type,
        reason: type === 'spend' ? 'card_pack' : 'lesson_first',
        createdAtMs: 1,
        localApplied: false,
      }];

      await expect(resumePendingShardDeltas()).resolves.toEqual({ resolved: 0, pending: 1 });
      expect(callable).not.toHaveBeenCalled();
      expect(queueStore.items).toHaveLength(1);
      await expect(getShardsBalance()).resolves.toBe(100);
    },
  );

  it('reconciles only the locally-applied part of a suffix after a crash-boundary row', async () => {
    mockStorage[STORAGE_KEY] = '112';
    queueStore.items = [
      {
        opId: 'op-earn-confirmed',
        ownerStableId: 'u1',
        delta: 5,
        type: 'earn',
        reason: 'lesson_first',
        createdAtMs: 1,
        localApplied: true,
      },
      {
        opId: 'op-spend-crashed',
        ownerStableId: 'u1',
        delta: 30,
        type: 'spend',
        reason: 'card_pack',
        createdAtMs: 2,
        localApplied: false,
      },
      {
        opId: 'op-earn-pending',
        ownerStableId: 'u1',
        delta: 7,
        type: 'earn',
        reason: 'lesson_first',
        createdAtMs: 3,
        localApplied: true,
      },
    ];
    applyResult.mockReturnValueOnce({
      ok: true,
      alreadyApplied: false,
      insufficient: false,
      balance: 105,
      shardsUpdatedAtMs: 1000,
    });

    await expect(resumePendingShardDeltas()).resolves.toEqual({ resolved: 1, pending: 2 });
    expect(callable).toHaveBeenCalledTimes(1);
    expect(queueStore.items.map((item: any) => item.opId))
      .toEqual(['op-spend-crashed', 'op-earn-pending']);
    await expect(getShardsBalance()).resolves.toBe(112);
  });

  it('checks quarantine before an online shard callable can mirror server state', () => {
    const source = readFileSync(join(__dirname, '..', 'app', 'shards_system.ts'), 'utf8');
    const applyStart = source.indexOf('const applyShardDeltaToCloud');
    const applyEnd = source.indexOf('const persistLocalBalance', applyStart);
    const applySource = source.slice(applyStart, applyEnd);

    expect(applySource.indexOf('hasQuarantinedShardDeltaQueue(')).toBeGreaterThan(-1);
    expect(applySource.indexOf('callShardsApplyDelta('))
      .toBeGreaterThan(applySource.indexOf('hasQuarantinedShardDeltaQueue('));
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
