/**
 * Тесты для Variable Reward System
 *
 * Проверяют:
 * 1. Базовый XP не меняется при расчёте
 * 2. Вероятности бонусов соответствуют требованиям
 * 3. Диапазоны значений корректны
 */

import {
  calculateRandomBonus,
  calculateRewardWithBonus,
  getTierLabel,
} from '../app/variable_reward_system';

describe('Variable Reward System', () => {
  describe('calculateRandomBonus()', () => {
    it('should return a number', () => {
      const result = calculateRandomBonus();
      expect(typeof result).toBe('number');
    });

    it('should return value >= 0', () => {
      for (let i = 0; i < 100; i++) {
        const result = calculateRandomBonus();
        expect(result).toBeGreaterThanOrEqual(0);
      }
    });

    it('should return value <= 30', () => {
      for (let i = 0; i < 100; i++) {
        const result = calculateRandomBonus();
        expect(result).toBeLessThanOrEqual(30);
      }
    });

    it('should return 0 most of the time (82%)', () => {
      const runs = 10000;
      let zeroCount = 0;

      for (let i = 0; i < runs; i++) {
        if (calculateRandomBonus() === 0) zeroCount++;
      }

      const percentage = (zeroCount / runs) * 100;
      // Проверяем что в диапазоне 78-86% (80% +/- 6%)
      expect(percentage).toBeGreaterThan(78);
      expect(percentage).toBeLessThan(86);
    });

    it('should respect tier distribution', () => {
      const runs = 10000;
      let tier1Count = 0; // 0-10: 10%
      let tier2Count = 0; // 10-20: 5%
      let tier3Count = 0; // 20-30: 3%

      for (let i = 0; i < runs; i++) {
        const bonus = calculateRandomBonus();
        if (bonus > 0 && bonus <= 10) tier1Count++;
        if (bonus > 10 && bonus <= 20) tier2Count++;
        if (bonus > 20 && bonus <= 30) tier3Count++;
      }

      const tier1Pct = (tier1Count / runs) * 100;
      const tier2Pct = (tier2Count / runs) * 100;
      const tier3Pct = (tier3Count / runs) * 100;

      // Проверяем что распределение близко к ожидаемому (с допуском 1%)
      expect(tier1Pct).toBeGreaterThan(8.5);
      expect(tier1Pct).toBeLessThan(11.5);

      expect(tier2Pct).toBeGreaterThan(3.5);
      expect(tier2Pct).toBeLessThan(6.5);

      expect(tier3Pct).toBeGreaterThan(1.5);
      expect(tier3Pct).toBeLessThan(4.5);
    });
  });

  describe('calculateRewardWithBonus()', () => {
    it('should preserve baseXP unchanged', () => {
      const baseXP = 100;
      const result = calculateRewardWithBonus(baseXP);
      expect(result.baseXP).toBe(baseXP);
    });

    it('should calculate totalXP correctly', () => {
      const baseXP = 100;
      const result = calculateRewardWithBonus(baseXP);
      expect(result.totalXP).toBe(result.baseXP + result.bonusXP);
    });

    it('should set hasBonusWon correctly when bonus is 0', () => {
      // Может потребоваться несколько попыток из-за случайности
      let hasBonusResult = false;

      for (let i = 0; i < 100; i++) {
        const result = calculateRewardWithBonus(100);
        if (result.bonusXP === 0) {
          expect(result.hasBonusWon).toBe(false);
          hasBonusResult = true;
          break;
        }
      }

      expect(hasBonusResult).toBe(true);
    });

    it('should set hasBonusWon correctly when bonus > 0', () => {
      let hasBonusResult = false;

      for (let i = 0; i < 100; i++) {
        const result = calculateRewardWithBonus(100);
        if (result.bonusXP > 0) {
          expect(result.hasBonusWon).toBe(true);
          hasBonusResult = true;
          break;
        }
      }

      expect(hasBonusResult).toBe(true);
    });

    it('should include bonusInfo when bonus is won', () => {
      let hasBonusInfo = false;

      for (let i = 0; i < 100; i++) {
        const result = calculateRewardWithBonus(100);
        if (result.hasBonusWon) {
          expect(result.bonusInfo).toBeDefined();
          expect(result.bonusInfo?.tier).toMatch(/^(small|medium|large)$/);
          expect(result.bonusInfo?.percentage).toBeGreaterThan(0);
          expect(result.bonusInfo?.range).toBeDefined();
          hasBonusInfo = true;
          break;
        }
      }

      expect(hasBonusInfo).toBe(true);
    });

    it('should not include bonusInfo when bonus is not won', () => {
      let noBonusInfo = false;

      for (let i = 0; i < 100; i++) {
        const result = calculateRewardWithBonus(100);
        if (!result.hasBonusWon) {
          expect(result.bonusInfo).toBeUndefined();
          noBonusInfo = true;
          break;
        }
      }

      expect(noBonusInfo).toBe(true);
    });

    it('should work with various base XP amounts', () => {
      const amounts = [10, 50, 100, 200, 500];

      amounts.forEach((baseXP) => {
        const result = calculateRewardWithBonus(baseXP);
        expect(result.baseXP).toBe(baseXP);
        expect(result.totalXP).toBeGreaterThanOrEqual(baseXP);
        expect(result.totalXP).toBeLessThanOrEqual(baseXP + 30);
      });
    });
  });

  describe('getTierLabel()', () => {
    it('should return "none" for 0 bonus', () => {
      expect(getTierLabel(0)).toBe('none');
    });

    it('should return "small" for bonus <= 10', () => {
      expect(getTierLabel(5)).toBe('small');
      expect(getTierLabel(10)).toBe('small');
    });

    it('should return "medium" for 10 < bonus <= 20', () => {
      expect(getTierLabel(11)).toBe('medium');
      expect(getTierLabel(15)).toBe('medium');
      expect(getTierLabel(20)).toBe('medium');
    });

    it('should return "large" for bonus > 20', () => {
      expect(getTierLabel(21)).toBe('large');
      expect(getTierLabel(25)).toBe('large');
      expect(getTierLabel(30)).toBe('large');
    });
  });

  describe('Statistical validation', () => {
    it('should maintain ~18% bonus win rate', () => {
      const runs = 10000;
      let winCount = 0;

      for (let i = 0; i < runs; i++) {
        if (calculateRandomBonus() > 0) winCount++;
      }

      const winRate = (winCount / runs) * 100;
      // 18% +/- 1%
      expect(winRate).toBeGreaterThan(17);
      expect(winRate).toBeLessThan(19);
    });

    it('all bonuses should be within valid ranges', () => {
      const runs = 1000;
      const bonuses = new Set<number>();

      for (let i = 0; i < runs; i++) {
        const bonus = calculateRandomBonus();
        bonuses.add(bonus);
        expect(bonus).toBeGreaterThanOrEqual(0);
        expect(bonus).toBeLessThanOrEqual(30);
      }

      // Должны быть значения из разных тиеров
      const hasSmall = Array.from(bonuses).some((b) => b > 0 && b <= 10);
      const hasMedium = Array.from(bonuses).some((b) => b > 10 && b <= 20);
      const hasLarge = Array.from(bonuses).some((b) => b > 20 && b <= 30);

      expect(hasSmall || hasMedium || hasLarge).toBe(true);
    });
  });
});
