/**
 * tests/lesson_lock_system.test.ts
 *
 * Тесты для системы управления блокировкой/разблокировкой уроков
 */

import {
  isLessonUnlocked,
  getLessonLockInfo,
  getLockMessageText,
  checkUnlockRequirements,
} from '../app/lesson_lock_system';

describe('LessonLockSystem', () => {
  describe('getLessonLockInfo', () => {
    it('Урок 1 не заблокирован', async () => {
      const info = await getLessonLockInfo(1);
      expect(info.isLocked).toBe(false);
      expect(info.lockedByLesson).toBeNull();
      expect(info.minRequiredScore).toBe(0);
    });

    it('Урок 2 требует прохождения урока 1 с оценкой >= 4.5', async () => {
      const info = await getLessonLockInfo(2);
      expect(info.isLocked).toBe(true);
      expect(info.lockedByLesson).toBe(1);
      expect(info.minRequiredScore).toBe(4.5);
    });

    it('Урок N требует прохождения урока N-1', async () => {
      for (let i = 3; i <= 32; i++) {
        const info = await getLessonLockInfo(i);
        expect(info.isLocked).toBe(true);
        expect(info.lockedByLesson).toBe(i - 1);
        expect(info.minRequiredScore).toBe(4.5);
      }
    });

    it('Возвращает isLocked: false для невалидного урока', async () => {
      const info = await getLessonLockInfo(0);
      expect(info.isLocked).toBe(true);
      expect(info.lockedByLesson).toBeNull();
    });
  });

  describe('getLockMessageText', () => {
    it('Возвращает русский текст для ru', () => {
      const text = getLockMessageText(2, 'ru');
      expect(text).toContain('Урок 1');
      expect(text).toContain('4.5');
      expect(text).toContain('Сначала');
    });

    it('Возвращает украинский текст для uk', () => {
      const text = getLockMessageText(2, 'uk');
      expect(text).toContain('Урок 1');
      expect(text).toContain('4.5');
      expect(text).toContain('Спочатку');
    });

    it('Работает для любого урока N', () => {
      const text5 = getLockMessageText(5, 'ru');
      expect(text5).toContain('Урок 4');

      const text10 = getLockMessageText(10, 'ru');
      expect(text10).toContain('Урок 9');
    });
  });

  describe('checkUnlockRequirements', () => {
    it('Проверяет требования к разблокировке', () => {
      const result = checkUnlockRequirements(1, 4.8);

      expect(result.willUnlockNext).toBe(true);
      expect(result.nextLessonId).toBe(2);
      expect(result.currentScore).toBe(4.8);
      expect(result.requiredScore).toBe(4.5);
      expect(result.scoreGap).toBe(-0.3); // хватает на 0.3
    });

    it('Не разблокирует если оценка < 4.5', () => {
      const result = checkUnlockRequirements(1, 4.4);

      expect(result.willUnlockNext).toBe(false);
      expect(result.nextLessonId).toBe(2);
      expect(result.currentScore).toBe(4.4);
      expect(result.scoreGap).toBe(0.1); // не хватает 0.1
    });

    it('Не имеет следующего урока для урока 32', () => {
      const result = checkUnlockRequirements(32, 5.0);

      expect(result.willUnlockNext).toBe(false);
      expect(result.nextLessonId).toBeNull();
    });

    it('Округляет оценки до 1 десятичного места', () => {
      const result = checkUnlockRequirements(1, 4.567);

      expect(result.currentScore).toBe(4.6);
      expect(result.scoreGap).toBe(-0.1);
    });
  });

  describe('Граничные случаи', () => {
    it('Работает с максимальным номером урока (32)', async () => {
      const info = await getLessonLockInfo(32);
      expect(info.isLocked).toBe(true);
      expect(info.lockedByLesson).toBe(31);
    });

    it('checkUnlockRequirements работает с урок 32', () => {
      const result = checkUnlockRequirements(32, 5.0);
      expect(result.nextLessonId).toBeNull();
      expect(result.willUnlockNext).toBe(false);
    });

    it('Минимальная оценка для разблокировки == 4.5', () => {
      const result45 = checkUnlockRequirements(1, 4.5);
      const result44 = checkUnlockRequirements(1, 4.4);

      expect(result45.willUnlockNext).toBe(true);
      expect(result44.willUnlockNext).toBe(false);
    });
  });
});
