import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  rerollDailyTask,
  getDailyRerollsLeftToday,
  getTodayKey,
  getTodayTasksSafe,
  DAILY_TASK_REROLL_COST_SHARDS,
  DAILY_TASK_REROLL_MAX_PER_DAY,
} from '../app/daily_tasks';
import { dailyTasksProgressKey, dailyTasksRerollKey } from '../app/target_storage_keys';
import {
  __resetAccountGenerationForTests,
  beginAccountGeneration,
} from '../app/account_generation';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/config', () => ({ IS_EXPO_GO: true, CLOUD_SYNC_ENABLED: false }));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { error: jest.fn() } }));
jest.mock('../app/events', () => ({ emitAppEvent: jest.fn() }));
jest.mock('../app/premium_guard', () => ({ getVerifiedPremiumStatus: jest.fn(async () => false) }));
jest.mock('../app/lifetime_profile_stats', () => ({
  bumpLifetimeShardsEarned: jest.fn(),
  bumpLifetimeShardsSpent: jest.fn(),
}));

const mockStorage: Record<string, string> = {};

beforeEach(() => {
  jest.clearAllMocks();
  __resetAccountGenerationForTests();
  beginAccountGeneration('test-owner');
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
  (AsyncStorage.removeItem as jest.Mock).mockImplementation((k: string) => {
    delete mockStorage[k];
    return Promise.resolve();
  });
  // Достаточно осколков для всех замен в тестах
  mockStorage.shards_balance = '50';
  // Уровень 1 → tier 1 → задания: ['da1','ta9','dp1'] (день 1) etc.
  mockStorage.user_total_xp = '0';
});

describe('daily_task_reroll', () => {
  it('starts with full daily allowance', async () => {
    const left = await getDailyRerollsLeftToday();
    expect(left).toBe(DAILY_TASK_REROLL_MAX_PER_DAY);
  });

  it('reroll is free and decrements daily allowance', async () => {
    const before = await getDailyRerollsLeftToday();
    expect(before).toBe(DAILY_TASK_REROLL_MAX_PER_DAY);
    const tasks = await getTodayTasksSafe();
    const target = tasks[0]!.id;
    const r = await rerollDailyTask(target);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.cost).toBe(DAILY_TASK_REROLL_COST_SHARDS);
      expect(r.newTaskId).not.toBe(target);
    }
    expect(DAILY_TASK_REROLL_COST_SHARDS).toBe(0);
    expect(mockStorage.shards_balance).toBe('50');
    const after = await getDailyRerollsLeftToday();
    expect(after).toBe(DAILY_TASK_REROLL_MAX_PER_DAY - 1);
  });

  it('keeps the early limit check ahead of the expensive path', async () => {
    // При лимите 1 повторный реролл обязан отсекаться дешёвой проверкой, не доходя до
    // подбора кандидата и списания.
    const tasks = await getTodayTasksSafe();
    const target = tasks[0]!.id;
    const first = await rerollDailyTask(target);
    expect(first.ok).toBe(true);

    const balanceAfterFirst = mockStorage.shards_balance;
    const second = await rerollDailyTask(target);
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.reason).toBe('limit_reached');
    // Осколки за отклонённую попытку не списываются.
    expect(mockStorage.shards_balance).toBe(balanceAfterFirst);
  });

  it('does not write French reroll state when no verified replacement is available', async () => {
    const tasks = await getTodayTasksSafe('fr');
    const target = tasks[0]!.id;
    const r = await rerollDailyTask(target, 'fr');

    expect(r).toEqual({ ok: false, reason: 'no_candidates' });
    expect(mockStorage.daily_tasks_reroll_v1).toBeUndefined();
    expect(mockStorage[`daily_tasks_${getTodayKey()}`]).toBeUndefined();
    expect(mockStorage[dailyTasksRerollKey('fr')]).toBeUndefined();

    await expect(getDailyRerollsLeftToday('fr')).resolves.toBe(DAILY_TASK_REROLL_MAX_PER_DAY);
    await expect(getDailyRerollsLeftToday()).resolves.toBe(DAILY_TASK_REROLL_MAX_PER_DAY);
  });

  it('rejects when daily limit reached', async () => {
    const tasks = await getTodayTasksSafe();
    const target = tasks[0]!.id;
    // Симулируем что уже использовали лимит сегодня
    mockStorage.daily_tasks_reroll_v1 = JSON.stringify({
      dayKey: getTodayKey(),
      replacements: { [target]: 'ta1' },
    });
    const r = await rerollDailyTask(target);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('limit_reached');
    // Баланс не списан
    expect(mockStorage.shards_balance).toBe('50');
  });

  it('rejects rerolling already-completed task', async () => {
    const tasks = await getTodayTasksSafe();
    const target = tasks[0]!.id;
    const today = getTodayKey();
    mockStorage[`daily_tasks_${today}`] = JSON.stringify([
      { taskId: target, current: 1, completed: true, claimed: false },
    ]);
    const r = await rerollDailyTask(target);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('task_already_completed');
    expect(mockStorage.shards_balance).toBe('50');
  });

  it('does not require a shard balance', async () => {
    mockStorage.shards_balance = '1';
    const tasks = await getTodayTasksSafe();
    const target = tasks[0]!.id;
    const r = await rerollDailyTask(target);
    expect(r.ok).toBe(true);
    expect(mockStorage.shards_balance).toBe('1');
    expect(await getDailyRerollsLeftToday()).toBe(DAILY_TASK_REROLL_MAX_PER_DAY - 1);
  });

  it('expires reroll state from previous day', async () => {
    mockStorage.daily_tasks_reroll_v1 = JSON.stringify({
      dayKey: '2000-01-01',
      replacements: { da1: 'ta1' },
    });
    const left = await getDailyRerollsLeftToday();
    // Старая запись игнорируется — лимит снова полный
    expect(left).toBe(DAILY_TASK_REROLL_MAX_PER_DAY);
  });
});
