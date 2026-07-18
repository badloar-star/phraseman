import { STREAK_ICON_TIERS, streakIconTierForDays } from '../constants/streakIconAssets';

describe('streak fire icon milestones', () => {
  it('uses the approved early-day progression through the 100-day flame', () => {
    expect(STREAK_ICON_TIERS).toEqual([1, 2, 3, 5, 7, 10, 20, 35, 60, 100]);
  });

  it.each([
    [1, 0],
    [1, 1],
    [2, 2],
    [3, 4],
    [5, 6],
    [7, 9],
    [10, 19],
    [20, 34],
    [35, 59],
    [60, 99],
    [100, 100],
    [100, 365],
  ])('selects milestone %i for streak day %i', (tier, days) => {
    expect(streakIconTierForDays(days)).toBe(tier);
  });
});
