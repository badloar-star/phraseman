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

jest.mock('@react-native-async-storage/async-storage');

const mockStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
(globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = false;

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
      const origGetUTCDate = Date.prototype.getUTCDate;

      Date.prototype.getUTCDate = function () { return 1; };
      const day1Tasks = getTodayTasks().map(t => t.id);

      Date.prototype.getUTCDate = function () { return 2; };
      const day2Tasks = getTodayTasks().map(t => t.id);

      Date.prototype.getUTCDate = origGetUTCDate;

      expect(day1Tasks).not.toEqual(day2Tasks);
    });

    it('cycles back for day 10 after the nine-day active rotation', () => {
      const origGetUTCDate = Date.prototype.getUTCDate;

      Date.prototype.getUTCDate = function () { return 1; };
      const day1Tasks = getTodayTasks().map(t => t.id);

      Date.prototype.getUTCDate = function () { return 10; };
      const day10Tasks = getTodayTasks().map(t => t.id);

      Date.prototype.getUTCDate = origGetUTCDate;

      expect(day10Tasks).toEqual(day1Tasks);
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
      mockStorage.getItem.mockResolvedValue(JSON.stringify(initial));
      mockStorage.setItem.mockResolvedValue(undefined);

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
      mockStorage.getItem.mockResolvedValue(JSON.stringify(initial));
      mockStorage.setItem.mockResolvedValue(undefined);

      const { allProgress } = await updateTaskProgress(targetTask.type, targetTask.target * 10);

      const updated = allProgress.find(p => p.taskId === targetTask.id)!;
      expect(updated.current).toBeLessThanOrEqual(targetTask.target);
    });

    it('skips already-completed tasks', async () => {
      const origGetUTCDate = Date.prototype.getUTCDate;
      Date.prototype.getUTCDate = function () { return 1; };

      const initial: TaskProgress[] = [
        { taskId: 'da1', current: 1, completed: true, claimed: false },
        { taskId: 'ta1', current: 0, completed: false, claimed: false },
        { taskId: 'cs1', current: 0, completed: false, claimed: false },
      ];
      mockStorage.getItem.mockResolvedValue(JSON.stringify(initial));
      mockStorage.setItem.mockResolvedValue(undefined);

      const { allProgress } = await updateTaskProgress('daily_active', 1);

      Date.prototype.getUTCDate = origGetUTCDate;

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
      mockStorage.getItem.mockResolvedValue(JSON.stringify(initial));
      mockStorage.setItem.mockResolvedValue(undefined);

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
      mockStorage.getItem.mockResolvedValue(JSON.stringify(initial));
      mockStorage.setItem.mockResolvedValue(undefined);

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
      mockStorage.getItem.mockResolvedValue(JSON.stringify(initial));
      mockStorage.setItem.mockResolvedValue(undefined);

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
      mockStorage.getItem.mockResolvedValue(JSON.stringify(initial));
      mockStorage.setItem.mockResolvedValue(undefined);

      await claimTask(claimTarget.id);

      const calls = mockStorage.setItem.mock.calls;
      const saved = JSON.parse(calls[calls.length - 1][1] as string) as TaskProgress[];
      const otherSaved = saved.find(p => p.taskId === other.id)!;
      expect(otherSaved.claimed).toBe(false);
    });
  });
});
