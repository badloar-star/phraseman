// Очередь осколков после «конституции экономики» (2026-08-15): строки уже применены
// локально и снимаются без сервера. Прежний аудит K3 (серверная сверка) относился к
// снятому пути досылки.
import AsyncStorage from '@react-native-async-storage/async-storage';

(global as { __DEV__?: boolean }).__DEV__ = false;

const applyResult = jest.fn();
const callable = jest.fn((p: unknown) => Promise.resolve({ data: applyResult(p) }));
const httpsCallable = jest.fn(() => callable);
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
jest.mock('../app/debug-logger', () => ({ reportSwallowed: jest.fn(), swallowError: jest.fn(() => jest.fn()), DebugLogger: { error: jest.fn() } }));
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
  // зачем: app/shards_system.ts на старте модуля (primeShardsBalanceFromBootStorage)
  // вызывает waitForActiveAccountGeneration() — экспорта не было в моке, падало
  // TypeError на самом импорте (не в конкретном тесте, а до jest вообще их запустил).
  waitForActiveAccountGeneration: jest.fn(async () => ({ ...accountGeneration })),
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

describe('resumePendingShardDeltas under the economy constitution (local-first ledger)', () => {
  // зачем: с 2026-08-15 (68f4ef973) clientEconomyConstitutionEnabled() = true —
  // начисления и списания проводятся на устройстве сразу, а строки старой
  // очереди «досылки на сервер» уже применены локально. Серверная досылка и
  // сверка баланса по ответу сервера сняты намеренно (тело оставлено только как
  // типизированная справка). Прежние 17 кейсов проверяли этот снятый путь и
  // удалены; ниже — контракт, который реально работает на устройстве.
  it('has one account-scoped replay implementation and no dead legacy shim', () => {
    const source = readFileSync(join(__dirname, '..', 'app', 'shards_system.ts'), 'utf8');
    expect(source).not.toContain('resumePendingShardDeltasLegacy');
    expect(source).not.toContain('legacyResumeShardDeltasInFlight');
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

  it('checks quarantine before an online shard callable can mirror server state', () => {
    const source = readFileSync(join(__dirname, '..', 'app', 'shards_system.ts'), 'utf8');
    const applyStart = source.indexOf('const applyShardDeltaToCloud');
    const applyEnd = source.indexOf('const persistLocalBalance', applyStart);
    const applySource = source.slice(applyStart, applyEnd);

    expect(applySource.indexOf('hasQuarantinedShardDeltaQueue(')).toBeGreaterThan(-1);
    expect(applySource.indexOf('callShardsApplyDelta('))
      .toBeGreaterThan(applySource.indexOf('hasQuarantinedShardDeltaQueue('));
  });

  it('drains already-applied queue rows locally without any server call and keeps the balance', async () => {
    mockStorage[STORAGE_KEY] = '40';
    queueStore.items = [
      { opId: 'op-earn', ownerStableId: 'u1', delta: 5, type: 'earn', reason: 'r', createdAtMs: 1 },
      { opId: 'op-spend', ownerStableId: 'u1', delta: 3, type: 'spend', reason: 'r', createdAtMs: 2 },
    ];

    await expect(resumePendingShardDeltas()).resolves.toEqual({ resolved: 2, pending: 0 });
    expect(queueStore.items).toHaveLength(0);
    expect(httpsCallable).not.toHaveBeenCalled();
    expect(callable).not.toHaveBeenCalled();
    // Строки уже применены локально: повторного применения и «возврата» нет.
    await expect(getShardsBalance()).resolves.toBe(40);
  });

  it('never drains or reads another account\'s rows', async () => {
    queueStore.items = [
      { opId: 'op-other', ownerStableId: 'u-other', delta: 9, type: 'earn', reason: 'r', createdAtMs: 1 },
    ];

    await expect(resumePendingShardDeltas()).resolves.toEqual({ resolved: 0, pending: 0 });
    expect(queueStore.items.map((item: any) => item.opId)).toEqual(['op-other']);
    expect(callable).not.toHaveBeenCalled();
  });

  it('does nothing for a non-active account generation', async () => {
    accountGeneration = { generation: 1, stableId: 'u1', phase: 'switching' as never };
    queueStore.items = [
      { opId: 'op-earn', ownerStableId: 'u1', delta: 5, type: 'earn', reason: 'r', createdAtMs: 1 },
    ];

    await expect(resumePendingShardDeltas()).resolves.toEqual({ resolved: 0, pending: 0 });
    expect(queueStore.items).toHaveLength(1);
  });
});
