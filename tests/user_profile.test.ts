import {
  estimateDaysToTarget,
  addDays,
  CurrentLevel,
  TargetLevel,
  MinutesPerDay,
} from '../app/types/user_profile';

describe('User Profile Utilities', () => {
  describe('estimateDaysToTarget', () => {
    it('should return 0 when from level >= to level', () => {
      expect(estimateDaysToTarget('b1', 'a1', 15)).toBe(0);
      expect(estimateDaysToTarget('a2', 'a2', 15)).toBe(0);
    });

    it('should estimate days for A1 -> B1 progression', () => {
      // A1 -> B1 = 2 level jumps
      const baseResult = estimateDaysToTarget('a1', 'b1', 15);
      expect(baseResult).toBeGreaterThan(0);
      expect(baseResult).toBeLessThan(150); // reasonable upper bound
    });

    it('should increase days for lower intensity', () => {
      const result5min = estimateDaysToTarget('a1', 'b1', 5);
      const result15min = estimateDaysToTarget('a1', 'b1', 15);
      expect(result5min).toBeGreaterThan(result15min);
    });

    it('should decrease days for higher intensity', () => {
      const result15min = estimateDaysToTarget('a1', 'b1', 15);
      const result60min = estimateDaysToTarget('a1', 'b1', 60);
      expect(result60min).toBeLessThan(result15min);
    });

    it('should handle all level combinations', () => {
      const levels: CurrentLevel[] = ['a1', 'a2', 'b1', 'b2'];
      const targets: TargetLevel[] = ['a1', 'a2', 'b1', 'b2', 'c1'];

      for (const from of levels) {
        for (const to of targets) {
          const result = estimateDaysToTarget(from, to, 15);
          expect(typeof result).toBe('number');
          expect(result).toBeGreaterThanOrEqual(0);
        }
      }
    });

    it('should be consistent with intensity multipliers', () => {
      const base = estimateDaysToTarget('a1', 'b1', 15);

      // 5 min should be ~3x longer
      const result5 = estimateDaysToTarget('a1', 'b1', 5);
      expect(result5 / base).toBeCloseTo(3.0, 1);

      // 30 min should be ~0.6x (faster)
      const result30 = estimateDaysToTarget('a1', 'b1', 30);
      expect(result30 / base).toBeCloseTo(0.6, 1);

      // 60 min should be ~0.4x (fastest)
      const result60 = estimateDaysToTarget('a1', 'b1', 60);
      expect(result60 / base).toBeCloseTo(0.4, 1);
    });
  });

  describe('addDays', () => {
    it('should add positive days', () => {
      const date = new Date('2026-03-29');
      const result = addDays(date, 10);
      expect(result.getDate()).toBe(8); // 29 + 10 - 31 = 8 (next month)
      expect(result.getMonth()).toBe(3); // April (0-indexed: March = 2, April = 3)
    });

    it('should handle zero days', () => {
      const date = new Date('2026-03-29');
      const result = addDays(date, 0);
      expect(result.getTime()).toBe(date.getTime());
    });

    it('should handle negative days', () => {
      const date = new Date('2026-03-29');
      const result = addDays(date, -10);
      expect(result.getDate()).toBe(19); // 29 - 10 = 19
      expect(result.getMonth()).toBe(2); // March
    });

    it('should not mutate original date', () => {
      const original = new Date('2026-03-29');
      const originalTime = original.getTime();
      addDays(original, 100);
      expect(original.getTime()).toBe(originalTime);
    });

    it('should handle year boundaries', () => {
      const date = new Date('2025-12-25');
      const result = addDays(date, 10);
      expect(result.getFullYear()).toBe(2026);
      expect(result.getMonth()).toBe(0); // January
      expect(result.getDate()).toBe(4);
    });

    it('should handle month boundaries in both directions', () => {
      // March 15 + 20 days = April 4
      const date1 = new Date('2026-03-15');
      const result1 = addDays(date1, 20);
      expect(result1.getMonth()).toBe(3); // April
      expect(result1.getDate()).toBe(4);

      // April 5 - 10 days = March 26
      const date2 = new Date('2026-04-05');
      const result2 = addDays(date2, -10);
      expect(result2.getMonth()).toBe(2); // March
      expect(result2.getDate()).toBe(26);
    });
  });
});
