import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  deliverDailyTaskProgressEvent,
  getTodayKey,
  getTodayTasksSafe,
  loadTodayProgress,
} from '../app/daily_tasks';
import { dailyTasksAdminOverrideKey, dailyTasksProgressKey } from '../app/target_storage_keys';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/config', () => ({ IS_EXPO_GO: true, CLOUD_SYNC_ENABLED: false }));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { error: jest.fn() } }));
jest.mock('../app/events', () => ({ emitAppEvent: jest.fn() }));
jest.mock('../app/premium_guard', () => ({ getVerifiedPremiumStatus: jest.fn(async () => false) }));
jest.mock('../app/shards_system', () => ({ getShardsBalance: jest.fn(async () => 100) }));
jest.mock('../app/active_recall', () => ({ countDueItemsToday: jest.fn(async () => 100) }));
jest.mock('../app/trainer_store', () => ({
  getTrainerCounts: jest.fn(async () => ({ words: 100, phrases: 100, arena: 0 })),
}));
jest.mock('../app/lifetime_profile_stats', () => ({ bumpDailyTaskClaimed: jest.fn() }));

const storage: Record<string, string> = {};

function installStorageMocks(): void {
  (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) =>
    Promise.resolve(storage[key] ?? null));
  (AsyncStorage.setItem as jest.Mock).mockImplementation((key: string, value: string) => {
    storage[key] = value;
    return Promise.resolve();
  });
  (AsyncStorage.multiGet as jest.Mock).mockImplementation((keys: string[]) =>
    Promise.resolve(keys.map((key) => [key, storage[key] ?? null])));
  (AsyncStorage.multiSet as jest.Mock).mockImplementation((pairs: Array<[string, string]>) => {
    pairs.forEach(([key, value]) => { storage[key] = value; });
    return Promise.resolve();
  });
  (AsyncStorage.removeItem as jest.Mock).mockImplementation((key: string) => {
    delete storage[key];
    return Promise.resolve();
  });
  (AsyncStorage.multiRemove as jest.Mock).mockImplementation((keys: string[]) => {
    keys.forEach((key) => delete storage[key]);
    return Promise.resolve();
  });
  (AsyncStorage.getAllKeys as jest.Mock).mockImplementation(() => Promise.resolve(Object.keys(storage)));
}

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(storage).forEach((key) => delete storage[key]);
  installStorageMocks();
  storage.user_total_xp = '0';
  storage[dailyTasksAdminOverrideKey()] = JSON.stringify({
    dayKey: getTodayKey(),
    taskIds: ['da1'],
  });
});

async function lessonCompleteProgress(): Promise<number> {
  const tasks = await getTodayTasksSafe();
  expect(tasks.map((task) => task.id)).toEqual(['da1']);
  const progress = await loadTodayProgress(tasks);
  return progress.find((row) => row.taskId === 'da1')?.current ?? -1;
}

