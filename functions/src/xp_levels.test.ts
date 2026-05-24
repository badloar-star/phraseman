import { getLevelFromXP, MAX_LEVEL, totalXPForLevel } from './xp_levels';

describe('Cloud Functions XP levels', () => {
  it('matches the app standard level thresholds', () => {
    expect(totalXPForLevel(2)).toBe(400);
    expect(totalXPForLevel(50)).toBe(476669);
    expect(getLevelFromXP(totalXPForLevel(50))).toBe(50);
    expect(getLevelFromXP(totalXPForLevel(50) - 1)).toBe(49);
  });

  it('matches the app legendary level thresholds', () => {
    const expected = [
      [51, 626669],
      [52, 926669],
      [53, 1376669],
      [54, 1976669],
      [55, 2726669],
      [56, 3626669],
      [57, 4676669],
      [58, 5876669],
      [59, 7226669],
      [60, 8726669],
    ] as const;

    expect(MAX_LEVEL).toBe(60);
    for (const [level, totalXP] of expected) {
      expect(totalXPForLevel(level)).toBe(totalXP);
      expect(getLevelFromXP(totalXP)).toBe(level);
      expect(getLevelFromXP(totalXP - 1)).toBe(level - 1);
    }
  });

  it('caps lookup at level 60', () => {
    expect(getLevelFromXP(totalXPForLevel(60) + 999999999)).toBe(60);
  });
});
