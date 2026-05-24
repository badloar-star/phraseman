import {
  getLevelFromXP,
  LEVEL_XP,
  MAX_LEVEL,
  TOTAL_XP_FOR_LEVEL,
} from '../constants/theme';
import { getTitleForLevel } from '../constants/titles';

describe('XP level thresholds', () => {
  it('keeps the slower 50-level curve intact', () => {
    expect(TOTAL_XP_FOR_LEVEL(2)).toBe(400);
    expect(TOTAL_XP_FOR_LEVEL(50)).toBe(476669);
    expect(LEVEL_XP(49)).toBe(17557);
    expect(getLevelFromXP(TOTAL_XP_FOR_LEVEL(50))).toBe(50);
    expect(getLevelFromXP(TOTAL_XP_FOR_LEVEL(50) - 1)).toBe(49);
  });

  it('uses legendary post-50 thresholds with 150K growing steps', () => {
    const expected = [
      [51, 150000, 626669],
      [52, 300000, 926669],
      [53, 450000, 1376669],
      [54, 600000, 1976669],
      [55, 750000, 2726669],
      [56, 900000, 3626669],
      [57, 1050000, 4676669],
      [58, 1200000, 5876669],
      [59, 1350000, 7226669],
      [60, 1500000, 8726669],
    ] as const;

    expect(MAX_LEVEL).toBe(60);
    for (const [level, xpFromPrevious, totalXP] of expected) {
      expect(LEVEL_XP(level - 1)).toBe(xpFromPrevious);
      expect(TOTAL_XP_FOR_LEVEL(level)).toBe(totalXP);
      expect(getLevelFromXP(totalXP)).toBe(level);
      expect(getLevelFromXP(totalXP - 1)).toBe(level - 1);
    }
  });

  it('caps level lookup at 60 after the final threshold', () => {
    expect(getLevelFromXP(TOTAL_XP_FOR_LEVEL(60) + 999999999)).toBe(60);
  });

  it('has titles for the legendary level range', () => {
    expect(getTitleForLevel(0).titleEN).toBe('Beginner');
    expect(getTitleForLevel(51).titleEN).toBe('Flamekeeper');
    expect(getTitleForLevel(60).titleEN).toBe('Elemental Absolute');
    expect(getTitleForLevel(61).titleEN).toBe('Elemental Absolute');
  });
});
