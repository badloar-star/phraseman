/**
 * Тесты Variable Reward System (бонус-сундук в конце урока/квиза).
 *
 * Новая спецификация (после ухода от 82%-нуля):
 *  - бонус всегда ≥ 1 (никаких «пустых» сундуков)
 *  - бонус ≤ 30
 *  - тиеры: large (20–30) ~3%, medium (10–20) ~10%, остальное — small/минимум (1–5)
 *  - baseXP не меняется; totalXP = baseXP + bonusXP
 *
 * «Сундук дня» (openTreasureChest/prepareTreasureChestOpen/commitTreasureChestOpen,
 * DailyTreasureState) удалён как мёртвый код — отдельного действия «открыть сундук»
 * в приложении нет, бонус начисляется в конце урока/квиза.
 */

import {
  calculateRandomBonus,
  calculateRewardWithBonus,
  getTierLabel,
} from '../app/variable_reward_system';

describe('Variable Reward System', () => {
  describe('calculateRandomBonus()', () => {
    it('should return a number', () => {
      expect(typeof calculateRandomBonus()).toBe('number');
    });

    it('should always return >= 1 (no empty chests)', () => {
      for (let i = 0; i < 1000; i++) {
        expect(calculateRandomBonus()).toBeGreaterThanOrEqual(1);
      }
    });

    it('should return value <= 30', () => {
      for (let i = 0; i < 1000; i++) {
        expect(calculateRandomBonus()).toBeLessThanOrEqual(30);
      }
    });

    it('should respect tier distribution (large ~3%, medium ~10%)', () => {
      const runs = 20000;
      let largeCount = 0; // 20–30
      let mediumCount = 0; // 10–20

      for (let i = 0; i < runs; i++) {
        const bonus = calculateRandomBonus();
        if (bonus > 20 && bonus <= 30) largeCount++;
        else if (bonus > 10 && bonus <= 20) mediumCount++;
      }

      const largePct = (largeCount / runs) * 100;
      const mediumPct = (mediumCount / runs) * 100;

      // large ~3% (±1.5), medium ~10% (±2)
      expect(largePct).toBeGreaterThan(1.5);
      expect(largePct).toBeLessThan(4.5);
      expect(mediumPct).toBeGreaterThan(8);
      expect(mediumPct).toBeLessThan(12);
    });
  });

  describe('calculateRewardWithBonus()', () => {
    it('should preserve baseXP unchanged', () => {
      const baseXP = 100;
      expect(calculateRewardWithBonus(baseXP).baseXP).toBe(baseXP);
    });

    it('should calculate totalXP correctly', () => {
      const result = calculateRewardWithBonus(100);
      expect(result.totalXP).toBe(result.baseXP + result.bonusXP);
    });

    it('should always set hasBonusWon true (bonus is always >= 1)', () => {
      for (let i = 0; i < 200; i++) {
        const result = calculateRewardWithBonus(100);
        expect(result.bonusXP).toBeGreaterThanOrEqual(1);
        expect(result.hasBonusWon).toBe(true);
      }
    });

    it('should include valid bonusInfo whenever bonus is won', () => {
      for (let i = 0; i < 200; i++) {
        const result = calculateRewardWithBonus(100);
        expect(result.hasBonusWon).toBe(true);
        expect(result.bonusInfo).toBeDefined();
        expect(result.bonusInfo?.tier).toMatch(/^(small|medium|large)$/);
        expect(result.bonusInfo?.percentage).toBeGreaterThan(0);
        expect(result.bonusInfo?.range).toBeDefined();
      }
    });

    it('should work with various base XP amounts (total within base+30)', () => {
      [10, 50, 100, 200, 500].forEach((baseXP) => {
        const result = calculateRewardWithBonus(baseXP);
        expect(result.baseXP).toBe(baseXP);
        expect(result.totalXP).toBeGreaterThanOrEqual(baseXP + 1);
        expect(result.totalXP).toBeLessThanOrEqual(baseXP + 30);
      });
    });
  });

  describe('getTierLabel()', () => {
    it('should return "none" for 0 bonus', () => {
      expect(getTierLabel(0)).toBe('none');
    });

    it('should return "small" for bonus <= 5', () => {
      expect(getTierLabel(1)).toBe('small');
      expect(getTierLabel(5)).toBe('small');
    });

    it('should return "medium" for 5 < bonus <= 20', () => {
      expect(getTierLabel(10)).toBe('medium');
      expect(getTierLabel(20)).toBe('medium');
    });

    it('should return "large" for bonus > 20', () => {
      expect(getTierLabel(21)).toBe('large');
      expect(getTierLabel(30)).toBe('large');
    });
  });

  describe('Statistical validation', () => {
    it('all bonuses should be within valid ranges and never zero', () => {
      const bonuses = new Set<number>();
      for (let i = 0; i < 2000; i++) {
        const bonus = calculateRandomBonus();
        bonuses.add(bonus);
        expect(bonus).toBeGreaterThanOrEqual(1);
        expect(bonus).toBeLessThanOrEqual(30);
      }
      // Должны встречаться значения хотя бы одного из тиеров.
      const hasAny = Array.from(bonuses).some((b) => b >= 1 && b <= 30);
      expect(hasAny).toBe(true);
    });
  });
});
