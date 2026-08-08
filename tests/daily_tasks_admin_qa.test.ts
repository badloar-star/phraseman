import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  clearDailyTasksAdminOverride,
  getTodayKey,
  getDailyTaskAdminPacks,
  getDailyTaskAdminPreviewTasks,
  getTodayTasksSafe,
  loadTodayProgress,
  seedDailyTasksAdminPack,
} from '../app/daily_tasks';

describe('daily tasks admin QA seeding', () => {
  beforeEach(() => {
    (AsyncStorage as any).__reset?.();
    jest.clearAllMocks();
  });

  it('builds packs that cover all daily tasks without duplicates', () => {
    const packs = getDailyTaskAdminPacks(3);
    const ids = packs.flatMap((p) => p.taskIds);
    const activeIds = getDailyTaskAdminPreviewTasks().map((task) => task.id);

    expect(packs.length).toBeGreaterThan(1);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(activeIds);
  });

  it('overrides today tasks and seeds completed progress for reward QA', async () => {
    const pack = getDailyTaskAdminPacks(3)[0]!;
    await seedDailyTasksAdminPack(pack.taskIds, 'ready');

    const visibleTasks = await getTodayTasksSafe();
    const progress = await loadTodayProgress(visibleTasks);

    expect(visibleTasks.map((t) => t.id)).toEqual(pack.taskIds);
    expect(progress.filter((p) => pack.taskIds.includes(p.taskId))).toHaveLength(pack.taskIds.length);
    expect(progress.filter((p) => pack.taskIds.includes(p.taskId)).every((p) => p.completed && !p.claimed)).toBe(true);
  });

  it('clears the admin override and returns to the real daily schedule', async () => {
    const pack = getDailyTaskAdminPacks(3)[0]!;
    await seedDailyTasksAdminPack(pack.taskIds, 'claimed');
    await clearDailyTasksAdminOverride();

    const visibleTasks = await getTodayTasksSafe();

    expect(visibleTasks.map((t) => t.id)).not.toEqual(pack.taskIds);
  });

});
