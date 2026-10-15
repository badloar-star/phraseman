import { applyControlScore, CONTROL_SCORE_TOLERANCE } from '../app/speaking_honesty_check';

describe('speaking honesty adjustment (biased vs control score)', () => {
  it('leaves the score untouched when no control result is available', () => {
    expect(applyControlScore(92, null)).toEqual({ score: 92, flagged: false });
    expect(applyControlScore(92, undefined)).toEqual({ score: 92, flagged: false });
    expect(applyControlScore(92, Number.NaN)).toEqual({ score: 92, flagged: false });
  });

  it('tolerates normal engine variance (gap within tolerance)', () => {
    expect(applyControlScore(92, 92 - CONTROL_SCORE_TOLERANCE)).toEqual({ score: 92, flagged: false });
    expect(applyControlScore(80, 70)).toEqual({ score: 80, flagged: false });
  });

  it('caps an inflated score when the neutral engine disagrees hard', () => {
    const adjusted = applyControlScore(95, 30);
    expect(adjusted.score).toBe(30 + CONTROL_SCORE_TOLERANCE);
    expect(adjusted.flagged).toBe(true);
  });

  it('can honestly drop a "pass" below the 75 threshold', () => {
    const adjusted = applyControlScore(88, 20);
    expect(adjusted.score).toBe(20 + CONTROL_SCORE_TOLERANCE);
    expect(adjusted.score).toBeLessThan(75);
    expect(adjusted.flagged).toBe(true);
  });

  it('never raises the score when the control pass heard MORE than the biased one', () => {
    expect(applyControlScore(70, 95)).toEqual({ score: 70, flagged: false });
  });

  it('tolerance is 15: a neutral 60 can no longer carry a pass (60+15 = 75 is the edge)', () => {
    expect(CONTROL_SCORE_TOLERANCE).toBe(15);
    expect(applyControlScore(95, 50).score).toBe(65);
  });

  it('clamps inputs to the 0..100 score range', () => {
    expect(applyControlScore(150, null).score).toBe(100);
    expect(applyControlScore(90, -50)).toEqual({ score: CONTROL_SCORE_TOLERANCE, flagged: true });
  });
});
