import {
  computeRankProgress,
  nextRank,
  nextRankIndex,
  MAX_RANK_INDEX,
} from '../app/arena_rank_progress';

describe('computeRankProgress', () => {
  it('0 звёзд → прогресс 0, до повышения 3', () => {
    const p = computeRankProgress(0, 0);
    expect(p.ratio).toBe(0);
    expect(p.starsToNext).toBe(3);
    expect(p.atCeiling).toBe(false);
  });

  it('2 звезды → прогресс ~0.66, до повышения 1', () => {
    const p = computeRankProgress(5, 2);
    expect(p.ratio).toBeCloseTo(2 / 3, 5);
    expect(p.starsToNext).toBe(1);
  });

  it('потолок Легенда III → ratio 1, звёзд не осталось, atCeiling', () => {
    const p = computeRankProgress(MAX_RANK_INDEX, 1);
    expect(p.ratio).toBe(1);
    expect(p.starsToNext).toBe(0);
    expect(p.atCeiling).toBe(true);
  });

  it('клампит мусорные входы', () => {
    expect(computeRankProgress(-5, -2).ratio).toBe(0);
    expect(computeRankProgress(999, 99).atCeiling).toBe(true);
    expect(computeRankProgress(NaN, NaN).ratio).toBe(0);
  });
});

describe('nextRankIndex / nextRank', () => {
  it('следующий индекс на единицу больше', () => {
    expect(nextRankIndex(0)).toBe(1);
    expect(nextRankIndex(5)).toBe(6);
  });

  it('на потолке остаётся на потолке', () => {
    expect(nextRankIndex(MAX_RANK_INDEX)).toBe(MAX_RANK_INDEX);
  });

  it('bronze III (index 2) → silver I', () => {
    const r = nextRank(2);
    expect(r.tier).toBe('silver');
    expect(r.level).toBe('I');
  });
});
