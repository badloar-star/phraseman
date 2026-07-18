import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  activity365MonthGridCells,
  activity365ObservedMonthKeys,
  activity365NextStepKind,
  computeActivity365Analytics,
  invalidateActivity365Cache,
  levelForFilter,
  loadActivity365Analytics,
  valueForFilter,
} from '../app/activity_365_analytics';
import { statsDailyBreakdownKey } from '../app/target_storage_keys';

describe('activity 365 analytics', () => {
  beforeEach(() => {
    (AsyncStorage as any).__reset?.();
    invalidateActivity365Cache();
  });

  it('keeps cached daily lesson totals isolated by study target', async () => {
    const today = new Date().toISOString().slice(0, 10);
    await AsyncStorage.multiSet([
      [statsDailyBreakdownKey('en'), JSON.stringify({ [today]: { lessons_completed: 1 } })],
      [statsDailyBreakdownKey('fr'), JSON.stringify({ [today]: { lessons_completed: 3 } })],
    ]);

    const english = await loadActivity365Analytics('en');
    const french = await loadActivity365Analytics('fr');

    expect(english.days.find(day => day.date === today)?.metrics.lessons).toBe(1);
    expect(french.days.find(day => day.date === today)?.metrics.lessons).toBe(3);
  });
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
        lessons_completed: day % 2,
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
      goalChosen: true,
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
      goalChosen: true,
      now: new Date('2026-05-05T12:00:00Z'),
    });

    expect(analytics.activeDays).toBe(5);
    expect(analytics.goal.forecastDate).toBe('2026-08-08');
    expect(analytics.goal.requiredDaysPerWeek).toBe(1.8);
  });

  it('hides the forecast until the user explicitly picks a year goal', () => {
    const base = {
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
    };
    const notChosen = computeActivity365Analytics(base);
    expect(notChosen.goal.chosen).toBe(false);
    expect(notChosen.goal.forecastDate).toBeNull();

    const chosen = computeActivity365Analytics({ ...base, goalChosen: true });
    expect(chosen.goal.chosen).toBe(true);
    expect(chosen.goal.forecastDate).toBe('2026-08-08');
  });

  it('treats a fresh one-day account as warmup instead of a missed-rhythm state', () => {
    const analytics = computeActivity365Analytics({
      statsMap: {
        '2026-05-21': { points: 385 },
      },
      fgDaily: {
        '2026-05-21': 16 * 60_000,
      },
      breakdown: {
        '2026-05-21': { phrases_learned: 2 },
      },
      goal: 180,
      now: new Date('2026-05-21T22:33:00Z'),
    });

    expect(analytics.activeDays).toBe(1);
    expect(analytics.currentStreak).toBe(1);
    expect(analytics.insights[0]?.kind).toBe('warmup');
    expect(activity365NextStepKind(analytics.activeDays, analytics.currentStreak)).toBe('warmup');
  });

  it('counts a completed personal-plan task as an active day even without XP', () => {
    const analytics = computeActivity365Analytics({
      statsMap: {},
      fgDaily: {},
      breakdown: {
        '2026-05-21': { plan_tasks_completed: 1 },
      },
      goal: 100,
      goalChosen: true,
      now: new Date('2026-05-21T12:00:00Z'),
    });

    const today = analytics.days.find(day => day.date === '2026-05-21')!;
    expect(today.active).toBe(true);
    expect(today.level).toBeGreaterThan(0);
    expect(today.metrics.planTasksCompleted).toBe(1);
    expect(analytics.activeDays).toBe(1);
    expect(analytics.goal.activeDays).toBe(1);
    expect(analytics.goal.remainingDays).toBe(99);
  });

  it('counts completed lessons directly instead of treating learned phrases as lessons', () => {
    const analytics = computeActivity365Analytics({
      statsMap: {},
      fgDaily: {},
      breakdown: {
        '2026-05-21': { lessons_completed: 2, words_learned: 8, phrases_learned: 12 },
      },
      goal: 180,
      now: new Date('2026-05-21T12:00:00Z'),
    });

    const today = analytics.days.find(day => day.date === '2026-05-21')!;
    expect(today.metrics.lessons).toBe(2);
  });

  it('uses a softer build-week next step after the warmup phase', () => {
    expect(activity365NextStepKind(0, 0)).toBe('first_day');
    expect(activity365NextStepKind(2, 2)).toBe('warmup');
    expect(activity365NextStepKind(3, 3)).toBe('build_week');
    expect(activity365NextStepKind(8, 4)).toBe('continue_streak');
    expect(activity365NextStepKind(8, 0)).toBe('restart');
  });

  it('uses type filters from daily breakdown metrics', () => {
    const analytics = computeActivity365Analytics({
      statsMap: {
        '2026-05-09': { points: 10 },
        '2026-05-10': { points: 30 },
      },
      fgDaily: {},
      breakdown: {
        '2026-05-09': { lessons_completed: 2, flashcards_saved: 1 },
        '2026-05-10': { lessons_completed: 4, flashcards_saved: 3 },
      },
      goal: 180,
      now: new Date('2026-05-10T12:00:00Z'),
    });

    const yesterday = analytics.days.find(day => day.date === '2026-05-09')!;
    const today = analytics.days.find(day => day.date === '2026-05-10')!;

    expect(valueForFilter(yesterday, 'review')).toBe(1);
    expect(valueForFilter(today, 'lessons')).toBe(4);
    expect(levelForFilter(analytics.days, today, 'lessons')).toBeGreaterThan(0);
    expect(levelForFilter(analytics.days, yesterday, 'review')).toBeGreaterThan(0);
  });

  it('keeps the monthly calendar on observed months instead of future padding months', () => {
    const analytics = computeActivity365Analytics({
      statsMap: {
        '2026-06-29': { points: 20 },
        '2026-06-30': { points: 35 },
      },
      fgDaily: {},
      breakdown: {},
      goal: 180,
      now: new Date('2026-06-30T12:00:00Z'),
    });

    expect(analytics.days.some(day => day.future && day.date.startsWith('2027-06'))).toBe(true);

    const monthKeys = activity365ObservedMonthKeys(analytics.days);
    expect(monthKeys[monthKeys.length - 1]).toBe('2026-06');
    expect(monthKeys).not.toContain('2027-06');
  });

  it('fills the visible month calendar with empty clickable past days while preserving XP days', () => {
    const analytics = computeActivity365Analytics({
      statsMap: {
        '2026-06-29': { points: 20 },
        '2026-06-30': { points: 35 },
      },
      fgDaily: {},
      breakdown: {},
      goal: 180,
      now: new Date('2026-06-30T12:00:00Z'),
    });

    const grid = activity365MonthGridCells(analytics.days, '2026-06', '2026-06-30');
    const monthDays = grid.cells.flatMap(cell => cell.day ? [cell.day] : []);

    expect(grid.month).toBe(6);
    expect(monthDays).toHaveLength(30);
    expect(monthDays.find(day => day.date === '2026-06-01')).toMatchObject({
      xp: 0,
      active: false,
      future: false,
    });
    expect(monthDays.find(day => day.date === '2026-06-29')).toMatchObject({
      xp: 20,
      active: true,
      future: false,
    });
  });
});
