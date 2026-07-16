import {
  applyBestPerformanceStars,
  sumBestPerformanceStars,
} from '../modules/learning-v2/contracts/stars';

describe('V2 performance/access star projection', () => {
  it('uses best-per-slot semantics and emits only the positive delta', () => {
    expect(applyBestPerformanceStars({ previous: 0, candidate: 2 })).toEqual({
      next: 2,
      performanceStarsDelta: 2,
      accessStarsEarnedDelta: 2,
    });
    expect(applyBestPerformanceStars({ previous: 2, candidate: 1 })).toEqual({
      next: 2,
      performanceStarsDelta: 0,
      accessStarsEarnedDelta: 0,
    });
    expect(applyBestPerformanceStars({ previous: 2, candidate: 3 })).toEqual({
      next: 3,
      performanceStarsDelta: 1,
      accessStarsEarnedDelta: 1,
    });
  });

  it('rejects non-integer or out-of-range star values', () => {
    expect(() => applyBestPerformanceStars({ previous: 0, candidate: 4 })).toThrow(
      'performance_stars_invalid',
    );
    expect(() => applyBestPerformanceStars({ previous: 1.5, candidate: 2 })).toThrow(
      'performance_stars_invalid',
    );
  });

  it('caps an episode at eight gate slots and 24 earned stars', () => {
    expect(sumBestPerformanceStars([3, 3, 3, 3, 3, 3, 3, 3])).toBe(24);
    expect(() => sumBestPerformanceStars([3, 3, 3, 3, 3, 3, 3, 3, 1])).toThrow(
      'star_slots_invalid',
    );
  });
});
