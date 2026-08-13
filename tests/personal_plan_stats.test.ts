import {
  activeDayKeys,
  longestStreak,
  trailingStreak,
  buildPersonalPlanStats,
} from '../app/personal_plan_stats';
import { getPlanById } from '../app/personal_plan_catalog';
import { planTaskCompletionKey } from '../app/personal_plan_progress';

describe('personal_plan_stats helpers', () => {
  it('activeDayKeys extracts unique sorted days for the instance', () => {
    const completed = {
      'inst1::t1': { completedAt: '2026-06-01T10:00:00Z', taskId: 't1' },
      'inst1::t2': { completedAt: '2026-06-01T11:00:00Z', taskId: 't2' },
      'inst1::t3': { completedAt: '2026-06-03T09:00:00Z', taskId: 't3' },
      'inst2::t9': { completedAt: '2026-06-05T09:00:00Z', taskId: 't9' },
    };
    expect(activeDayKeys(completed, 'inst1')).toEqual(['2026-06-01', '2026-06-03']);
  });

  it('longestStreak finds the longest consecutive run', () => {
    expect(longestStreak(['2026-06-01', '2026-06-02', '2026-06-03', '2026-06-05'])).toBe(3);
    expect(longestStreak([])).toBe(0);
    expect(longestStreak(['2026-06-01'])).toBe(1);
  });

  it('trailingStreak counts the run ending at the latest day', () => {
    expect(trailingStreak(['2026-06-01', '2026-06-03', '2026-06-04', '2026-06-05'])).toBe(3);
    expect(trailingStreak(['2026-06-01', '2026-06-03'])).toBe(1);
  });

  it('trailingStreak with todayKey resets when the latest active day is stale', () => {
    const days = ['2026-06-03', '2026-06-04', '2026-06-05'];
    // Latest active day IS today → full run of 3.
    expect(trailingStreak(days, '2026-06-05')).toBe(3);
    // Latest active day was yesterday → still counts.
    expect(trailingStreak(days, '2026-06-06')).toBe(3);
    // Gap of 2+ days since last activity → current streak is broken → 0.
    expect(trailingStreak(days, '2026-06-08')).toBe(0);
    expect(trailingStreak(days, '2026-06-20')).toBe(0);
  });
});

describe('buildPersonalPlanStats', () => {
  it('computes weeks and totals for a real plan', () => {
    const plan = getPlanById('mitap');
    const instanceId = 'test-instance';
    // Complete all tasks of day 1
    const day1 = plan.days[0];
    const completed: Record<string, any> = {};
    for (const t of day1.tasks) {
      completed[planTaskCompletionKey(instanceId, t.id)] = {
        completedAt: '2026-06-01T10:00:00Z', taskId: t.id, dayIndex: 1,
      };
    }
    const stats = buildPersonalPlanStats({
      plan, planInstanceId: instanceId, currentDayIndex: 1,
      minutesPerDay: 15, completedTasks: completed,
    });
    console.log(`plan=${stats.planName} totalDays=${stats.totalDays} weeks=${stats.weeks.length} overall=${stats.overallProgressPct}% activeDays=${stats.activeDaysCount} streak=${stats.currentStreakDays} completed=${stats.completedTasksTotal}/${stats.totalTasksTotal}`);
    expect(stats.totalDays).toBeGreaterThan(0);
    expect(stats.weeks.length).toBeGreaterThan(0);
    expect(stats.completedTasksTotal).toBeGreaterThan(0);
    expect(stats.activeDaysCount).toBe(1);
    expect(stats.weeks[0].weekIndex).toBe(1);
    expect(stats.overallProgressPct).toBeGreaterThanOrEqual(0);
    expect(stats.overallProgressPct).toBeLessThanOrEqual(100);
  });
});
