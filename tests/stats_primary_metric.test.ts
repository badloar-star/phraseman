import {
  DEFAULT_STATS_PRIMARY_METRIC,
  STATS_PRIMARY_METRICS,
  isStatsPrimaryMetric,
  normalizeStatsPrimaryMetric,
} from '../app/stats_primary_metric';

describe('statistics primary metric preference', () => {
  it('keeps only XP, time, and the full year', () => {
    expect(STATS_PRIMARY_METRICS).toEqual(['xp', 'time', 'year']);
    expect(isStatsPrimaryMetric('xp')).toBe(true);
    expect(isStatsPrimaryMetric('time')).toBe(true);
    expect(isStatsPrimaryMetric('year')).toBe(true);
    expect(isStatsPrimaryMetric('activity')).toBe(false);
  });

  it('migrates all removed choices to XP', () => {
    expect(DEFAULT_STATS_PRIMARY_METRIC).toBe('xp');
    expect(normalizeStatsPrimaryMetric('activity')).toBe('xp');
    expect(normalizeStatsPrimaryMetric('rhythm')).toBe('xp');
    expect(normalizeStatsPrimaryMetric('learned')).toBe('xp');
  });
});
