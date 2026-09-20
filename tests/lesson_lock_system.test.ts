/**
 * tests/lesson_lock_system.test.ts
 *
 * Тесты для системы управления блокировкой/разблокировкой уроков
 */

// Mock AsyncStorage
// зачем (аудит 2026-09-17): const попадал в TDZ — jest поднимает jest.mock
// выше импортов, а модули (feature_gates → boons) читают AsyncStorage прямо
// на загрузке. var поднимается вместе с моком и всегда доступен.
var store: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((key: string) => Promise.resolve(store[key] ?? null)),
  setItem: jest.fn((key: string, value: string) => { store[key] = value; return Promise.resolve(); }),
  multiGet: jest.fn((keys: string[]) => Promise.resolve(keys.map(k => [k, store[k] ?? null]))),
  multiSet: jest.fn((pairs: [string, string][]) => { pairs.forEach(([k, v]) => { store[k] = v; }); return Promise.resolve(); }),
  removeItem: jest.fn((key: string) => { delete store[key]; return Promise.resolve(); }),
}));

import {
  isLessonUnlocked,
  unlockLesson,
  tryUnlockNextLesson,
  tryUnlockLevelExam,
  repairLessonUnlocksAfterRestore,
  recomputeEarnedUnlocks,
  getLessonLockInfo,
  getLockMessageText,
  getPremiumCourseLevel,
  canUnlockNextLessonAfterCompletion,
  isLessonUnlockedByEarnedProgress,
  isLessonUnlockedByPremiumCourse,
  markPremiumCourseLevelReached,
  shouldAnnounceNextLessonUnlock,
} from '../app/lesson_lock_system';


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

  it('цепочка A1 у Plus: уроки 1→2→3→...→8 открываются последовательно', async () => {
    for (let i = 1; i <= 7; i++) {
      await tryUnlockNextLesson(i, 3.0, undefined, true);
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
    await tryUnlockNextLesson(5, 5.0, undefined, true);
    expect(await isLessonUnlocked(6)).toBe(true);
  });

  it('score = 2.5 (бронза минимум) открывает следующий урок внутри уровня', async () => {
    await tryUnlockNextLesson(7, 2.5, undefined, true);
    expect(await isLessonUnlocked(8)).toBe(true);
  });

  it('последний урок уровня не открывает следующий уровень по 2.5', async () => {
    await tryUnlockNextLesson(8, 2.5);
    expect(await isLessonUnlocked(9)).toBe(false);

    await tryUnlockNextLesson(18, 5.0);
    expect(await isLessonUnlocked(19)).toBe(false);

    await tryUnlockNextLesson(28, 5.0);
    expect(await isLessonUnlocked(29)).toBe(false);
  });

  it('repair держит урок 9 закрытым до сдачи зачёта A1', async () => {
    for (let i = 1; i <= 8; i++) store[`lesson${i}_best_score`] = '5';
    await repairLessonUnlocksAfterRestore();

    expect(await isLessonUnlocked(9)).toBe(false);
  });

  it('repair открывает урок 9 после сдачи зачёта A1', async () => {
    store['level_exam_A1_passed'] = '1';
    await repairLessonUnlocksAfterRestore();

    expect(await isLessonUnlocked(9)).toBe(true);
  });
});

