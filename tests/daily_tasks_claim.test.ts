import AsyncStorage from '@react-native-async-storage/async-storage';
import { emitAppEvent } from '../app/events';
import type { DailyTask } from '../app/daily_tasks';
import * as DailyTasks from '../app/daily_tasks';
import { dailyTasksProgressKey } from '../app/target_storage_keys';

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
    // Регрессия: после успешного клейма экран должен получить событие
    // (раньше его не эмитили — карточка зависала с "Забрать" при клейме из глобального тоста).
    expect(emitAppEvent).toHaveBeenCalledWith('daily_task_reward_claimed', { taskId: 'da1' });

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

  it('keeps French daily progress under the scoped study-target key', async () => {
    const scopedKey = dailyTasksProgressKey(FIXED_DAY, 'fr');
    const legacyKey = dailyTasksProgressKey(FIXED_DAY, 'en');

    await DailyTasks.updateMultipleTaskProgress(
      [{ type: 'daily_active', increment: 1 }],
      { studyTarget: 'fr' },
    );

    expect(getTodayTasksSafeSpy).toHaveBeenCalledWith('fr');
    expect(mockStorage[legacyKey]).toBeUndefined();
    const saved = JSON.parse(mockStorage[scopedKey] || '[]') as DailyTasks.TaskProgress[];
    expect(saved.find((row) => row.taskId === 'da1')).toMatchObject({
      current: 1,
      completed: true,
      claimed: false,
    });
  });

  it('claims French daily rewards from the scoped progress row only', async () => {
    const scopedKey = dailyTasksProgressKey(FIXED_DAY, 'fr');
    const legacyKey = dailyTasksProgressKey(FIXED_DAY, 'en');
    mockStorage[scopedKey] = JSON.stringify([
      { taskId: 'da1', current: 1, completed: true, claimed: false },
      { taskId: 'ta9', current: 0, completed: false, claimed: false },
      { taskId: 'cs6', current: 0, completed: false, claimed: false },
    ]);

    const grant = jest.fn().mockResolvedValue(18);
    await expect(
      DailyTasks.claimTaskWithReward('da1', grant, { tasksForClaim: stubTasks, studyTarget: 'fr' }),
    ).resolves.toEqual({ claimed: true, awardedXp: 18 });

    expect(getTodayTasksSafeSpy).toHaveBeenCalledWith('fr');
    expect(mockStorage[legacyKey]).toBeUndefined();
    const saved = JSON.parse(mockStorage[scopedKey] || '[]') as DailyTasks.TaskProgress[];
    expect(saved.find((row) => row.taskId === 'da1')?.claimed).toBe(true);
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

  it('claimTaskWithReward uses tasksForClaim so UI list matches storage even if getTodayTasksSafe diverges', async () => {
    const key = `daily_tasks_${FIXED_DAY}`;
    mockStorage[key] = JSON.stringify([
      { taskId: 'da1', current: 1, completed: true, claimed: false },
      { taskId: 'ta9', current: 0, completed: false, claimed: false },
      { taskId: 'cs6', current: 0, completed: false, claimed: false },
    ]);
    getTodayTasksSafeSpy.mockResolvedValue([]);
    const grant = jest.fn().mockResolvedValue(11);
    await expect(
      DailyTasks.claimTaskWithReward('da1', grant, { tasksForClaim: stubTasks }),
    ).resolves.toEqual({ claimed: true, awardedXp: 11 });
    expect(grant).toHaveBeenCalledTimes(1);
    getTodayTasksSafeSpy.mockResolvedValue(stubTasks);
  });

  it('countClaimedForTaskList ignores claimed rows for ids not in the current list', () => {
    const tasks = stubTasks;
    const progress = [
      { taskId: 'ghost', current: 0, completed: false, claimed: true },
      { taskId: 'da1', current: 1, completed: true, claimed: false },
    ];
    expect(DailyTasks.countClaimedForTaskList(tasks, progress)).toBe(0);
  });

  it('treats already claimed daily tasks as done for the final shard reward', () => {
    const progress = [
      { taskId: 'da1', current: 0, completed: false, claimed: true },
      { taskId: 'ta9', current: 100, completed: true, claimed: false },
      { taskId: 'cs6', current: 7, completed: true, claimed: true },
    ];

    expect(DailyTasks.areAllDailyTaskObjectivesDone(stubTasks, progress)).toBe(true);
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

  it('updateMultipleTaskProgress counts arena bot-style outcomes for plays, wins and combo tasks', async () => {
    const arenaTasks: DailyTask[] = [
      {
        id: 'ap1',
        type: 'arena_play',
        icon: 'a',
        target: 1,
        xp: 10,
        titleRU: 't',
        titleUK: 't',
        descRU: 'd',
        descUK: 'd',
      },
      {
        id: 'aw1',
        type: 'arena_win',
        icon: 'w',
        target: 1,
        xp: 10,
        titleRU: 't',
        titleUK: 't',
        descRU: 'd',
        descUK: 'd',
      },
      {
        id: 'ac1',
        type: 'arena_plays_wins_combo',
        icon: 'c',
        target: 2,
        xp: 10,
        titleRU: 't',
        titleUK: 't',
        descRU: 'd',
        descUK: 'd',
        arenaCombo: { minPlays: 2, minWins: 1 },
      },
    ];
    getTodayTasksSafeSpy.mockResolvedValue(arenaTasks);

    await DailyTasks.updateMultipleTaskProgress(
      [
        { type: 'arena_play', increment: 1 },
        { type: 'arena_win', increment: 1 },
      ],
      { pvpArenaMatchFinished: { won: true } },
    );

    const progress = await DailyTasks.loadTodayProgress(arenaTasks);
    expect(progress.find(p => p.taskId === 'ap1')).toMatchObject({ current: 1, completed: true });
    expect(progress.find(p => p.taskId === 'aw1')).toMatchObject({ current: 1, completed: true });
    expect(progress.find(p => p.taskId === 'ac1')).toMatchObject({
      current: 1,
      comboPlays: 1,
      comboWins: 1,
      completed: false,
    });
  });
});
