/**
 * tests/lesson_lock_system.test.ts
 *
 * Тесты для системы управления блокировкой/разблокировкой уроков
 */

import {
  isLessonUnlocked,
  unlockLesson,
  tryUnlockNextLesson,
  tryUnlockLevelExam,
  getLessonLockInfo,
  getLockMessageText,
} from '../app/lesson_lock_system';

// Mock AsyncStorage
const store: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((key: string) => Promise.resolve(store[key] ?? null)),
  setItem: jest.fn((key: string, value: string) => { store[key] = value; return Promise.resolve(); }),
  multiGet: jest.fn((keys: string[]) => Promise.resolve(keys.map(k => [k, store[k] ?? null]))),
  multiSet: jest.fn((pairs: [string, string][]) => { pairs.forEach(([k, v]) => { store[k] = v; }); return Promise.resolve(); }),
  removeItem: jest.fn((key: string) => { delete store[key]; return Promise.resolve(); }),
}));

beforeEach(() => {
  // Очищаем хранилище перед каждым тестом
  Object.keys(store).forEach(k => delete store[k]);
});

// ─── Базовые тесты ────────────────────────────────────────────────────────────

describe('isLessonUnlocked', () => {
  it('урок 1 всегда открыт', async () => {
    expect(await isLessonUnlocked(1)).toBe(true);
  });

  it('урок 2 заблокирован по умолчанию', async () => {
    expect(await isLessonUnlocked(2)).toBe(false);
  });

  it('урок открыт после unlockLesson', async () => {
    await unlockLesson(5);
    expect(await isLessonUnlocked(5)).toBe(true);
  });

  it('повторный unlockLesson не дублирует запись', async () => {
    await unlockLesson(3);
    await unlockLesson(3);
    const raw = store['unlocked_lessons'];
    const arr = JSON.parse(raw);
    expect(arr.filter((x: number) => x === 3).length).toBe(1);
  });
});

// ─── tryUnlockNextLesson ──────────────────────────────────────────────────────

describe('tryUnlockNextLesson', () => {
  it('score >= 2.5 открывает следующий урок', async () => {
    const result = await tryUnlockNextLesson(1, 2.5);
    expect(result).toBe(true);
    expect(await isLessonUnlocked(2)).toBe(true);
  });

  it('score < 2.5 не открывает следующий урок', async () => {
    const result = await tryUnlockNextLesson(1, 2.4);
    expect(result).toBe(false);
    expect(await isLessonUnlocked(2)).toBe(false);
  });

  it('цепочка A1: уроки 1→2→3→...→8 открываются последовательно', async () => {
    for (let i = 1; i <= 7; i++) {
      await tryUnlockNextLesson(i, 3.0);
      expect(await isLessonUnlocked(i + 1)).toBe(true);
    }
  });

  it('урок 32 не открывает урок 33 (его нет)', async () => {
    const result = await tryUnlockNextLesson(32, 5.0);
    expect(result).toBe(false);
  });

  it('если урок уже открыт — возвращает false (не дублирует)', async () => {
    await unlockLesson(2);
    const result = await tryUnlockNextLesson(1, 5.0);
    expect(result).toBe(false);
  });

  it('score = 5.0 (золото) открывает следующий урок', async () => {
    await tryUnlockNextLesson(5, 5.0);
    expect(await isLessonUnlocked(6)).toBe(true);
  });

  it('score = 2.5 (бронза минимум) открывает следующий урок', async () => {
    await tryUnlockNextLesson(8, 2.5);
    expect(await isLessonUnlocked(9)).toBe(true);
  });
});

// ─── tryUnlockLevelExam ───────────────────────────────────────────────────────

describe('tryUnlockLevelExam — зачёт уровня', () => {
  it('A1: все 8 уроков >= 4.5 → зачёт доступен', async () => {
    for (let i = 1; i <= 8; i++) store[`lesson${i}_best_score`] = '4.5';
    const level = await tryUnlockLevelExam(5); // любой урок A1
    expect(level).toBe('A1');
    expect(store['level_exam_A1_available']).toBe('1');
  });

  it('A1: не все уроки >= 4.5 → зачёт не открывается', async () => {
    for (let i = 1; i <= 7; i++) store[`lesson${i}_best_score`] = '4.5';
    store['lesson8_best_score'] = '3.0'; // один урок слабее
    const level = await tryUnlockLevelExam(3);
    expect(level).toBeNull();
  });

  it('A1: зачёт уже открыт → не открывается повторно', async () => {
    for (let i = 1; i <= 8; i++) store[`lesson${i}_best_score`] = '5.0';
    store['level_exam_A1_available'] = '1';
    const level = await tryUnlockLevelExam(1);
    expect(level).toBeNull();
  });

  it('A2: все уроки 9-16 >= 4.5 → зачёт A2 доступен', async () => {
    for (let i = 9; i <= 16; i++) store[`lesson${i}_best_score`] = '4.8';
    const level = await tryUnlockLevelExam(12);
    expect(level).toBe('A2');
  });
});

