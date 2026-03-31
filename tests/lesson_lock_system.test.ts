/**
 * tests/lesson_lock_system.test.ts
 *
 * Тесты для системы управления блокировкой/разблокировкой уроков
 */

import {
  isLessonUnlocked,
  getLessonLockInfo,
  getLockMessageText,
} from '../app/lesson_lock_system';

describe('LessonLockSystem', () => {
  describe('getLessonLockInfo', () => {
    it('Урок 1 не заблокирован', async () => {
      const info = await getLessonLockInfo(1);
      expect(info.isUnlocked).toBe(true);
      expect(info.prevLessonId).toBe(0);
      expect(info.requiredScore).toBe(4.5);
    });

    it('Урок 2 требует прохождения урока 1 с оценкой >= 4.5', async () => {
      const info = await getLessonLockInfo(2);
      expect(info.prevLessonId).toBe(1);
      expect(info.requiredScore).toBe(4.5);
    });

    it('Урок N требует прохождения урока N-1', async () => {
      for (let i = 3; i <= 32; i++) {
        const info = await getLessonLockInfo(i);
        expect(info.prevLessonId).toBe(i - 1);
        expect(info.requiredScore).toBe(4.5);
      }
    });

    it('Возвращает prevLessonId для невалидного урока', async () => {
      const info = await getLessonLockInfo(0);
      expect(info.prevLessonId).toBe(-1);
      expect(info.requiredScore).toBe(4.5);
    });
  });

  describe('getLockMessageText', () => {
    it('Возвращает русский текст для ru', async () => {
      const info = await getLessonLockInfo(2);
      const text = getLockMessageText(info, 'ru');
      expect(text).toContain('урок 1');
      expect(text).toContain('4.5');
    });

    it('Возвращает украинский текст для uk', async () => {
      const info = await getLessonLockInfo(2);
      const text = getLockMessageText(info, 'uk');
      expect(text).toContain('урок 1');
      expect(text).toContain('4.5');
    });

    it('Работает для любого урока N', async () => {
      const info5 = await getLessonLockInfo(5);
      const text5 = getLockMessageText(info5, 'ru');
      expect(text5).toContain('урок 4');

      const info10 = await getLessonLockInfo(10);
      const text10 = getLockMessageText(info10, 'ru');
      expect(text10).toContain('урок 9');
    });
  });

  describe('Граничные случаи', () => {
    it('Работает с максимальным номером урока (32)', async () => {
      const info = await getLessonLockInfo(32);
      expect(info.prevLessonId).toBe(31);
      expect(info.requiredScore).toBe(4.5);
    });
  });
});
