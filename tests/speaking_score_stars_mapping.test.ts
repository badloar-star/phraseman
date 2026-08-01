import { inlineStarsForScore, starsForScore } from '../app/speaking_score_stars';

// Star tiers replace the old percent ring in Speaking Mode. The mapping is
// anchored on the phrase's pass bar so the visual stays coherent with the pass
// rule: 1 star = a real-but-failing attempt, 2 stars = a pass (score ≥ bar),
// 3 stars = the "great" bar (midpoint between pass and 100, never below 90).
describe('starsForScore (speaking result star tiers)', () => {
  it('gives 0 stars for no real attempt (score 0)', () => {
    expect(starsForScore(0, 70)).toBe(0);
  });

  it('gives 1 star below the pass bar', () => {
    expect(starsForScore(50, 70)).toBe(1);
    expect(starsForScore(69, 70)).toBe(1);
  });

  it('gives 2 stars exactly at and just above the pass bar', () => {
    expect(starsForScore(70, 70)).toBe(2);
    expect(starsForScore(80, 70)).toBe(2);
  });

  it('gives 3 stars at the great bar (>= max(90, midpoint))', () => {
    // pass 70 → midpoint (70+100)/2 = 85, floored to 90 by the min.
    expect(starsForScore(90, 70)).toBe(3);
    expect(starsForScore(100, 70)).toBe(3);
    // Just below 90 is still 2 stars when the min floor applies.
    expect(starsForScore(89, 70)).toBe(2);
  });

  it('honours a high pass bar where the midpoint exceeds 90', () => {
    // pass 92 → midpoint (92+100)/2 = 96 → great bar is 96, not 90.
    expect(starsForScore(94, 92)).toBe(2);
    expect(starsForScore(96, 92)).toBe(3);
  });

  it('clamps out-of-range scores', () => {
    expect(starsForScore(-10, 70)).toBe(0);
    expect(starsForScore(150, 70)).toBe(3);
  });
});

describe('inlineStarsForScore (five-star inline feedback)', () => {
  it.each([
    [0, 0],
    [1, 1],
    [24, 1],
    [25, 2],
    [49, 2],
    [50, 3],
    [74, 3],
    [75, 4],
    [89, 4],
    [90, 5],
    [100, 5],
  ])('maps score %i to %i inline stars', (score, expected) => {
    expect(inlineStarsForScore(score)).toBe(expected);
  });

  it('clamps scores before mapping them', () => {
    expect(inlineStarsForScore(-30)).toBe(0);
    expect(inlineStarsForScore(140)).toBe(5);
  });
});
