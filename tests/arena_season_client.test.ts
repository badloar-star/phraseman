import {
  applySeasonRatingDelta, applySeasonRollback, seasonIdForDate, rankIndex,
  quarterEndMs, seasonNumberFromId,
} from '../app/arena_season_math';

describe('client season math mirrors server', () => {
  it('SR ceiling deltas match server constants', () => {
    expect(applySeasonRatingDelta(100, 100, 'win', false)).toEqual({ sr: 125, peakSR: 125 });
    expect(applySeasonRatingDelta(100, 100, 'win', true)).toEqual({ sr: 112, peakSR: 112 });
    expect(applySeasonRatingDelta(10, 50, 'loss', false)).toEqual({ sr: 0, peakSR: 50 });
    expect(applySeasonRatingDelta(100, 120, 'draw', false)).toEqual({ sr: 100, peakSR: 120 });
  });
  it('rollback floor = bronze III', () => {
    expect(applySeasonRollback('legend', 'III', 3, 2))
      .toEqual({ tier: 'grandmaster', level: 'III', stars: 0 });
    expect(applySeasonRollback('bronze', 'I', 3, 2))
      .toEqual({ tier: 'bronze', level: 'III', stars: 0 });
    expect(applySeasonRollback('gold', 'II', 3, 2))
      .toEqual({ tier: 'silver', level: 'II', stars: 0 });
  });
  it('season id + quarter end are quarterly', () => {
    expect(seasonIdForDate(new Date(Date.UTC(2026, 6, 1)))).toBe('2026-Q3');
    expect(rankIndex('legend', 'III')).toBe(23);
    expect(quarterEndMs(new Date(Date.UTC(2026, 6, 15)))).toBe(Date.UTC(2026, 9, 1));
  });
  it('season number: 2026-Q3 = 1, advances by quarter', () => {
    expect(seasonNumberFromId('2026-Q3')).toBe(1);
    expect(seasonNumberFromId('2026-Q4')).toBe(2);
    expect(seasonNumberFromId('2027-Q1')).toBe(3);
    expect(seasonNumberFromId('garbage')).toBe(1);
  });
});
