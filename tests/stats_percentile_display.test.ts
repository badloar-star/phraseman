import { MIN_VISIBLE_PERCENTILE, visiblePercentile } from '../app/stats_percentile_display';

describe('stats percentile display threshold', () => {
  it('hides percentiles below the visible threshold', () => {
    expect(visiblePercentile(MIN_VISIBLE_PERCENTILE - 1)).toBeNull();
  });

  it('shows percentiles starting from 50 percent', () => {
    expect(visiblePercentile(MIN_VISIBLE_PERCENTILE)).toBe(MIN_VISIBLE_PERCENTILE);
    expect(visiblePercentile(73)).toBe(73);
  });

  it('hides empty or inapplicable metrics', () => {
    expect(visiblePercentile(null)).toBeNull();
    expect(visiblePercentile(88, false)).toBeNull();
  });
});
