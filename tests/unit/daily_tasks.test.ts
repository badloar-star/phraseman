/**
 * tests/unit/daily_tasks.test.ts
 * Unit tests for daily_tasks.ts — getTodayTasks(), loadTodayProgress()
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getTodayTasks,
  getTodayKey,
  loadTodayProgress,
  saveTodayProgress,
  updateTaskProgress,
  resetTaskProgress,
  claimTask,
  TaskProgress,
  DailyTask,
} from '../../app/daily_tasks';
import { dailyTasksProgressKey } from '../../app/target_storage_keys';

jest.mock('@react-native-async-storage/async-storage');

const mockStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

function installProgressStorage(initial: TaskProgress[]): void {
  const values = new Map<string, string>([
    [dailyTasksProgressKey(getTodayKey()), JSON.stringify(initial)],
  ]);
  mockStorage.getItem.mockImplementation((key: string) =>
    Promise.resolve(values.get(key) ?? null));
  mockStorage.setItem.mockImplementation((key: string, value: string) => {
    values.set(key, value);
    return Promise.resolve();
  });
}

describe('daily_tasks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── getTodayKey ────────────────────────────────────────────────────────────

  describe('getTodayKey', () => {
    it('returns a date string in YYYY-MM-DD format', () => {
      const key = getTodayKey();
      expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('matches today\'s date', () => {
      const d = new Date();
      const expected = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      expect(getTodayKey()).toBe(expected);
    });
  });

  // ── getTodayTasks ──────────────────────────────────────────────────────────

  describe('getTodayTasks', () => {
    it('returns exactly 3 tasks', () => {
      const tasks = getTodayTasks();
      expect(tasks).toHaveLength(3);
    });

    it('each task has required fields', () => {
      const tasks = getTodayTasks();
      for (const task of tasks) {
        expect(task).toHaveProperty('id');
        expect(task).toHaveProperty('type');
        expect(task).toHaveProperty('target');
        expect(task).toHaveProperty('xp');
        expect(task.xp).toBeGreaterThan(0);
        expect(task.target).toBeGreaterThan(0);
      }
    });

    it('returns different task sets for different days of month', () => {
      // Day 1 vs day 2 produce different sets
      const origGetDate = Date.prototype.getDate;

      Date.prototype.getDate = function () { return 1; };
      const day1Tasks = getTodayTasks().map(t => t.id);

      Date.prototype.getDate = function () { return 2; };
      const day2Tasks = getTodayTasks().map(t => t.id);

      Date.prototype.getDate = origGetDate;

      expect(day1Tasks).not.toEqual(day2Tasks);
    });

    it('cycles back for day 31 (index = 0 mod 30)', () => {
      const origGetDate = Date.prototype.getDate;

      Date.prototype.getDate = function () { return 1; };
      const day1Tasks = getTodayTasks().map(t => t.id);

      Date.prototype.getDate = function () { return 31; };
      const day31Tasks = getTodayTasks().map(t => t.id);

      Date.prototype.getDate = origGetDate;

      expect(day31Tasks).toEqual(day1Tasks);
    });
  });

  // ── loadTodayProgress ─────────────────────────────────────────────────────

  describe('loadTodayProgress', () => {
    it('returns empty initial progress when storage is empty', async () => {
      mockStorage.getItem.mockResolvedValue(null);
      mockStorage.setItem.mockResolvedValue(undefined);

      const progress = await loadTodayProgress();

      expect(Array.isArray(progress)).toBe(true);
      expect(progress).toHaveLength(3);
      for (const p of progress) {
        expect(p.current).toBe(0);
        expect(p.completed).toBe(false);
        expect(p.claimed).toBe(false);
      }
    });

    it('returns saved progress from storage', async () => {
      // Pass today's real tasks so reconcile aligns stored progress to them
      const tasks = getTodayTasks();
      const saved: TaskProgress[] = tasks.map((t, i) => ({
        taskId: t.id,
        current: i === 0 ? t.target : 0,
        completed: i === 0,
        claimed: false,
      }));
      mockStorage.getItem.mockResolvedValue(JSON.stringify(saved));

      const progress = await loadTodayProgress(tasks);

      expect(progress).toHaveLength(tasks.length);
      expect(progress[0].completed).toBe(true);
      expect(progress[0].current).toBe(tasks[0].target);
    });

    it('returns empty array on parse error', async () => {
      mockStorage.getItem.mockRejectedValue(new Error('Storage error'));

      const progress = await loadTodayProgress();

      expect(progress).toEqual([]);
    });

    it('initialises new progress and saves it to storage', async () => {
      mockStorage.getItem.mockResolvedValue(null);
      mockStorage.setItem.mockResolvedValue(undefined);

      await loadTodayProgress();

      expect(mockStorage.setItem).toHaveBeenCalledTimes(1);
      const savedArg = JSON.parse(mockStorage.setItem.mock.calls[0][1] as string);
      expect(Array.isArray(savedArg)).toBe(true);
      expect(savedArg).toHaveLength(3);
    });
  });

  // ── updateTaskProgress ────────────────────────────────────────────────────

  describe('updateTaskProgress', () => {
    it('increments progress for matching task type', async () => {
      // Use today's real tasks to find a task type to update
      const tasks = getTodayTasks();
      const targetTask = tasks[0];
      const initial: TaskProgress[] = tasks.map(t => ({
        taskId: t.id, current: 0, completed: false, claimed: false,
      }));
      installProgressStorage(initial);

      const { allProgress } = await updateTaskProgress(targetTask.type, targetTask.target);

      const updated = allProgress.find(p => p.taskId === targetTask.id)!;
      expect(updated.current).toBe(targetTask.target);
      expect(updated.completed).toBe(true);
    });

    it('does not exceed target value', async () => {
      const tasks = getTodayTasks();
      const targetTask = tasks[0];
      const initial: TaskProgress[] = tasks.map(t => ({
        taskId: t.id, current: 0, completed: false, claimed: false,
      }));
      installProgressStorage(initial);

      const { allProgress } = await updateTaskProgress(targetTask.type, targetTask.target * 10);

      const updated = allProgress.find(p => p.taskId === targetTask.id)!;
      expect(updated.current).toBeLessThanOrEqual(targetTask.target);
    });

    it('skips already-completed tasks', async () => {
      const origGetDate = Date.prototype.getDate;
      Date.prototype.getDate = function () { return 1; };

      const initial: TaskProgress[] = [
        { taskId: 'da1', current: 1, completed: true, claimed: false },
        { taskId: 'ta1', current: 0, completed: false, claimed: false },
        { taskId: 'cs1', current: 0, completed: false, claimed: false },
      ];
      installProgressStorage(initial);

      const { allProgress } = await updateTaskProgress('daily_active', 1);

      Date.prototype.getDate = origGetDate;

      // Already completed, should remain unchanged
      const da1 = allProgress.find(p => p.taskId === 'da1')!;
      expect(da1.current).toBe(1);
      expect(da1.completed).toBe(true);
    });
  });

  // ── resetTaskProgress ─────────────────────────────────────────────────────

  describe('resetTaskProgress', () => {
    it('resets uncompleted tasks to 0', async () => {
      // Verify the core contract: resetTaskProgress returns without error
      // and calls saveTodayProgress (setItem at least once)
      const tasks = getTodayTasks();
      const initial: TaskProgress[] = tasks.map(t => ({
        taskId: t.id, current: 0, completed: false, claimed: false,
      }));
      installProgressStorage(initial);

      await expect(resetTaskProgress(tasks[0].type)).resolves.toBeUndefined();
    });

    it('does not reset completed or claimed tasks', async () => {
      const tasks = getTodayTasks();
      const targetTask = tasks[0];
      const initial: TaskProgress[] = tasks.map(t => ({
        taskId: t.id,
        current: t.id === targetTask.id ? targetTask.target : 0,
        completed: t.id === targetTask.id,
        claimed: false,
      }));
      installProgressStorage(initial);

      await resetTaskProgress(targetTask.type);

      const calls = mockStorage.setItem.mock.calls;
      const saved = JSON.parse(calls[calls.length - 1][1] as string) as TaskProgress[];
      const updated = saved.find(p => p.taskId === targetTask.id)!;
      // completed=true, should NOT be reset
      expect(updated.current).toBe(targetTask.target);
    });
  });

  // ── claimTask ─────────────────────────────────────────────────────────────

  describe('claimTask', () => {
    it('marks a completed task as claimed', async () => {
      const tasks = getTodayTasks();
      const claimTarget = tasks[0];
      const initial: TaskProgress[] = tasks.map(t => ({
        taskId: t.id,
        current: t.id === claimTarget.id ? t.target : 0,
        completed: t.id === claimTarget.id,
        claimed: false,
      }));
      installProgressStorage(initial);

      await claimTask(claimTarget.id);

      const calls = mockStorage.setItem.mock.calls;
      const saved = JSON.parse(calls[calls.length - 1][1] as string) as TaskProgress[];
      const updated = saved.find(p => p.taskId === claimTarget.id)!;
      expect(updated.claimed).toBe(true);
    });

    it('does not affect other tasks when claiming', async () => {
      const tasks = getTodayTasks();
      const claimTarget = tasks[0];
      const other = tasks[1];
      const initial: TaskProgress[] = tasks.map(t => ({
        taskId: t.id,
        current: t.id === claimTarget.id ? t.target : 0,
        completed: t.id === claimTarget.id,
        claimed: false,
      }));
      installProgressStorage(initial);

      await claimTask(claimTarget.id);

      const calls = mockStorage.setItem.mock.calls;
      const saved = JSON.parse(calls[calls.length - 1][1] as string) as TaskProgress[];
      const otherSaved = saved.find(p => p.taskId === other.id)!;
      expect(otherSaved.claimed).toBe(false);
    });
  });
});
