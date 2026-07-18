// Регрессия на баг content-репорта: покупка карточек за осколки виснет навсегда,
// когда Firebase недоступен (заблокированный регион без VPN). spendShards ходит в
// облако БЕЗ таймаута → состояние «Подождите…» держится вечно.
//
// K3: единственная точка серверной записи — callable shardsApplyDelta (атомарная
// транзакция + идемпотентность). applyShardDeltaToCloud оборачивает вызов callable
// в таймаут: при зависшем Firebase списание уходит в локальную ветку — покупка
// завершается, дельта кладётся в офлайн-очередь и догоняет сервер позже.
import AsyncStorage from '@react-native-async-storage/async-storage';

// В RN-рантайме __DEV__ всегда определён; в jest — нет. Задаём явно (как релизный
// билд), иначе `if (__DEV__) console.warn` внутри catch-блоков бросает ReferenceError.
(global as { __DEV__?: boolean }).__DEV__ = false;

// Никогда не резолвящийся callable = заблокированный Firebase: запрос ушёл, ответа нет.
const hangingCallable = jest.fn(() => new Promise(() => {}));
const httpsCallable = jest.fn(() => hangingCallable);

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
// Офлайн-очередь мокаем: проверяем, что зависшая операция ставится в неё для сверки.
const enqueueShardDelta = jest.fn(async () => true);
const removeShardDeltas = jest.fn(async () => true);
jest.mock('../app/shards_delta_queue', () => ({
  enqueueShardDelta,
  newShardOpId: jest.fn(() => 'op-timeout-12345678'),
  readShardDeltaQueue: jest.fn(async () => []),
  removeShardDeltas,
}));

import { getShardsBalance, spendShards } from '../app/shards_system';

const mockStorage: Record<string, string> = {};

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
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

afterEach(() => {
  jest.useRealTimers();
});

describe('spendShards when Firebase is unreachable (blocked region)', () => {
  it('does not hang forever — falls back to local spend after the cloud timeout', async () => {
    mockStorage.shards_balance = '50';

    const spendPromise = spendShards(30, 'card_pack');

    // Прокручиваем таймер за порог зависшего callable (6с) → timeout fallback.
    await jest.advanceTimersByTimeAsync(7000);

    await expect(spendPromise).resolves.toBe(true);
    // Списание прошло локально: 50 − 30 = 20.
    await expect(getShardsBalance()).resolves.toBe(20);
    // Callable действительно вызывался (а не был пропущен), завис и ушёл в timeout.
    expect(hangingCallable).toHaveBeenCalled();
    // Дельта поставлена в офлайн-очередь для последующей идемпотентной сверки.
    expect(enqueueShardDelta).toHaveBeenCalledWith(
      expect.objectContaining({ opId: 'op-timeout-12345678', delta: 30, type: 'spend' }),
    );
  }, 30000);

  it('does not enqueue or debit when unavailable cloud meets insufficient local balance', async () => {
    mockStorage.shards_balance = '10';

    const spendPromise = spendShards(30, 'card_pack');
    await jest.advanceTimersByTimeAsync(7000);

    await expect(spendPromise).resolves.toBe(false);
    await expect(getShardsBalance()).resolves.toBe(10);
    expect(enqueueShardDelta).not.toHaveBeenCalled();
  }, 30000);

  it('cancels only the exact queued spend when the local debit cannot be committed', async () => {
    mockStorage.shards_balance = '50';
    (AsyncStorage.multiSet as jest.Mock).mockRejectedValueOnce(new Error('disk unavailable'));

    const spendPromise = spendShards(30, 'card_pack');
    await jest.advanceTimersByTimeAsync(7000);

    await expect(spendPromise).resolves.toBe(false);
    expect(enqueueShardDelta).toHaveBeenCalledWith(
      expect.objectContaining({
        opId: 'op-timeout-12345678',
        ownerStableId: 'u1',
        type: 'spend',
      }),
    );
    expect(removeShardDeltas).toHaveBeenCalledWith('u1', ['op-timeout-12345678']);
  }, 30000);
});