describe('isLessonUnlockedByEarnedProgress', () => {
  // ВНИМАНИЕ: до 2026-09-20 ждалось true для 2 и 3 — сторож охранял мёртвый
  // замок. Владелец 2026-09-20: безусловен только урок 1.
  it('без прогресса открыт только первый урок', async () => {
    expect(await isLessonUnlockedByEarnedProgress(1)).toBe(true);
    expect(await isLessonUnlockedByEarnedProgress(2)).toBe(false);
    expect(await isLessonUnlockedByEarnedProgress(3)).toBe(false);
  });

  it('бронза открывает следующий бесплатный урок по одному', async () => {
    store.lesson1_best_score = '2.5';
    expect(await isLessonUnlockedByEarnedProgress(2)).toBe(true);
    expect(await isLessonUnlockedByEarnedProgress(3)).toBe(false);
    store.lesson2_best_score = '2.5';
    expect(await isLessonUnlockedByEarnedProgress(3)).toBe(true);
  });

  it('оценка ниже бронзы не открывает второй урок', async () => {
    store.lesson1_best_score = '2.4';
    expect(await isLessonUnlockedByEarnedProgress(2)).toBe(false);
  });

  it('старый прогресс и unlocked_lessons не открывают Free урок после третьего', async () => {
    await unlockLesson(4);
    store.lesson3_best_score = '5';
    store.lesson4_best_score = '5';
    expect(await isLessonUnlockedByEarnedProgress(4)).toBe(false);
  });

  it('точная жемчужная покупка открывает урок после окончания Plus', async () => {
    store.lessons_pearl_unlocked_v1 = JSON.stringify([17]);
    expect(await isLessonUnlockedByEarnedProgress(17)).toBe(true);
    expect(await isLessonUnlockedByEarnedProgress(18)).toBe(false);
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

  it('A2: все уроки 9-18 >= 4.5 → зачёт A2 доступен', async () => {
    for (let i = 9; i <= 18; i++) store[`lesson${i}_best_score`] = '4.8';
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

  it('урок 4 закрыт без жемчужной покупки', async () => {
    const info = await getLessonLockInfo(4);
    expect(info.isUnlocked).toBe(false);
    expect(info.prevLessonId).toBe(3);
    expect(info.requiredScore).toBe(2.5);
  });

  it('урок 2 закрыт без бронзы и открывается с ней', async () => {
    expect((await getLessonLockInfo(2)).isUnlocked).toBe(false);
    store.lesson1_best_score = '2.5';
    expect((await getLessonLockInfo(2)).isUnlocked).toBe(true);
  });
});

describe('getLockMessageText', () => {
  it('русский текст — ровно «Ещё рано»', async () => {
    const info = await getLessonLockInfo(5);
    const text = getLockMessageText(info, 'ru');
    expect(text).toBe('Ещё рано');
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
      await tryUnlockNextLesson(i, 3.0, undefined, true);
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

describe('Premium-доступ по последовательному прогрессу', () => {
  // Владелец 2026-09-20: Plus снимает пейвол, но не замок — уроки 2–3 тоже за бронзой.
  it('Plus сразу открывает урок 1 и первый урок каждого раздела', async () => {
    for (const lessonId of [1, 9, 19, 29]) {
      expect(await isLessonUnlockedByPremiumCourse(lessonId)).toBe(true);
    }
    for (const lessonId of [2, 3, 4, 8, 10, 18, 20, 28, 30, 32]) {
      expect(await isLessonUnlockedByPremiumCourse(lessonId)).toBe(false);
    }
  });

  it('у Plus урок 2 открывается бронзой на первом', async () => {
    store.lesson1_best_score = '2.5';
    expect(await isLessonUnlockedByPremiumCourse(2)).toBe(true);
  });

  it('бронза на предыдущем уроке открывает следующий Plus-урок', async () => {
    store.lesson9_best_score = '2.5';
    expect(await isLessonUnlockedByPremiumCourse(10)).toBe(true);
    expect(await isLessonUnlockedByPremiumCourse(11)).toBe(false);
  });

  it('достигнутый уровень не открывает Plus-раздел целиком', async () => {
    store['level_exam_A2_passed'] = '1';
    await markPremiumCourseLevelReached('B1');
    expect(await getPremiumCourseLevel()).toBe('B1');
    expect(await isLessonUnlockedByPremiumCourse(20)).toBe(false);
    expect(await isLessonUnlockedByPremiumCourse(28)).toBe(false);
  });

  it('купленный за жемчуг урок открыт и у подписчика', async () => {
    store['lessons_pearl_unlocked_v1'] = JSON.stringify([9]);
    expect(await isLessonUnlockedByPremiumCourse(9)).toBe(true);
  });

  it('при снятии Premium остаются free-тройка и точные покупки', async () => {
    await unlockLesson(4);
    await unlockLesson(20);
    store['lesson1_best_score'] = '5';
    store['lesson2_best_score'] = '5';
    store['lesson3_best_score'] = '5';
    store['lessons_pearl_unlocked_v1'] = JSON.stringify([20]);

    await recomputeEarnedUnlocks();

    // Проекция больше НЕ дарит уроки 2–3 (владелец 2026-09-20): в массиве
    // остаются только урок 1 и точные покупки. Заработанный доступ к 2–3
    // при этом НЕ теряется — он считается живьём из best_score.
    expect(await isLessonUnlocked(1)).toBe(true);
    expect(await isLessonUnlocked(4)).toBe(false);
    expect(await isLessonUnlocked(20)).toBe(true);
    expect(await isLessonUnlockedByEarnedProgress(2)).toBe(true);
    expect(await isLessonUnlockedByEarnedProgress(3)).toBe(true);
    expect(await isLessonUnlockedByEarnedProgress(4)).toBe(false);
  });
});

describe('Граничные случаи', () => {
  it('Free после урока 3 не записывает unlock урока 4 и не анонсирует его', async () => {
    const result = await tryUnlockNextLesson(3, 5, undefined, false);
    expect(result).toBe(false);
    expect(canUnlockNextLessonAfterCompletion(3, false)).toBe(false);
    expect(shouldAnnounceNextLessonUnlock(3, true, false)).toBe(false);
    expect(await isLessonUnlocked(4)).toBe(false);
  });

  it('Plus после урока 3 записывает и анонсирует unlock урока 4', async () => {
    const result = await tryUnlockNextLesson(3, 2.5, undefined, true);
    expect(result).toBe(true);
    expect(canUnlockNextLessonAfterCompletion(3, true)).toBe(true);
    expect(shouldAnnounceNextLessonUnlock(3, result, true)).toBe(true);
    expect(await isLessonUnlocked(4)).toBe(true);
  });

  it('видимый subtitle зависит от фактического didUnlock, а не только от Plus', () => {
    expect(shouldAnnounceNextLessonUnlock(4, false, true)).toBe(false);
    expect(shouldAnnounceNextLessonUnlock(4, true, true)).toBe(true);
    expect(shouldAnnounceNextLessonUnlock(3, true, false)).toBe(false);
  });

  it('score 2.49 не открывает урок', async () => {
    await tryUnlockNextLesson(3, 2.49, undefined, true);
    expect(await isLessonUnlocked(4)).toBe(false);
  });

  it('урок 32 — последний, следующего нет', async () => {
    const result = await tryUnlockNextLesson(32, 5.0);
    expect(result).toBe(false);
    expect(await isLessonUnlocked(33)).toBe(false);
  });
});
