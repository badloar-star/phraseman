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
const enqueueAppliedShardDeltaWithStorage = jest.fn(
  async (
    _entry: unknown,
    buildWalletUpdate: () => Promise<{
      commit: boolean;
      value: unknown;
      walletPairs?: readonly (readonly [string, string])[];
    }>,
  ) => {
    const update = await buildWalletUpdate();
    if (!update.commit) return { ok: true, committed: false, value: update.value };
    await AsyncStorage.multiSet(update.walletPairs!);
    return { ok: true, committed: true, value: update.value };
  },
);
let queueQuarantined = false;
const hasQuarantinedShardDeltaQueue = jest.fn(async () => queueQuarantined);
const hasExactLegacyQuarantinedShardDelta = jest.fn(
  async (owner: string, expected: { opId: string; delta: number; type: string; reason: string }) => {
    if (mockStorage[`shards_delta_queue_v2_quarantine:${encodeURIComponent(owner)}`]) return false;
    try {
      const rows = JSON.parse(
        mockStorage['shards_delta_queue_v1_quarantine:ownerless'] ?? 'null',
      );
      if (rows !== null && !Array.isArray(rows)) return false;
      const activeMatches = (rows ?? []).filter((row: any) =>
        row?.opId === expected.opId
        && row?.delta === expected.delta
        && row?.type === expected.type
        && row?.reason === expected.reason
        && Number.isSafeInteger(row?.createdAtMs)
        && row.createdAtMs > 0);
      if (activeMatches.length === 1) return true;
      if (activeMatches.length > 1) return false;
      const resolved = JSON.parse(
        mockStorage[`shards_delta_queue_v1_resolved:${encodeURIComponent(expected.opId)}`]
          ?? 'null',
      );
      return resolved?.opId === expected.opId
        && resolved?.delta === expected.delta
        && resolved?.type === expected.type
        && resolved?.reason === expected.reason
        && Number.isSafeInteger(resolved?.createdAtMs)
        && resolved.createdAtMs > 0;
    } catch {
      return false;
    }
  },
);
const consumeExactLegacyQuarantinedShardDelta = jest.fn(
  async (owner: string, expected: { opId: string; delta: number; type: string; reason: string }) => {
    if (!await hasExactLegacyQuarantinedShardDelta(owner, expected)) return false;
    const key = 'shards_delta_queue_v1_quarantine:ownerless';
    const rows = JSON.parse(mockStorage[key] ?? '[]');
    const index = rows.findIndex((row: any) =>
      row.opId === expected.opId
      && row.delta === expected.delta
      && row.type === expected.type
      && row.reason === expected.reason);
    if (index < 0) return true;
    const [resolved] = rows.splice(index, 1);
    mockStorage[`shards_delta_queue_v1_resolved:${encodeURIComponent(expected.opId)}`] =
      JSON.stringify(resolved);
    if (rows.length === 0) delete mockStorage[key];
    else mockStorage[key] = JSON.stringify(rows);
    return true;
  },
);
jest.mock('../app/shards_delta_queue', () => ({
  consumeExactLegacyQuarantinedShardDelta,
  enqueueAppliedShardDeltaWithStorage,
  hasExactLegacyQuarantinedShardDelta,
  hasQuarantinedShardDeltaQueue,
  newShardOpId: jest.fn(() => 'op-timeout-12345678'),
  readShardDeltaQueue: jest.fn(async () => []),
  removeShardDeltas: jest.fn(async () => true),
}));

import {
  getShardsBalance,
  spendShards,
  spendShardsIdempotent,
} from '../app/shards_system';

