import fs from 'fs';
import path from 'path';
import { __resetAccountGenerationForTests, ensureAccountGeneration } from '../app/account_generation';
import {
  beginDailyTasksScreenRequest,
  commitDailyTasksScreenSnapshot,
  dailyTasksScreenCacheKey,
  invalidateDailyTasksScreenSnapshot,
  isDailyTasksScreenSnapshotVisible,
  patchDailyTasksScreenProgress,
  peekDailyTasksScreenSnapshot,
  resetDailyTasksScreenCacheForTests,
} from '../app/daily_tasks_screen_cache';

const tasks = [{ id: 'task-a', type: 'lesson_complete', title: 'A', description: 'A', target: 1, xp: 10 }] as any;
const progress = [{ taskId: 'task-a', current: 0, completed: false, claimed: false }];

describe('daily tasks screen cache', () => {
  beforeEach(() => {
    __resetAccountGenerationForTests();
    resetDailyTasksScreenCacheForTests();
  });

  it('isolates snapshots by account, day and study target', () => {
    const alice = ensureAccountGeneration('alice');
    const key = dailyTasksScreenCacheKey(alice, '2026-07-11', 'en');
    const request = beginDailyTasksScreenRequest(alice, '2026-07-11', 'en');
    expect(commitDailyTasksScreenSnapshot(request, { tasks, progress, trioShardsClaimed: false, rerollsLeft: 1 }, 1_000)).toBe(true);
    expect(peekDailyTasksScreenSnapshot(alice, '2026-07-11', 'en', 2_000)?.value.tasks).toBe(tasks);
    expect(peekDailyTasksScreenSnapshot(alice, '2026-07-12', 'en')).toBeNull();
    expect(peekDailyTasksScreenSnapshot(alice, '2026-07-11', 'fr')).toBeNull();
    expect(key).not.toBe(dailyTasksScreenCacheKey(ensureAccountGeneration('bob'), '2026-07-11', 'en'));
  });

  it('keeps stale data and evicts the oldest third entry', () => {
    const token = ensureAccountGeneration('alice');
    for (const [index, day] of ['2026-07-11', '2026-07-12', '2026-07-13'].entries()) {
      const request = beginDailyTasksScreenRequest(token, day, 'en');
      expect(commitDailyTasksScreenSnapshot(request, { tasks, progress, trioShardsClaimed: false, rerollsLeft: 1 }, 1_000 + index)).toBe(true);
    }
    expect(peekDailyTasksScreenSnapshot(token, '2026-07-11', 'en', 90_000)).toBeNull();
    expect(peekDailyTasksScreenSnapshot(token, '2026-07-13', 'en', 90_000)?.isFresh).toBe(false);
  });

  it('rejects superseded requests and safely patches optimistic progress', () => {
    const token = ensureAccountGeneration('alice');
    const oldRequest = beginDailyTasksScreenRequest(token, '2026-07-11', 'en');
    const latestRequest = beginDailyTasksScreenRequest(token, '2026-07-11', 'en');
    expect(commitDailyTasksScreenSnapshot(oldRequest, { tasks, progress, trioShardsClaimed: false, rerollsLeft: 1 })).toBe(false);
    expect(commitDailyTasksScreenSnapshot(latestRequest, { tasks, progress, trioShardsClaimed: false, rerollsLeft: 1 })).toBe(true);
    expect(patchDailyTasksScreenProgress(token, '2026-07-11', 'en', 'task-a', { completed: true, claimed: true })).toBe(true);
    expect(peekDailyTasksScreenSnapshot(token, '2026-07-11', 'en')?.value.progress[0]).toMatchObject({ completed: true, claimed: true });
    invalidateDailyTasksScreenSnapshot(token, '2026-07-11', 'en');
    expect(peekDailyTasksScreenSnapshot(token, '2026-07-11', 'en')).toBeNull();
  });

  it('does not let a refresh started before claim restore unclaimed progress', () => {
    const token = ensureAccountGeneration('alice');
    const seed = beginDailyTasksScreenRequest(token, '2026-07-11', 'en');
    expect(commitDailyTasksScreenSnapshot(seed, { tasks, progress, trioShardsClaimed: false, rerollsLeft: 1 })).toBe(true);
    const pending = beginDailyTasksScreenRequest(token, '2026-07-11', 'en');
    expect(patchDailyTasksScreenProgress(token, '2026-07-11', 'en', 'task-a', { completed: true, claimed: true })).toBe(true);
    expect(commitDailyTasksScreenSnapshot(pending, { tasks, progress, trioShardsClaimed: false, rerollsLeft: 1 })).toBe(true);
    expect(peekDailyTasksScreenSnapshot(token, '2026-07-11', 'en')?.value.progress[0]).toMatchObject({ completed: true, claimed: true });
  });

  it('masks every snapshot field when the day key rolls over', () => {
    expect(isDailyTasksScreenSnapshotVisible('account:2026-07-11:en', 'account:2026-07-11:en')).toBe(true);
    expect(isDailyTasksScreenSnapshotVisible('account:2026-07-11:en', 'account:2026-07-12:en')).toBe(false);
    expect(isDailyTasksScreenSnapshotVisible(null, 'account:2026-07-12:en')).toBe(false);
    const screen = fs.readFileSync(path.join(__dirname, '..', 'app', 'daily_tasks_screen.tsx'), 'utf8');
    expect(screen).toContain('setActiveDayKey((previous) => previous === dayKey ? previous : dayKey)');
    expect(screen).not.toContain('if (requestKey !== renderCacheKey) return');
    expect(screen).toContain('const trioShardsClaimed = snapshotVisible ? trioShardsClaimedState : false');
    expect(screen).toContain('const rerollsLeft = snapshotVisible ? rerollsLeftState : 0');
  });
});
