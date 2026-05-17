import {
  getLevelFromXP,
  LEVEL_XP,
  MAX_LEVEL,
  TOTAL_XP_FOR_LEVEL,
} from '../constants/theme';
import { getTitleForLevel } from '../constants/titles';

describe('XP level thresholds', () => {
  it('keeps the existing 50-level curve intact', () => {
    expect(TOTAL_XP_FOR_LEVEL(50)).toBe(297918);
    expect(LEVEL_XP(49)).toBe(10973);
    expect(getLevelFromXP(TOTAL_XP_FOR_LEVEL(50))).toBe(50);
    expect(getLevelFromXP(TOTAL_XP_FOR_LEVEL(50) - 1)).toBe(49);
  });

  it('uses legendary post-50 thresholds with 150K growing steps', () => {
    const expected = [
      [51, 150000, 447918],
      [52, 300000, 747918],
      [53, 450000, 1197918],
      [54, 600000, 1797918],
      [55, 750000, 2547918],
      [56, 900000, 3447918],
      [57, 1050000, 4497918],
      [58, 1200000, 5697918],
      [59, 1350000, 7047918],
      [60, 1500000, 8547918],
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