// ─── getLessonLockInfo / getLockMessageText ───────────────────────────────────

describe('getLessonLockInfo', () => {
  it('урок 1 всегда открыт', async () => {
    const info = await getLessonLockInfo(1);
    expect(info.isUnlocked).toBe(true);
  });

  it('урок 2 заблокирован без прохождения урока 1', async () => {
    const info = await getLessonLockInfo(2);
    expect(info.isUnlocked).toBe(false);
    expect(info.prevLessonId).toBe(1);
    expect(info.requiredScore).toBe(2.5);
  });

  it('урок 2 открыт после разблокировки', async () => {
    await unlockLesson(2);
    const info = await getLessonLockInfo(2);
    expect(info.isUnlocked).toBe(true);
  });
});

describe('getLockMessageText', () => {
  it('русский текст содержит номер предыдущего урока', async () => {
    const info = await getLessonLockInfo(5);
    const text = getLockMessageText(info, 'ru');
    expect(text).toContain('урок 4');
    expect(text).toContain('2.5');
  });

  it('украинский текст содержит номер предыдущего урока', async () => {
    const info = await getLessonLockInfo(10);
    const text = getLockMessageText(info, 'uk');
    expect(text).toContain('урок 9');
  });

  it('испанский текст содержит номер предыдущего урока', async () => {
    const info = await getLessonLockInfo(7);
    const text = getLockMessageText(info, 'es');
    expect(text).toContain('6');
    expect(text).toMatch(/2[,.]5|2,5/);
  });
});

// ─── Сценарные тесты ──────────────────────────────────────────────────────────

describe('Полный сценарий прохождения уровня A1', () => {
  it('уроки 1-8 открываются последовательно при score >= 2.5', async () => {
    // Урок 1 открыт по умолчанию
    expect(await isLessonUnlocked(1)).toBe(true);

    // Проходим уроки 1-7 с бронзой
    for (let i = 1; i <= 7; i++) {
      expect(await isLessonUnlocked(i)).toBe(true);
      await tryUnlockNextLesson(i, 3.0);
      expect(await isLessonUnlocked(i + 1)).toBe(true);
    }

    // Урок 9 (A2) ещё не открыт — нужен зачёт
    expect(await isLessonUnlocked(9)).toBe(false);
  });

  it('урок 9 открывается после сдачи зачёта A1 (все уроки >= 4.5)', async () => {
    for (let i = 1; i <= 8; i++) store[`lesson${i}_best_score`] = '4.7';
    store['level_exam_A1_available'] = '1';

    // Симулируем сдачу зачёта (как в level_exam.tsx finishExam)
    store['level_exam_A1_passed'] = '1';
    await unlockLesson(9); // это то что добавили в level_exam.tsx

    expect(await isLessonUnlocked(9)).toBe(true);
  });
});

describe('Сценарий: покупка премиума открывает урок 17 (B1)', () => {
  it('урок 17 заблокирован без премиума', async () => {
    expect(await isLessonUnlocked(17)).toBe(false);
  });

  it('урок 17 открывается при покупке премиума', async () => {
    // Симулируем showSuccess() из premium_modal.tsx
    await unlockLesson(17);
    expect(await isLessonUnlocked(17)).toBe(true);
  });

  it('уроки B1 18-24 открываются последовательно после 17', async () => {
    await unlockLesson(17);
    for (let i = 17; i <= 23; i++) {
      await tryUnlockNextLesson(i, 3.0);
      expect(await isLessonUnlocked(i + 1)).toBe(true);
    }
  });
});

describe('Граничные случаи', () => {
  it('score ровно 2.5 открывает урок', async () => {
    await tryUnlockNextLesson(3, 2.5);
    expect(await isLessonUnlocked(4)).toBe(true);
  });

  it('score 2.49 не открывает урок', async () => {
    await tryUnlockNextLesson(3, 2.49);
    expect(await isLessonUnlocked(4)).toBe(false);
  });

  it('урок 32 — последний, следующего нет', async () => {
    const result = await tryUnlockNextLesson(32, 5.0);
    expect(result).toBe(false);
    expect(await isLessonUnlocked(33)).toBe(false);
  });
});
