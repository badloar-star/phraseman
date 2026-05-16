import {
  computeActivity365Analytics,
  levelForFilter,
  valueForFilter,
} from '../app/activity_365_analytics';

describe('activity 365 analytics', () => {
  it('computes streaks, months, score and goal forecast from deterministic data', () => {
    const statsMap: Record<string, { points: number }> = {};
    const fgDaily: Record<string, number> = {};
    const breakdown: Record<string, any> = {};
    for (let day = 1; day <= 10; day++) {
      const key = `2026-05-${String(day).padStart(2, '0')}`;
      statsMap[key] = { points: day * 10 };
      fgDaily[key] = 5 * 60_000;
      breakdown[key] = {
        words_learned: day,
        phrases_learned: day + 1,
        quizzes_completed: day % 2,
      };
    }
    delete statsMap['2026-05-05'];
    delete fgDaily['2026-05-05'];
    delete breakdown['2026-05-05'];

    const analytics = computeActivity365Analytics({
      statsMap,
      fgDaily,
      breakdown,
      goal: 100,
      now: new Date('2026-05-10T12:00:00Z'),
    });

    expect(analytics.days).toHaveLength(365);
    expect(analytics.activeDays).toBe(9);
    expect(analytics.currentStreak).toBe(5);
    expect(analytics.longestStreak).toBe(5);
    expect(analytics.biggestGap).toBeGreaterThanOrEqual(1);
    expect(analytics.bestMonth?.key).toBe('2026-05');
    expect(analytics.consistencyScore).toBeGreaterThan(0);
    expect(analytics.goal.remainingDays).toBe(91);
    expect(analytics.goal.forecastDate).toBe('2026-08-20');
    expect(analytics.goal.requiredDaysPerWeek).toBe(1.8);
  });

  it('uses the observed activity window for goal pace, not a full stale 365-day denominator', () => {
    const analytics = computeActivity365Analytics({
      statsMap: {
        '2026-05-01': { points: 20 },
        '2026-05-02': { points: 20 },
        '2026-05-03': { points: 20 },
        '2026-05-04': { points: 20 },
        '2026-05-05': { points: 20 },
      },
      fgDaily: {},
      breakdown: {},
      goal: 100,
      now: new Date('2026-05-05T12:00:00Z'),
    });

    expect(analytics.activeDays).toBe(5);
    expect(analytics.goal.forecastDate).toBe('2026-08-08');
    expect(analytics.goal.requiredDaysPerWeek).toBe(1.8);
  });

  it('uses type filters from daily breakdown metrics', () => {
    const analytics = computeActivity365Analytics({
      statsMap: {
        '2026-05-09': { points: 10 },
        '2026-05-10': { points: 30 },
      },
      fgDaily: {},
      breakdown: {
        '2026-05-09': { quizzes_completed: 0, arena_wins: 2, arena_losses: 1 },
        '2026-05-10': { quizzes_completed: 4, arena_wins: 0, arena_losses: 0 },
      },
      goal: 180,
      now: new Date('2026-05-10T12:00:00Z'),
    });

    const yesterday = analytics.days.find(day => day.date === '2026-05-09')!;
    const today = analytics.days.find(day => day.date === '2026-05-10')!;

    expect(valueForFilter(yesterday, 'arena')).toBe(3);
    expect(valueForFilter(today, 'quizzes')).toBe(4);
    expect(levelForFilter(analytics.days, today, 'quizzes')).toBeGreaterThan(0);
    expect(levelForFilter(analytics.days, yesterday, 'quizzes')).toBe(0);
  });
});
