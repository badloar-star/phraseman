import AsyncStorage from '@react-native-async-storage/async-storage';
import { __resetAccountGenerationForTests, ensureAccountGeneration } from '../app/account_generation';
import { getTodayTasks, type DailyTask } from '../app/daily_tasks';
import {
  beginDailyTasksScreenRequest,
  commitDailyTasksScreenSnapshot,
  dailyTasksScreenCacheKey,
  invalidateDailyTasksScreenSnapshot,
  patchDailyTasksScreenProgress,
  peekDailyTasksScreenSnapshot,
  resetDailyTasksScreenCacheForTests,
} from '../app/daily_tasks_screen_cache';
import {
  clearDailyTasksScreenSnapshotOnDisk,
  primeDailyTasksScreenSnapshotFromStorage,
  resetDailyTasksScreenPersistForTests,
} from '../app/daily_tasks_screen_persist';

// Реальные задания из кода: дисковый снапшот хранит только id и восстанавливает
// объекты через findDailyTaskById, поэтому синтетические id здесь не годятся.
const realTasks: DailyTask[] = getTodayTasks().slice(0, 3);

const progressFor = (tasks: DailyTask[]) =>
  tasks.map((task) => ({ taskId: task.id, current: 0, completed: false, claimed: false }));

/** Имитация холодного старта: память процесса пуста, диск остался с прошлой сессии. */
async function simulateColdStart(): Promise<void> {
  resetDailyTasksScreenCacheForTests();
  resetDailyTasksScreenPersistForTests();
  await primeDailyTasksScreenSnapshotFromStorage();
}

describe('daily tasks screen disk snapshot (мгновенное ПЕРВОЕ открытие)', () => {
  beforeEach(async () => {
    __resetAccountGenerationForTests();
    resetDailyTasksScreenCacheForTests();
    resetDailyTasksScreenPersistForTests();
    await AsyncStorage.clear();
  });

  it('после холодного старта отдаёт задания синхронно, без загрузки', async () => {
    const token = ensureAccountGeneration('alice');
    const request = beginDailyTasksScreenRequest(token, '2026-07-26', 'en');
    expect(commitDailyTasksScreenSnapshot(request, {
      tasks: realTasks, progress: progressFor(realTasks), trioShardsClaimed: false, rerollsLeft: 2,
    })).toBe(true);

    await simulateColdStart();
    __resetAccountGenerationForTests();
    const restartToken = ensureAccountGeneration('alice');

    const peeked = peekDailyTasksScreenSnapshot(restartToken, '2026-07-26', 'en');
    expect(peeked?.value.tasks.map((task) => task.id)).toEqual(realTasks.map((task) => task.id));
    expect(peeked?.value.rerollsLeft).toBe(2);
    // Данные видны сразу, но помечены несвежими — фоновый пересчёт всё равно пойдёт.
    expect(peeked?.isFresh).toBe(false);
  });

  it('не отдаёт снапшот чужому аккаунту', async () => {
    const alice = ensureAccountGeneration('alice');
    const request = beginDailyTasksScreenRequest(alice, '2026-07-26', 'en');
    commitDailyTasksScreenSnapshot(request, {
      tasks: realTasks, progress: progressFor(realTasks), trioShardsClaimed: false, rerollsLeft: 1,
    });

    await simulateColdStart();
    __resetAccountGenerationForTests();
    const bob = ensureAccountGeneration('bob');

    expect(peekDailyTasksScreenSnapshot(bob, '2026-07-26', 'en')).toBeNull();
  });

  it('переносит optimistic-клейм через холодный старт', async () => {
    const token = ensureAccountGeneration('alice');
    const request = beginDailyTasksScreenRequest(token, '2026-07-26', 'en');
    commitDailyTasksScreenSnapshot(request, {
      tasks: realTasks, progress: progressFor(realTasks), trioShardsClaimed: false, rerollsLeft: 1,
    });
    const claimedId = realTasks[0].id;
    expect(patchDailyTasksScreenProgress(token, '2026-07-26', 'en', claimedId, {
      completed: true, claimed: true,
    })).toBe(true);

    await simulateColdStart();
    __resetAccountGenerationForTests();
    const restartToken = ensureAccountGeneration('alice');

    const row = peekDailyTasksScreenSnapshot(restartToken, '2026-07-26', 'en')
      ?.value.progress.find((candidate) => candidate.taskId === claimedId);
    expect(row).toMatchObject({ completed: true, claimed: true });
  });

  it('не поднимает набор, устаревший после реролла', async () => {
    const token = ensureAccountGeneration('alice');
    const request = beginDailyTasksScreenRequest(token, '2026-07-26', 'en');
    commitDailyTasksScreenSnapshot(request, {
      tasks: realTasks, progress: progressFor(realTasks), trioShardsClaimed: false, rerollsLeft: 1,
    });
    invalidateDailyTasksScreenSnapshot(token, '2026-07-26', 'en');

    await simulateColdStart();
    __resetAccountGenerationForTests();
    const restartToken = ensureAccountGeneration('alice');

    expect(peekDailyTasksScreenSnapshot(restartToken, '2026-07-26', 'en')).toBeNull();
  });

  it('не поднимает снапшот старше суточного TTL', async () => {
    const token = ensureAccountGeneration('alice');
    const request = beginDailyTasksScreenRequest(token, '2026-07-26', 'en');
    commitDailyTasksScreenSnapshot(request, {
      tasks: realTasks, progress: progressFor(realTasks), trioShardsClaimed: false, rerollsLeft: 1,
    }, 1_000);

    resetDailyTasksScreenCacheForTests();
    resetDailyTasksScreenPersistForTests();
    // 27 часов спустя — снапшот уже не про «сегодня».
    await primeDailyTasksScreenSnapshotFromStorage(1_000 + 27 * 60 * 60_000);
    __resetAccountGenerationForTests();
    const restartToken = ensureAccountGeneration('alice');

    expect(peekDailyTasksScreenSnapshot(restartToken, '2026-07-26', 'en')).toBeNull();
  });

  it('стирает диск при выходе из аккаунта', async () => {
    const token = ensureAccountGeneration('alice');
    const request = beginDailyTasksScreenRequest(token, '2026-07-26', 'en');
    commitDailyTasksScreenSnapshot(request, {
      tasks: realTasks, progress: progressFor(realTasks), trioShardsClaimed: false, rerollsLeft: 1,
    });

    clearDailyTasksScreenSnapshotOnDisk();
    await simulateColdStart();
    __resetAccountGenerationForTests();
    const restartToken = ensureAccountGeneration('alice');

    expect(peekDailyTasksScreenSnapshot(restartToken, '2026-07-26', 'en')).toBeNull();
  });

  it('игнорирует битую запись на диске вместо падения', async () => {
    const token = ensureAccountGeneration('alice');
    const key = dailyTasksScreenCacheKey(token, '2026-07-26', 'en');
    await AsyncStorage.setItem('daily_tasks_screen_snapshot_v1', JSON.stringify([
      { key, taskIds: ['task-which-no-longer-exists'], progress: [], trioShardsClaimed: false, rerollsLeft: 0, writtenAtMs: Date.now() },
      'not-an-object',
    ]));

    await simulateColdStart();
    __resetAccountGenerationForTests();
    const restartToken = ensureAccountGeneration('alice');

    expect(peekDailyTasksScreenSnapshot(restartToken, '2026-07-26', 'en')).toBeNull();
  });
});
