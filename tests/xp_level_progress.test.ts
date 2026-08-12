import { getLevelFromXP, getXPProgress, LEVEL_XP, MAX_LEVEL, TOTAL_XP_FOR_LEVEL } from '../constants/theme';
import { getTitleString } from '../constants/titles';

describe('XP level progress', () => {
  it('keeps level 50 progress toward level 51 instead of treating 50 as max', () => {
    const totalXP = TOTAL_XP_FOR_LEVEL(50) + 1249;
    expect(getXPProgress(totalXP)).toMatchObject({
      level: 50,
      xpInLevel: 1249,
      xpNeeded: LEVEL_XP(50),
    });
    expect(getXPProgress(totalXP).progress).toBeCloseTo(1249 / LEVEL_XP(50), 6);
  });

  it('advances to level 51 exactly at the level 51 threshold', () => {
    const level51XP = TOTAL_XP_FOR_LEVEL(51);
    expect(getLevelFromXP(level51XP - 1)).toBe(50);
    expect(getLevelFromXP(level51XP)).toBe(51);
    expect(getXPProgress(level51XP)).toMatchObject({
      level: 51,
      xpInLevel: 0,
    });
  });

  it('keeps the Legend title after level 50', () => {
    expect(getTitleString(50, 'ru')).toBe('Legend');
    expect(getTitleString(51, 'ru')).toBe('Legend');
    expect(getTitleString(60, 'ru')).toBe('Legend');
  });

  it('caps at the product maximum level', () => {
    expect(MAX_LEVEL).toBe(60);
    expect(getLevelFromXP(TOTAL_XP_FOR_LEVEL(61))).toBe(60);
    expect(getXPProgress(TOTAL_XP_FOR_LEVEL(61))).toMatchObject({
      level: 60,
      xpInLevel: LEVEL_XP(60),
      xpNeeded: LEVEL_XP(60),
      progress: 1,
    });
  });
});
