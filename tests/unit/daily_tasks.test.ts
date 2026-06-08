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
      const saved: TaskProgress[] = [
        { taskId: 'da1', current: 1, completed: true, claimed: false },
        { taskId: 'ta1', current: 5, completed: false, claimed: false },
        { taskId: 'cs1', current: 3, completed: false, claimed: false },
      ];
      mockStorage.getItem.mockResolvedValue(JSON.stringify(saved));

      const progress = await loadTodayProgress();

      expect(progress).toEqual(saved);
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
      // Use a day where 'da1' and 'daily_active' appears (day 1 → ['da1','ta1','cs1'])
      const origGetDate = Date.prototype.getDate;
      Date.prototype.getDate = function () { return 1; };

      const initial: TaskProgress[] = [
        { taskId: 'da1', current: 0, completed: false, claimed: false },
        { taskId: 'ta1', current: 0, completed: false, claimed: false },
        { taskId: 'cs1', current: 0, completed: false, claimed: false },
      ];
      mockStorage.getItem.mockResolvedValue(JSON.stringify(initial));
      mockStorage.setItem.mockResolvedValue(undefined);

      const { allProgress } = await updateTaskProgress('daily_active', 1);

      Date.prototype.getDate = origGetDate;

      const da1 = allProgress.find(p => p.taskId === 'da1')!;
      expect(da1.current).toBe(1);
      expect(da1.completed).toBe(true);
    });

    it('does not exceed target value', async () => {
      const origGetDate = Date.prototype.getDate;
      Date.prototype.getDate = function () { return 1; };

      const initial: TaskProgress[] = [
        { taskId: 'da1', current: 0, completed: false, claimed: false },
        { taskId: 'ta1', current: 0, completed: false, claimed: false },
        { taskId: 'cs1', current: 0, completed: false, claimed: false },
      ];
      mockStorage.getItem.mockResolvedValue(JSON.stringify(initial));
      mockStorage.setItem.mockResolvedValue(undefined);

      const { allProgress } = await updateTaskProgress('daily_active', 100);

      Date.prototype.getDate = origGetDate;

      const da1 = allProgress.find(p => p.taskId === 'da1')!;
      expect(da1.current).toBeLessThanOrEqual(da1.current); // capped at target=1
      expect(da1.current).toBe(1);
    });

    it('skips already-completed tasks', async () => {
      const origGetDate = Date.prototype.getDate;
      Date.prototype.getDate = function () { return 1; };

      const initial: TaskProgress[] = [
        { taskId: 'da1', current: 1, completed: true, claimed: false },
        { taskId: 'ta1', current: 0, completed: false, claimed: false },
        { taskId: 'cs1', current: 0, completed: false, claimed: false },
      ];
      mockStorage.getItem.mockResolvedValue(JSON.stringify(initial));
      mockStorage.setItem.mockResolvedValue(undefined);

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
      const origGetDate = Date.prototype.getDate;
      Date.prototype.getDate = function () { return 1; };

      const initial: TaskProgress[] = [
        { taskId: 'da1', current: 0, completed: false, claimed: false },
        { taskId: 'ta1', current: 5, completed: false, claimed: false },
        { taskId: 'cs1', current: 3, completed: false, claimed: false },
      ];
      mockStorage.getItem.mockResolvedValue(JSON.stringify(initial));
      mockStorage.setItem.mockResolvedValue(undefined);

      await resetTaskProgress('total_answers');

      Date.prototype.getDate = origGetDate;

      const saved = JSON.parse(mockStorage.setItem.mock.calls[0][1] as string) as TaskProgress[];
      const ta1 = saved.find(p => p.taskId === 'ta1')!;
      expect(ta1.current).toBe(0);
    });

    it('does not reset completed or claimed tasks', async () => {
      const origGetDate = Date.prototype.getDate;
      Date.prototype.getDate = function () { return 1; };

      const initial: TaskProgress[] = [
        { taskId: 'da1', current: 1, completed: true, claimed: true },
        { taskId: 'ta1', current: 10, completed: true, claimed: false },
        { taskId: 'cs1', current: 3, completed: false, claimed: false },
      ];
      mockStorage.getItem.mockResolvedValue(JSON.stringify(initial));
      mockStorage.setItem.mockResolvedValue(undefined);

      await resetTaskProgress('total_answers');

      Date.prototype.getDate = origGetDate;

      const saved = JSON.parse(mockStorage.setItem.mock.calls[0][1] as string) as TaskProgress[];
      const ta1 = saved.find(p => p.taskId === 'ta1')!;
      // completed=true, so should NOT be reset
      expect(ta1.current).toBe(10);
    });
  });

  // ── claimTask ─────────────────────────────────────────────────────────────

  describe('claimTask', () => {
    it('marks a completed task as claimed', async () => {
      const initial: TaskProgress[] = [
        { taskId: 'da1', current: 1, completed: true, claimed: false },
        { taskId: 'ta1', current: 0, completed: false, claimed: false },
        { taskId: 'cs1', current: 0, completed: false, claimed: false },
      ];
      mockStorage.getItem.mockResolvedValue(JSON.stringify(initial));
      mockStorage.setItem.mockResolvedValue(undefined);

      await claimTask('da1');

      const saved = JSON.parse(mockStorage.setItem.mock.calls[0][1] as string) as TaskProgress[];
      const da1 = saved.find(p => p.taskId === 'da1')!;
      expect(da1.claimed).toBe(true);
    });

    it('does not affect other tasks when claiming', async () => {
      const initial: TaskProgress[] = [
        { taskId: 'da1', current: 1, completed: true, claimed: false },
        { taskId: 'ta1', current: 0, completed: false, claimed: false },
        { taskId: 'cs1', current: 0, completed: false, claimed: false },
      ];
      mockStorage.getItem.mockResolvedValue(JSON.stringify(initial));
      mockStorage.setItem.mockResolvedValue(undefined);

      await claimTask('da1');

      const saved = JSON.parse(mockStorage.setItem.mock.calls[0][1] as string) as TaskProgress[];
      const ta1 = saved.find(p => p.taskId === 'ta1')!;
      expect(ta1.claimed).toBe(false);
    });
  });
});
