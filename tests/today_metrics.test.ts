import { selectDaysSinceLearningFromActivity, selectTodayMetricsFromActivity } from '../lib/today/today_metrics';

describe('Today metrics', () => {
  it('selects the real current UTC day totals from Activity365', () => {
    const metrics = selectTodayMetricsFromActivity([
      { date: '2026-07-12', xp: 20, minutes: 4, metrics: { lessons: 1 } },
      { date: '2026-07-13', xp: 140, minutes: 18, metrics: { lessons: 2 } },
    ], Date.parse('2026-07-13T16:00:00Z'));

    expect(metrics).toEqual({ minutes: 18, xp: 140, lessons: 2 });
  });

  it('uses honest zeroes when the current day has no activity', () => {
    expect(selectTodayMetricsFromActivity([], Date.parse('2026-07-13T16:00:00Z')))
      .toEqual({ minutes: 0, xp: 0, lessons: 0 });
  });
});

describe('Today days-since-learning', () => {
  const nowMs = Date.parse('2026-07-25T16:00:00Z');

  it('returns null when the learner was active yesterday (no gap)', () => {
    const days = [
      { date: '2026-07-23', active: false },
      { date: '2026-07-24', active: true },
      { date: '2026-07-25', active: false, future: false },
    ];
    expect(selectDaysSinceLearningFromActivity(days, nowMs)).toBeNull();
  });

  it('counts consecutive inactive days back from yesterday', () => {
    const days = [
      { date: '2026-07-20', active: true },
      { date: '2026-07-21', active: false },
      { date: '2026-07-22', active: false },
      { date: '2026-07-23', active: false },
      { date: '2026-07-24', active: false },
      { date: '2026-07-25', active: false },
    ];
    expect(selectDaysSinceLearningFromActivity(days, nowMs)).toBe(4);
  });

  it('returns null when there is no activity history at all', () => {
    expect(selectDaysSinceLearningFromActivity([], nowMs)).toBeNull();
  });

  it('ignores future placeholder days from the 365-day window', () => {
    const days = [
      { date: '2026-07-24', active: true },
      { date: '2026-07-25', active: false },
      { date: '2026-07-26', active: false, future: true },
    ];
    expect(selectDaysSinceLearningFromActivity(days, nowMs)).toBeNull();
  });
});
