import {
  dailyTaskProgressCurrent,
  dailyTaskProgressFraction,
} from '../app/daily_task_progress_ui';

describe('daily task progress presentation', () => {
  const task = { id: 'ra1', target: 5 } as never;

  it('fills a completed task to the end even when legacy current is below target', () => {
    expect(dailyTaskProgressFraction(task, {
      taskId: 'ra1',
      current: 3,
      completed: true,
      claimed: false,
    })).toBe(1);
  });

  it('shows target over target for a completed legacy row', () => {
    expect(dailyTaskProgressCurrent(task, {
      taskId: 'ra1',
      current: 3,
      completed: true,
      claimed: false,
    })).toBe(5);
  });

  it('clamps in-progress task fill to its target', () => {
    expect(dailyTaskProgressFraction(task, {
      taskId: 'ra1',
      current: 2,
      completed: false,
      claimed: false,
    })).toBe(0.4);
  });
});
