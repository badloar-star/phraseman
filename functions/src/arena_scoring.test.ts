import { calculateArenaPoints } from './arena_scoring';

describe('calculateArenaPoints', () => {
  test('returns zero for incorrect answer', () => {
    expect(calculateArenaPoints('go off', 'go on', 500)).toEqual({
      isCorrect: false,
      points: 0,
      bonus: { speed: 0, streak: 0, first: 0, outspeed: 0 },
    });
  });

  test('returns base + bonuses for first fast correct answer', () => {
    const result = calculateArenaPoints('go on', 'go on', 500);
    expect(result.isCorrect).toBe(true);
    expect(result.points).toBeGreaterThan(100);
    expect(result.points).toBeGreaterThanOrEqual(170);
    expect(result.bonus.first).toBe(20);
    expect(result.bonus.outspeed).toBe(15);
  });

  test('caps speed for slow answers and keeps first+outspeed bonuses', () => {
    expect(calculateArenaPoints('go on', 'go on', 2500)).toEqual({
      isCorrect: true,
      points: 135,
      bonus: { speed: 0, streak: 0, first: 20, outspeed: 15 },
    });
  });

  test('applies streak bonus on every third consecutive correct', () => {
    const result = calculateArenaPoints('go on', 'go on', 2200, {
      previousCorrectStreak: 2,
      hasAnyCorrectBefore: true,
    });
    expect(result.isCorrect).toBe(true);
    expect(result.bonus.streak).toBe(30);
    expect(result.bonus.first).toBe(0);
    expect(result.points).toBe(145);
  });
});
