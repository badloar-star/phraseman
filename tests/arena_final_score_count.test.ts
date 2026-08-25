import {
  ARENA_FINAL_SCORE_COUNT_MS,
  ARENA_FINAL_SCORE_MAX_BEATS,
  arenaFinalScore,
  arenaFinalScoreBeatValues,
  arenaFinalScoreValue,
} from '../modules/arena/final_score_count';

describe('Arena final score count model', () => {
  test('normalizes score and reaches the exact final integer', () => {
    expect(arenaFinalScore(Number.NaN)).toBe(0);
    expect(arenaFinalScore(-5)).toBe(0);
    expect(arenaFinalScore(4.9)).toBe(4);
    expect(arenaFinalScoreValue(19, 0)).toBe(0);
    expect(arenaFinalScoreValue(19, 1)).toBe(19);
    expect(arenaFinalScoreValue(19, Number.NaN)).toBe(0);
  });

  test('count-up is monotonic across its eased progress', () => {
    const values = [0, 0.1, 0.25, 0.5, 0.75, 1]
      .map((progress) => arenaFinalScoreValue(19, progress));
    expect(values).toEqual([...values].sort((left, right) => left - right));
  });

  test('sound beats are positive, unique, terminal, and bounded', () => {
    for (const score of [0, 1, 3, 19, 999]) {
      const beats = arenaFinalScoreBeatValues(score);
      expect(new Set(beats).size).toBe(beats.length);
      expect(beats.length).toBeLessThanOrEqual(ARENA_FINAL_SCORE_MAX_BEATS);
      expect(beats.every((beat) => beat > 0)).toBe(true);
      if (score > 0) expect(beats[beats.length - 1]).toBe(Math.trunc(score));
    }
  });

  test('the visual gate covers the existing 620ms count-up', () => {
    expect(ARENA_FINAL_SCORE_COUNT_MS).toBeGreaterThanOrEqual(620);
    expect(ARENA_FINAL_SCORE_MAX_BEATS).toBe(6);
  });
});