const mockStorage: Record<string, string> = {};

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  queueQuarantined = false;
  hasQuarantinedShardDeltaQueue.mockImplementation(async () => queueQuarantined);
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
    expect(enqueueAppliedShardDeltaWithStorage).toHaveBeenCalledWith(
      expect.objectContaining({ opId: 'op-timeout-12345678', delta: 30, type: 'spend' }),
      expect.any(Function),
    );
  }, 30000);

  it('does not enqueue or debit when unavailable cloud meets insufficient local balance', async () => {
    mockStorage.shards_balance = '10';

    const spendPromise = spendShards(30, 'card_pack');
    await jest.advanceTimersByTimeAsync(7000);

    await expect(spendPromise).resolves.toBe(false);
    await expect(getShardsBalance()).resolves.toBe(10);
    expect(enqueueAppliedShardDeltaWithStorage).not.toHaveBeenCalled();
  }, 30000);

  it('does not create a replayable row when the atomic queue+wallet batch fails', async () => {
    mockStorage.shards_balance = '50';
    (AsyncStorage.multiSet as jest.Mock).mockRejectedValueOnce(new Error('disk unavailable'));

    const spendPromise = spendShards(30, 'card_pack');
    await jest.advanceTimersByTimeAsync(7000);

    await expect(spendPromise).resolves.toBe(false);
    expect(enqueueAppliedShardDeltaWithStorage).toHaveBeenCalledWith(
      expect.objectContaining({
        opId: 'op-timeout-12345678',
        ownerStableId: 'u1',
        type: 'spend',
      }),
      expect.any(Function),
    );
  }, 30000);

  it('requires an exact cloud receipt before granting a prepared legacy customization spend', async () => {
    const legacyOpId = 'customization:legacy-crash-op';
    mockStorage.shards_balance = '65';
    mockStorage.shard_spend_op_ledger_v1 = JSON.stringify([legacyOpId]);
    const unrelated = {
      opId: 'customization:unrelated-pending',
      delta: 10,
      type: 'spend',
      reason: 'custom_avatar',
      createdAtMs: 2,
    };
    mockStorage['shards_delta_queue_v1_quarantine:ownerless'] = JSON.stringify([
      {
        opId: legacyOpId,
        delta: 35,
        type: 'spend',
        reason: 'avatar_aura',
        createdAtMs: 1,
      },
      unrelated,
    ]);
    queueQuarantined = true;
    hangingCallable.mockResolvedValueOnce({
      data: {
        ok: true,
        alreadyApplied: false,
        insufficient: false,
        balance: 65,
        shardsUpdatedAtMs: 1000,
      },
    });

    await expect(spendShardsIdempotent(
      35,
      'avatar_aura',
      legacyOpId,
      { requireCloudReceiptForLocalLedger: true },
    )).resolves.toBe('already-applied');
    expect(hangingCallable).toHaveBeenCalledWith(expect.objectContaining({
      opId: legacyOpId,
      delta: 35,
      type: 'spend',
      reason: 'avatar_aura',
      ownerStableId: 'u1',
    }));
    await expect(getShardsBalance()).resolves.toBe(65);
    expect(JSON.parse(mockStorage['shards_delta_queue_v1_quarantine:ownerless']))
      .toEqual([unrelated]);
    expect(mockStorage[`shards_delta_queue_v1_resolved:${encodeURIComponent(legacyOpId)}`])
      .toContain(legacyOpId);

    hangingCallable.mockResolvedValueOnce({
      data: {
        ok: true,
        alreadyApplied: true,
        insufficient: false,
        balance: 65,
        shardsUpdatedAtMs: 1000,
      },
    });
    await expect(spendShardsIdempotent(
      35,
      'avatar_aura',
      legacyOpId,
      { requireCloudReceiptForLocalLedger: true },
    )).resolves.toBe('already-applied');
    expect(hangingCallable).toHaveBeenCalledTimes(2);
    expect(JSON.parse(mockStorage['shards_delta_queue_v1_quarantine:ownerless']))
      .toEqual([unrelated]);
  });

  it.each([
    ['missing row', undefined, undefined],
    ['wrong amount', JSON.stringify([{
      opId: 'customization:legacy-crash-op',
      delta: 34,
      type: 'spend',
      reason: 'avatar_aura',
      createdAtMs: 1,
    }]), undefined],
    ['wrong reason', JSON.stringify([{
      opId: 'customization:legacy-crash-op',
      delta: 35,
      type: 'spend',
      reason: 'custom_avatar',
      createdAtMs: 1,
    }]), undefined],
    ['corrupt owner v2', JSON.stringify([{
      opId: 'customization:legacy-crash-op',
      delta: 35,
      type: 'spend',
      reason: 'avatar_aura',
      createdAtMs: 1,
    }]), '{corrupt'],
  ])('does not bypass quarantine for %s', async (_case, legacyRaw, ownerV2Raw) => {
    const legacyOpId = 'customization:legacy-crash-op';
    mockStorage.shards_balance = '65';
    mockStorage.shard_spend_op_ledger_v1 = JSON.stringify([legacyOpId]);
    if (legacyRaw) mockStorage['shards_delta_queue_v1_quarantine:ownerless'] = legacyRaw;
    if (ownerV2Raw) mockStorage['shards_delta_queue_v2_quarantine:u1'] = ownerV2Raw;
    queueQuarantined = true;

    await expect(spendShardsIdempotent(
      35,
      'avatar_aura',
      legacyOpId,
      { requireCloudReceiptForLocalLedger: true },
    )).resolves.toBe('failed');
    expect(hangingCallable).not.toHaveBeenCalled();
    await expect(getShardsBalance()).resolves.toBe(65);
  });

  it('does not call the server when owner-v2 quarantine appears after legacy precheck', async () => {
    const legacyOpId = 'customization:legacy-race-op';
    mockStorage.shards_balance = '65';
    mockStorage.shard_spend_op_ledger_v1 = JSON.stringify([legacyOpId]);
    mockStorage['shards_delta_queue_v1_quarantine:ownerless'] = JSON.stringify([{
      opId: legacyOpId,
      delta: 35,
      type: 'spend',
      reason: 'avatar_aura',
      createdAtMs: 1,
    }]);
    queueQuarantined = true;
    hasExactLegacyQuarantinedShardDelta
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true)
      .mockImplementationOnce(async () => {
        mockStorage['shards_delta_queue_v2_quarantine:u1'] = '{corrupt';
        return false;
      });

    await expect(spendShardsIdempotent(
      35,
      'avatar_aura',
      legacyOpId,
      { requireCloudReceiptForLocalLedger: true },
    )).resolves.toBe('failed');
    expect(hangingCallable).not.toHaveBeenCalled();
    await expect(getShardsBalance()).resolves.toBe(65);
  });
});