describe('durable Daily Challenge progress events', () => {
  it('applies the same lesson-finish event exactly once', async () => {
    const eventId = `lesson-finish:${getTodayKey()}:en:1:attempt_1`;
    await expect(deliverDailyTaskProgressEvent(eventId, [
      { type: 'lesson_complete', increment: 1 },
    ])).resolves.toBe('applied');
    await expect(deliverDailyTaskProgressEvent(eventId, [
      { type: 'lesson_complete', increment: 1 },
    ])).resolves.toBe('already-applied');
    await expect(lessonCompleteProgress()).resolves.toBe(1);
  });

  it('replays a prepared event without double increment after the progress write failed', async () => {
    const tasks = await getTodayTasksSafe();
    await loadTodayProgress(tasks);
    const progressKey = dailyTasksProgressKey(getTodayKey());
    const eventId = `lesson-finish:${getTodayKey()}:en:1:attempt_2`;
    let failProgressOnce = true;
    (AsyncStorage.setItem as jest.Mock).mockImplementation((key: string, value: string) => {
      if (key === progressKey && failProgressOnce) {
        failProgressOnce = false;
        return Promise.reject(new Error('progress_write_failed'));
      }
      storage[key] = value;
      return Promise.resolve();
    });

    await expect(deliverDailyTaskProgressEvent(eventId, [
      { type: 'lesson_complete', increment: 1 },
    ])).rejects.toThrow('progress_write_failed');

    installStorageMocks();
    await expect(deliverDailyTaskProgressEvent(eventId, [
      { type: 'lesson_complete', increment: 1 },
    ])).resolves.toBe('applied');
    await expect(lessonCompleteProgress()).resolves.toBe(1);
  });

  it('recovers a prepared event when Daily Challenges load after an interrupted delivery', async () => {
    const tasks = await getTodayTasksSafe();
    await loadTodayProgress(tasks);
    const progressKey = dailyTasksProgressKey(getTodayKey());
    const eventId = `lesson-finish:${getTodayKey()}:en:1:attempt_3`;
    (AsyncStorage.setItem as jest.Mock).mockImplementation((key: string, value: string) => {
      if (key === progressKey) return Promise.reject(new Error('disk_full'));
      storage[key] = value;
      return Promise.resolve();
    });

    await expect(deliverDailyTaskProgressEvent(eventId, [
      { type: 'lesson_complete', increment: 1 },
    ])).rejects.toThrow('disk_full');

    installStorageMocks();
    await expect(lessonCompleteProgress()).resolves.toBe(1);
    await expect(deliverDailyTaskProgressEvent(eventId, [
      { type: 'lesson_complete', increment: 1 },
    ])).resolves.toBe('applied');
    await expect(lessonCompleteProgress()).resolves.toBe(1);
  });

  it('does not resurrect a journal target after the active task set changed', async () => {
    const eventId = `lesson-finish:${getTodayKey()}:en:1:attempt_4`;
    await deliverDailyTaskProgressEvent(eventId, [
      { type: 'lesson_complete', increment: 1 },
    ]);

    delete storage[dailyTasksProgressKey(getTodayKey())];
    storage[dailyTasksAdminOverrideKey()] = JSON.stringify({
      dayKey: getTodayKey(),
      taskIds: ['ra1'],
    });

    const tasks = await getTodayTasksSafe();
    expect(tasks.map((task) => task.id)).toEqual(['ra1']);
    const progress = await loadTodayProgress(tasks);
    expect(progress.some((row) => row.taskId === 'da1')).toBe(false);
    expect(progress.find((row) => row.taskId === 'ra1')).toMatchObject({
      current: 0,
      completed: false,
      claimed: false,
    });
  });

  it('fails closed instead of growing prepared delivery entries without a bound', async () => {
    const progressKey = dailyTasksProgressKey(getTodayKey());
    const deliveryKey = `${progressKey}::delivery_v1`;
    (AsyncStorage.setItem as jest.Mock).mockImplementation((key: string, value: string) => {
      if (key === progressKey) return Promise.reject(new Error('disk_full'));
      storage[key] = value;
      return Promise.resolve();
    });

    for (let index = 0; index < 64; index += 1) {
      await expect(deliverDailyTaskProgressEvent(
        `lesson-finish:${getTodayKey()}:en:1:capacity_${index}`,
        [{ type: 'lesson_complete', increment: 1 }],
      )).rejects.toThrow('disk_full');
    }

    await expect(deliverDailyTaskProgressEvent(
      `lesson-finish:${getTodayKey()}:en:1:capacity_overflow`,
      [{ type: 'lesson_complete', increment: 1 }],
    )).rejects.toThrow('daily_task_progress_delivery_prepared_capacity_exceeded');

    const journal = JSON.parse(storage[deliveryKey]);
    expect(journal.entries).toHaveLength(64);
    expect(journal.entries.every((entry: { status: string }) => entry.status === 'prepared')).toBe(true);
  });
});
