import AsyncStorage from '@react-native-async-storage/async-storage';
import { emitAppEvent } from '../app/events';
import type { DailyTask } from '../app/daily_tasks';
import * as DailyTasks from '../app/daily_tasks';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/events', () => ({ emitAppEvent: jest.fn() }));

const mockStorage: Record<string, string> = {};
const FIXED_DAY = '2026-01-01';

const stubTasks: DailyTask[] = [
  {
    id: 'da1',
    type: 'daily_active',
    icon: '☀️',
    target: 1,
    xp: 15,
    titleRU: 't',
    titleUK: 't',
    descRU: 'd',
    descUK: 'd',
  },
  {
    id: 'ta9',
    type: 'total_answers',
    icon: '⚡',
    target: 100,
    xp: 12,
    titleRU: 't',
    titleUK: 't',
    descRU: 'd',
    descUK: 'd',
  },
  {
    id: 'cs6',
    type: 'correct_streak',
    icon: '🎯',
    target: 7,
    xp: 32,
    titleRU: 't',
    titleUK: 't',
    descRU: 'd',
    descUK: 'd',
  },
];

const getTodayKeySpy = jest.spyOn(DailyTasks, 'getTodayKey').mockReturnValue(FIXED_DAY);
const getTodayTasksSafeSpy = jest.spyOn(DailyTasks, 'getTodayTasksSafe').mockResolvedValue(stubTasks);

afterAll(() => {
  getTodayTasksSafeSpy.mockRestore();
  getTodayKeySpy.mockRestore();
});

beforeEach(() => {
  jest.clearAllMocks();
  getTodayTasksSafeSpy.mockResolvedValue(stubTasks);
  Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
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
  mockStorage.user_total_xp = '0';
});

describe('daily_tasks claim + completion events', () => {
  it('getTodayKey is stubbed to fixed calendar day', () => {
    expect(DailyTasks.getTodayKey()).toBe(FIXED_DAY);
  });

  it('claimTaskWithReward claims once and returns awarded XP', async () => {
    const key = `daily_tasks_${FIXED_DAY}`;
    mockStorage[key] = JSON.stringify([
      { taskId: 'da1', current: 1, completed: true, claimed: false },
      { taskId: 'ta9', current: 0, completed: false, claimed: false },
      { taskId: 'cs6', current: 0, completed: false, claimed: false },
    ]);

    const grant = jest.fn().mockResolvedValue(42);
    await expect(DailyTasks.claimTaskWithReward('da1', grant)).resolves.toEqual({ claimed: true, awardedXp: 42 });
    expect(grant).toHaveBeenCalledTimes(1);

    const after = JSON.parse(mockStorage[key] || '[]');
    const da1 = after.find((p: { taskId: string }) => p.taskId === 'da1');
    expect(da1.claimed).toBe(true);

    const grant2 = jest.fn().mockResolvedValue(99);
    await expect(DailyTasks.claimTaskWithReward('da1', grant2)).resolves.toEqual({
      claimed: false,
      awardedXp: 0,
    });
    expect(grant2).not.toHaveBeenCalled();
  });

  it('claimTaskWithReward does not claim when grant throws', async () => {
    const key = `daily_tasks_${FIXED_DAY}`;
    mockStorage[key] = JSON.stringify([
      { taskId: 'da1', current: 1, completed: true, claimed: false },
      { taskId: 'ta9', current: 0, completed: false, claimed: false },
      { taskId: 'cs6', current: 0, completed: false, claimed: false },
    ]);

    const grant = jest.fn().mockRejectedValue(new Error('network'));
    await expect(DailyTasks.claimTaskWithReward('da1', grant)).resolves.toEqual({ claimed: false, awardedXp: 0 });

    const after = JSON.parse(mockStorage[key] || '[]');
    expect(after.find((p: { taskId: string }) => p.taskId === 'da1').claimed).toBe(false);
  });

  it('claimTaskWithReward refuses incomplete tasks', async () => {
    const key = `daily_tasks_${FIXED_DAY}`;
    mockStorage[key] = JSON.stringify([
      { taskId: 'da1', current: 0, completed: false, claimed: false },
      { taskId: 'ta9', current: 0, completed: false, claimed: false },
      { taskId: 'cs6', current: 0, completed: false, claimed: false },
    ]);

    const grant = jest.fn().mockResolvedValue(10);
    await expect(DailyTasks.claimTaskWithReward('da1', grant)).resolves.toEqual({ claimed: false, awardedXp: 0 });
    expect(grant).not.toHaveBeenCalled();
  });

  it('countClaimedForTaskList ignores claimed rows for ids not in the current list', () => {
    const tasks = stubTasks;
    const progress = [
      { taskId: 'ghost', current: 0, completed: false, claimed: true },
      { taskId: 'da1', current: 1, completed: true, claimed: false },
    ];
    expect(DailyTasks.countClaimedForTaskList(tasks, progress)).toBe(0);
  });

  it('loadTodayProgress realigns storage when task ids no longer match (stale rows dropped)', async () => {
    const key = `daily_tasks_${FIXED_DAY}`;
    mockStorage[key] = JSON.stringify([
      { taskId: 'ghost_claimed', current: 0, completed: true, claimed: true },
      { taskId: 'da1', current: 1, completed: true, claimed: false },
      { taskId: 'stale_ta', current: 5, completed: false, claimed: false },
    ]);

    const p = await DailyTasks.loadTodayProgress();
    expect(p.map(x => x.taskId)).toEqual(['da1', 'ta9', 'cs6']);
    expect(p.find(t => t.taskId === 'da1')).toEqual(
      expect.objectContaining({ current: 1, completed: true, claimed: false }),
    );
    expect(p.find(t => t.taskId === 'ta9')?.current).toBe(0);
    const saved = JSON.parse(mockStorage[key] || '[]');
    expect(saved.map((x: { taskId: string }) => x.taskId)).toEqual(['da1', 'ta9', 'cs6']);
    expect(saved.some((x: { taskId: string }) => x.taskId === 'ghost_claimed')).toBe(false);
  });

  it('resetAndUpdateTaskProgress emits daily_task_completed after save', async () => {
    const key = `daily_tasks_${FIXED_DAY}`;
    mockStorage[key] = JSON.stringify([
      { taskId: 'da1', current: 0, completed: false, claimed: false },
      { taskId: 'ta9', current: 0, completed: false, claimed: false },
      { taskId: 'cs6', current: 0, completed: false, claimed: false },
    ]);

    await DailyTasks.resetAndUpdateTaskProgress([], [{ type: 'daily_active', increment: 1 }]);

    expect(emitAppEvent).toHaveBeenCalledWith('daily_task_completed', { taskId: 'da1' });

    const progress = await DailyTasks.loadTodayProgress();
    const da1 = progress.find(p => p.taskId === 'da1');
    expect(da1?.completed).toBe(true);
  });
});
