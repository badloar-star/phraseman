import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  clearDailyTasksAdminOverride,
  getTodayKey,
  getDailyTaskAdminPacks,
  getTodayTasksSafe,
  loadTodayProgress,
  seedDailyTasksAdminPack,
  dailyTaskAvailableForStudyTarget,
} from '../app/daily_tasks';
import {
  dailyTasksAdminOverrideKey,
  dailyTasksProgressKey,
} from '../app/target_storage_keys';

describe('daily tasks admin QA seeding', () => {
  beforeEach(() => {
    (AsyncStorage as any).__reset?.();
    jest.clearAllMocks();
  });

  it('builds packs that cover all daily tasks without duplicates', () => {
    const packs = getDailyTaskAdminPacks(3);
    const ids = packs.flatMap((p) => p.taskIds);

    expect(packs.length).toBeGreaterThan(1);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeGreaterThanOrEqual(80);
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

  it('keeps French admin QA seed isolated and source-gated', async () => {
    const packWithBlockedFrenchTasks = getDailyTaskAdminPacks(3).find((pack) =>
      pack.types.some((type) => !dailyTaskAvailableForStudyTarget(type, 'fr')),
    );
    expect(packWithBlockedFrenchTasks).toBeTruthy();

    const seeded = await seedDailyTasksAdminPack(packWithBlockedFrenchTasks!.taskIds, 'ready', 'fr');
    const visibleFrenchTasks = await getTodayTasksSafe('fr');
    const progress = await loadTodayProgress(visibleFrenchTasks, 'fr');
    const overrideKey = dailyTasksAdminOverrideKey('fr');
    const progressKey = dailyTasksProgressKey(getTodayKey(), 'fr');

    expect(seeded).toHaveLength(packWithBlockedFrenchTasks!.taskIds.length);
    expect(seeded.every((task) => dailyTaskAvailableForStudyTarget(task, 'fr'))).toBe(true);
    expect(visibleFrenchTasks.map((task) => task.id)).toEqual(seeded.map((task) => task.id));
    expect(progress.every((row) => row.completed && !row.claimed)).toBe(true);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(overrideKey, expect.any(String));
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(progressKey, expect.any(String));
    expect(AsyncStorage.setItem).not.toHaveBeenCalledWith('daily_tasks_admin_override_v1', expect.any(String));
    expect(AsyncStorage.setItem).not.toHaveBeenCalledWith(`daily_tasks_${getTodayKey()}`, expect.any(String));

    await clearDailyTasksAdminOverride('fr');
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(overrideKey);
    expect(await getTodayTasksSafe('fr')).not.toEqual(visibleFrenchTasks);
  });
});
