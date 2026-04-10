/**
 * Система блокировки уроков
 *
 * Правила разблокировки:
 * - Следующий урок в рамках уровня: score >= 2.5 (бронза)
 * - Зачёт уровня: все уроки этого уровня >= 4.5
 * - Экзамен профессора Лингмана: все уроки всех уровней = 5.0 + все зачёты сданы
 *
 * Первый урок всегда доступен.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { CEFR_RANGES } from './medal_utils';

const UNLOCKED_LESSONS_KEY = 'unlocked_lessons';

// ─── Урок ────────────────────────────────────────────────────────────────────

export const isLessonUnlocked = async (lessonId: number): Promise<boolean> => {
  if (lessonId === 1) return true;
  try {
    const unlockedStr = await AsyncStorage.getItem(UNLOCKED_LESSONS_KEY);
    const unlocked: number[] = unlockedStr ? JSON.parse(unlockedStr) : [];
    return unlocked.includes(lessonId);
  } catch {
    return false;
  }
};

export const unlockLesson = async (lessonId: number): Promise<void> => {
  try {
    const unlockedStr = await AsyncStorage.getItem(UNLOCKED_LESSONS_KEY);
    const unlocked: number[] = unlockedStr ? JSON.parse(unlockedStr) : [];
    if (!unlocked.includes(lessonId)) {
      unlocked.push(lessonId);
      await AsyncStorage.setItem(UNLOCKED_LESSONS_KEY, JSON.stringify(unlocked));
    }
  } catch {}
};

/** Разблокирует следующий урок если score >= 2.5 (бронза). Возвращает true если разблокировал. */
export const tryUnlockNextLesson = async (currentLessonId: number, score: number): Promise<boolean> => {
  if (score >= 2.5 && currentLessonId < 32) {
    const nextLessonId = currentLessonId + 1;
    const alreadyUnlocked = await isLessonUnlocked(nextLessonId);
    if (!alreadyUnlocked) {
      await unlockLesson(nextLessonId);
      return true;
    }
  }
  return false;
};

export const getLessonLockInfo = async (lessonId: number) => {
  const isUnlocked = await isLessonUnlocked(lessonId);
  const prevLessonId = lessonId - 1;
  return { isUnlocked, prevLessonId, prevScore: 0, requiredScore: 2.5 };
};

export const getLockMessageText = (info: Awaited<ReturnType<typeof getLessonLockInfo>>, lang: 'ru' | 'uk'): string => {
  if (lang === 'uk') {
    return `Пройди урок ${info.prevLessonId} з оцінкою >= 2.5 щоб розблокувати цей урок`;
  }
  return `Пройди урок ${info.prevLessonId} с оценкой >= 2.5 чтобы разблокировать этот урок`;
};

// ─── Зачёт уровня ─────────────────────────────────────────────────────────────

/**
 * Возвращает название уровня (A1/A2/B1/B2) если зачёт этого уровня был ТОЛЬКО ЧТО разблокирован
 * (т.е. все уроки уровня впервые достигли >= 4.5).
 * Иначе возвращает null.
 */
export const tryUnlockLevelExam = async (lessonId: number): Promise<string | null> => {
  try {
    // Найти уровень урока
    let foundLevel: string | null = null;
    for (const [lvl, [from, to]] of Object.entries(CEFR_RANGES)) {
      if (lessonId >= from && lessonId <= to) { foundLevel = lvl; break; }
    }
    if (!foundLevel) return null;

    // Уже было разблокировано ранее?
    const alreadyKey = `level_exam_${foundLevel}_available`;
    const already = await AsyncStorage.getItem(alreadyKey);
    if (already === '1') return null;

    // Проверяем что все уроки уровня имеют best_score >= 4.5
    const [from, to] = CEFR_RANGES[foundLevel];
    const keys = Array.from({ length: to - from + 1 }, (_, i) => `lesson${from + i}_best_score`);
    const pairs = await AsyncStorage.multiGet(keys);
    const allReady = pairs.every(([, v]) => (parseFloat(v ?? '0') || 0) >= 4.5);
    if (!allReady) return null;

    // Разблокируем впервые
    await AsyncStorage.setItem(alreadyKey, '1');
    return foundLevel;
  } catch {
    return null;
  }
};

// ─── Экзамен профессора Лингмана ──────────────────────────────────────────────

/**
 * Возвращает true если экзамен Лингмана был ТОЛЬКО ЧТО разблокирован:
 * все 32 урока = 5.0 И все 4 зачёта сданы (level_exam_X_passed = '1').
 */
export const tryUnlockLingmanExam = async (): Promise<boolean> => {
  try {
    const alreadyKey = 'lingman_exam_available';
    const already = await AsyncStorage.getItem(alreadyKey);
    if (already === '1') return false;

    // Все 32 урока должны иметь best_score = 5.0
    const lessonKeys = Array.from({ length: 32 }, (_, i) => `lesson${i + 1}_best_score`);
    const lessonPairs = await AsyncStorage.multiGet(lessonKeys);
    const allPerfect = lessonPairs.every(([, v]) => (parseFloat(v ?? '0') || 0) >= 5.0);
    if (!allPerfect) return false;

    // Все 4 зачёта должны быть сданы
    const examKeys = ['A1', 'A2', 'B1', 'B2'].map(lvl => `level_exam_${lvl}_passed`);
    const examPairs = await AsyncStorage.multiGet(examKeys);
    const allPassed = examPairs.every(([, v]) => v === '1');
    if (!allPassed) return false;

    await AsyncStorage.setItem(alreadyKey, '1');
    return true;
  } catch {
    return false;
  }
};

/** Синхронная проверка (без флага "впервые") — для UI exam.tsx */
export const isLingmanExamAvailable = async (): Promise<boolean> => {
  try {
    const lessonKeys = Array.from({ length: 32 }, (_, i) => `lesson${i + 1}_best_score`);
    const lessonPairs = await AsyncStorage.multiGet(lessonKeys);
    const allPerfect = lessonPairs.every(([, v]) => (parseFloat(v ?? '0') || 0) >= 5.0);
    if (!allPerfect) return false;

    const examKeys = ['A1', 'A2', 'B1', 'B2'].map(lvl => `level_exam_${lvl}_passed`);
    const examPairs = await AsyncStorage.multiGet(examKeys);
    return examPairs.every(([, v]) => v === '1');
  } catch {
    return false;
  }
};
