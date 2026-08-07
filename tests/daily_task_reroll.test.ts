import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  rerollDailyTask,
  getDailyRerollsLeftToday,
  getTodayKey,
  getTodayTasksSafe,
  loadTodayProgress,
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

  it('does not mutate progress when the authoritative reroll state write fails', async () => {
    const tasks = await getTodayTasksSafe();
    const target = tasks[0]!.id;
    const progressKey = dailyTasksProgressKey(getTodayKey());
    const rerollKey = dailyTasksRerollKey();
    const originalProgress = JSON.stringify(tasks.map((task) => ({
      taskId: task.id, current: 0, completed: false, claimed: false,
    })));
    mockStorage[progressKey] = originalProgress;
    (AsyncStorage.setItem as jest.Mock).mockImplementation((key: string, value: string) => {
      if (key === rerollKey) return Promise.reject(new Error('disk_full'));
      mockStorage[key] = value;
      return Promise.resolve();
    });

    await expect(rerollDailyTask(target)).resolves.toEqual({ ok: false, reason: 'unknown' });
    expect(mockStorage[rerollKey]).toBeUndefined();
    expect(mockStorage[progressKey]).toBe(originalProgress);
  });

  it('rejects a reroll when read-after-write cannot prove the mapping persisted', async () => {
    const tasks = await getTodayTasksSafe();
    const target = tasks[0]!.id;
    const progressKey = dailyTasksProgressKey(getTodayKey());
    const rerollKey = dailyTasksRerollKey();
    const originalProgress = JSON.stringify(tasks.map((task) => ({
      taskId: task.id, current: 0, completed: false, claimed: false,
    })));
    mockStorage[progressKey] = originalProgress;
    (AsyncStorage.setItem as jest.Mock).mockImplementation((key: string, value: string) => {
      if (key === rerollKey) return Promise.resolve();
      mockStorage[key] = value;
      return Promise.resolve();
    });

    await expect(rerollDailyTask(target)).resolves.toEqual({ ok: false, reason: 'unknown' });
    expect(mockStorage[rerollKey]).toBeUndefined();
    expect(mockStorage[progressKey]).toBe(originalProgress);
  });

  it('keeps a verified reroll successful when only derived progress persistence fails', async () => {
    const tasks = await getTodayTasksSafe();
    const target = tasks[0]!.id;
    const progressKey = dailyTasksProgressKey(getTodayKey());
    const rerollKey = dailyTasksRerollKey();
    const originalProgress = JSON.stringify(tasks.map((task) => ({
      taskId: task.id, current: 0, completed: false, claimed: false,
    })));
    mockStorage[progressKey] = originalProgress;
    let rerollCommitted = false;
    (AsyncStorage.setItem as jest.Mock).mockImplementation((key: string, value: string) => {
      if (key === rerollKey) {
        mockStorage[key] = value;
        rerollCommitted = true;
        return Promise.resolve();
      }
      if (key === progressKey && rerollCommitted) {
        return Promise.reject(new Error('progress_write_failed'));
      }
      mockStorage[key] = value;
      return Promise.resolve();
    });

    const result = await rerollDailyTask(target);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected successful reroll');
    expect(JSON.parse(mockStorage[rerollKey]!).replacements[target]).toBe(result.newTaskId);
    expect(mockStorage[progressKey]).toBe(originalProgress);

    (AsyncStorage.setItem as jest.Mock).mockImplementation((key: string, value: string) => {
      mockStorage[key] = value;
      return Promise.resolve();
    });
    const tasksAfter = await getTodayTasksSafe();
    expect(tasksAfter.some((task) => task.id === target)).toBe(false);
    expect(tasksAfter.some((task) => task.id === result.newTaskId)).toBe(true);
    const repaired = await loadTodayProgress(tasksAfter);
    expect(repaired.find((row) => row.taskId === result.newTaskId)).toMatchObject({
      current: 0, completed: false, claimed: false,
    });
  });

});
