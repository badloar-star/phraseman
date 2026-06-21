/**
 * Контракт клиентской выдачи осколка за все дневные задания
 * (claimDailyTasksAllShardsRewardDetailed) — корень баг-репортов daily_tasks
 * «не забрать осколки уже который день» / «осколки уменьшились».
 *
 * Проверяем:
 *  1) сервер вернул alreadyClaimed → исход 'already' (НЕ 'failed'), маркер ставится,
 *     серверный баланс подтягивается локально (фикс расхождения «осколки уменьшились»);
 *  2) сервер реально начислил → исход 'granted';
 *  3) в payload CF уходит stableId (фикс рассинхрона документа при релинке);
 *  4) сбой CF → исход 'failed'.
 */

const mockCallable = jest.fn();

jest.mock('../app/config', () => ({
  CLOUD_SYNC_ENABLED: true,
  IS_EXPO_GO: false,
}));

jest.mock('../app/user_id_policy', () => ({
  getCanonicalUserId: jest.fn(async () => 'stable-abc-123'),
}));

jest.mock('@react-native-firebase/functions', () => ({
  __esModule: true,
  getFunctions: () => ({}),
  httpsCallable: () => mockCallable,
}));

jest.mock('@react-native-firebase/app', () => ({
  __esModule: true,
  getApp: () => ({}),
}));

jest.mock('../app/debug-logger', () => ({
  DebugLogger: { error: jest.fn(), log: jest.fn(), warn: jest.fn() },
}));

jest.mock('../app/events', () => ({ emitAppEvent: jest.fn() }));
jest.mock('../app/lifetime_profile_stats', () => ({
  bumpLifetimeShardsEarned: jest.fn(),
  bumpLifetimeShardsSpent: jest.fn(),
}));
jest.mock('../app/storage_mutex', () => ({
  withStorageLock: jest.fn(async (fn: () => Promise<unknown>) => fn()),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { claimDailyTasksAllShardsRewardDetailed } from '../app/shards_system';

const DAY = '2026-06-21';

beforeEach(async () => {
  mockCallable.mockReset();
  await AsyncStorage.clear();
});

describe('claimDailyTasksAllShardsRewardDetailed', () => {
  it('alreadyClaimed → "already" (НЕ ошибка), маркер ставится', async () => {
    mockCallable.mockResolvedValue({ data: { alreadyClaimed: true, newBalance: 42 } });

    const outcome = await claimDailyTasksAllShardsRewardDetailed(DAY);

    expect(outcome).toBe('already');
    // маркер «забрано» записан → кнопка погаснет молча, без вечного тоста
    expect(await AsyncStorage.getItem(`daily_tasks_all_shards_${DAY}`)).toBe('1');
  });

  it('alreadyClaimed → подтягивает серверный баланс локально (фикс «осколки уменьшились»)', async () => {
    mockCallable.mockResolvedValue({ data: { alreadyClaimed: true, newBalance: 77 } });

    await claimDailyTasksAllShardsRewardDetailed(DAY);

    expect(await AsyncStorage.getItem('shards_balance')).toBe('77');
  });

  it('реальное начисление → "granted"', async () => {
    mockCallable.mockResolvedValue({ data: { alreadyClaimed: false, newBalance: 10 } });

    const outcome = await claimDailyTasksAllShardsRewardDetailed(DAY);

    expect(outcome).toBe('granted');
    expect(await AsyncStorage.getItem(`daily_tasks_all_shards_${DAY}`)).toBe('1');
  });

  it('в payload CF уходит stableId (фикс рассинхрона документа при релинке)', async () => {
    mockCallable.mockResolvedValue({ data: { alreadyClaimed: false, newBalance: 1 } });

    await claimDailyTasksAllShardsRewardDetailed(DAY);

    expect(mockCallable).toHaveBeenCalledWith(
      expect.objectContaining({ dayKey: DAY, stableId: 'stable-abc-123' }),
    );
  });

  it('сбой CF → "failed"', async () => {
    mockCallable.mockRejectedValue(new Error('network'));

    const outcome = await claimDailyTasksAllShardsRewardDetailed(DAY);

    expect(outcome).toBe('failed');
    // маркер НЕ ставится — пользователь сможет повторить
    expect(await AsyncStorage.getItem(`daily_tasks_all_shards_${DAY}`)).toBeNull();
  });

  it('повторный вызов после успеха → "already" без второго обращения к CF', async () => {
    mockCallable.mockResolvedValue({ data: { alreadyClaimed: false, newBalance: 5 } });
    await claimDailyTasksAllShardsRewardDetailed(DAY);
    mockCallable.mockClear();

    const outcome = await claimDailyTasksAllShardsRewardDetailed(DAY);

    expect(outcome).toBe('already');
    expect(mockCallable).not.toHaveBeenCalled();
  });
});
