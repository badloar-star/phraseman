import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  deliverDailyTaskProgressEvent,
  getTodayKey,
  getTodayTasksSafe,
  loadTodayProgress,
} from '../app/daily_tasks';
import { dailyTasksProgressKey } from '../app/target_storage_keys';

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
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-05-02T12:00:00Z'));
  Object.keys(storage).forEach((key) => delete storage[key]);
  installStorageMocks();
  storage.user_total_xp = '0';
});

afterEach(() => {
  jest.useRealTimers();
});

async function lessonCompleteProgress(): Promise<number> {
  const tasks = await getTodayTasksSafe();
  const lessonTask = tasks.find((task) => task.type === 'lesson_complete');
  expect(lessonTask).toBeDefined();
  const progress = await loadTodayProgress(tasks);
  return progress.find((row) => row.taskId === lessonTask?.id)?.current ?? -1;
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
});
