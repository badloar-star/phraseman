import { selectTodayMetricsFromActivity } from '../lib/today/today_metrics';

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
