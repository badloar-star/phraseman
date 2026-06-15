import {
  rankIndex, indexToRank, applySeasonRollback,
  applySeasonRatingDelta, seasonIdForDate, quarterEndMs,
  arenaSeasonConfigFromData, ARENA_SEASON_DEFAULTS,
} from './arena_season';

describe('rankIndex / indexToRank', () => {
  it('bronze I = 0, legend III = 23, round-trips', () => {
    expect(rankIndex('bronze', 'I')).toBe(0);
    expect(rankIndex('legend', 'III')).toBe(23);
    expect(indexToRank(0)).toEqual({ tier: 'bronze', level: 'I' });
    expect(indexToRank(23)).toEqual({ tier: 'legend', level: 'III' });
    expect(indexToRank(20)).toEqual({ tier: 'grandmaster', level: 'III' });
  });
  it('garbage clamps to bronze I / legend III', () => {
    expect(rankIndex('nope', 'X')).toBe(0);
    expect(indexToRank(-5)).toEqual({ tier: 'bronze', level: 'I' });
    expect(indexToRank(999)).toEqual({ tier: 'legend', level: 'III' });
  });
});

describe('applySeasonRollback — soft -N with floor', () => {
  it('legend III rolls back 3 ranks to grandmaster III, stars 0', () => {
    expect(applySeasonRollback('legend', 'III', 3, 2))
      .toEqual({ tier: 'grandmaster', level: 'III', stars: 0 });
  });
  it('silver II (idx4) -3 = idx1, but floor (idx2) wins → bronze III', () => {
    expect(applySeasonRollback('silver', 'II', 3, 2))
      .toEqual({ tier: 'bronze', level: 'III', stars: 0 });
  });
  it('gold II (idx7) -3 = idx4 → silver II (above floor, no clamp)', () => {
    expect(applySeasonRollback('gold', 'II', 3, 2))
      .toEqual({ tier: 'silver', level: 'II', stars: 0 });
  });
  it('floor: bronze I/II never go below bronze III (idx2)', () => {
    expect(applySeasonRollback('bronze', 'I', 3, 2))
      .toEqual({ tier: 'bronze', level: 'III', stars: 0 });
    expect(applySeasonRollback('silver', 'I', 3, 2))
      .toEqual({ tier: 'bronze', level: 'III', stars: 0 });
  });
});

describe('applySeasonRatingDelta — SR at ceiling', () => {
  it('PvP win +25, loss -20, floor 0', () => {
    expect(applySeasonRatingDelta(100, 100, 'win', false)).toEqual({ sr: 125, peakSR: 125 });
    expect(applySeasonRatingDelta(100, 130, 'loss', false)).toEqual({ sr: 80, peakSR: 130 });
    expect(applySeasonRatingDelta(10, 50, 'loss', false)).toEqual({ sr: 0, peakSR: 50 });
  });
  it('bot win is half (+12), bot loss still -20', () => {
    expect(applySeasonRatingDelta(100, 100, 'win', true)).toEqual({ sr: 112, peakSR: 112 });
    expect(applySeasonRatingDelta(100, 100, 'loss', true)).toEqual({ sr: 80, peakSR: 100 });
  });
  it('draw / neutral does not change sr', () => {
    expect(applySeasonRatingDelta(100, 120, 'draw', false)).toEqual({ sr: 100, peakSR: 120 });
    expect(applySeasonRatingDelta(100, 120, 'neutral', false)).toEqual({ sr: 100, peakSR: 120 });
  });
  it('peakSR only ever rises', () => {
    expect(applySeasonRatingDelta(200, 180, 'win', false)).toEqual({ sr: 225, peakSR: 225 });
  });
  it('uses admin config when passed (win/loss/bot overrides)', () => {
    const cfg = { srWin: 40, srLoss: 10, srBotWin: 5 };
    expect(applySeasonRatingDelta(100, 100, 'win', false, cfg)).toEqual({ sr: 140, peakSR: 140 });
    expect(applySeasonRatingDelta(100, 130, 'loss', false, cfg)).toEqual({ sr: 90, peakSR: 130 });
    expect(applySeasonRatingDelta(100, 100, 'win', true, cfg)).toEqual({ sr: 105, peakSR: 105 });
  });
  it('omitting config == defaults (behaviour unchanged when no doc)', () => {
    expect(applySeasonRatingDelta(100, 100, 'win', false)).toEqual({ sr: 125, peakSR: 125 });
  });
});

describe('arenaSeasonConfigFromData — Firestore → config (with fallback)', () => {
  it('empty/undefined → defaults', () => {
    expect(arenaSeasonConfigFromData(undefined)).toEqual(ARENA_SEASON_DEFAULTS);
    expect(arenaSeasonConfigFromData({})).toEqual(ARENA_SEASON_DEFAULTS);
  });
  it('reads numbers from remote_config-style keys', () => {
    expect(arenaSeasonConfigFromData({
      arena_sr_win: 30, arena_sr_loss: 15, arena_sr_bot_win: 8,
      arena_season_rollback_steps: 5, arena_season_floor_index: 4,
    })).toEqual({ srWin: 30, srLoss: 15, srBotWin: 8, rollbackSteps: 5, floorIndex: 4 });
  });
  it('per-field fallback: bad value keeps default', () => {
    const out = arenaSeasonConfigFromData({ arena_sr_win: 'nope', arena_sr_loss: 15 });
    expect(out.srWin).toBe(ARENA_SEASON_DEFAULTS.srWin); // fallback
    expect(out.srLoss).toBe(15);
  });
  it('clamps out-of-range to bounds', () => {
    const out = arenaSeasonConfigFromData({ arena_sr_win: 99999, arena_season_rollback_steps: 999 });
    expect(out.srWin).toBe(999); // max 999
    expect(out.rollbackSteps).toBe(23); // max 23
  });
});

describe('seasonIdForDate / quarterEndMs — quarter', () => {
  it('maps months to quarters', () => {
    expect(seasonIdForDate(new Date(Date.UTC(2026, 0, 15)))).toBe('2026-Q1');
    expect(seasonIdForDate(new Date(Date.UTC(2026, 6, 1)))).toBe('2026-Q3');
    expect(seasonIdForDate(new Date(Date.UTC(2026, 11, 31)))).toBe('2026-Q4');
  });
  it('quarter end is first day of next quarter (UTC)', () => {
    expect(quarterEndMs(new Date(Date.UTC(2026, 6, 15)))).toBe(Date.UTC(2026, 9, 1));
    expect(quarterEndMs(new Date(Date.UTC(2026, 11, 31)))).toBe(Date.UTC(2027, 0, 1));
  });
});
