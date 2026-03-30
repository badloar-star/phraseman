/**
 * Система блокировки уроков
 * Логика: урок N разблокирован если урок N-1 пройден с оценкой >= 4.5
 * Первый урок всегда доступен
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const UNLOCKED_LESSONS_KEY = 'unlocked_lessons';
const LESSON_SCORE_KEY = (lessonId: number) => `lesson${lessonId}_score`;

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
  } catch (err) {
    console.error('Error unlocking lesson:', err);
  }
};

export const tryUnlockNextLesson = async (currentLessonId: number, score: number): Promise<boolean> => {
  if (score >= 4.5 && currentLessonId < 32) {
    const nextLessonId = currentLessonId + 1;
    await unlockLesson(nextLessonId);
    return true;
  }
  return false;
};

export const getLessonLockInfo = async (lessonId: number) => {
  const isUnlocked = await isLessonUnlocked(lessonId);
  const prevLessonId = lessonId - 1;
  let prevScore = 0;
  try {
    const scoreStr = await AsyncStorage.getItem(LESSON_SCORE_KEY(prevLessonId));
    prevScore = scoreStr ? parseFloat(scoreStr) : 0;
  } catch {
    prevScore = 0;
  }
  return { isUnlocked, prevLessonId, prevScore, requiredScore: 4.5 };
};

export const getLockMessageText = (info: Awaited<ReturnType<typeof getLessonLockInfo>>, lang: 'ru' | 'uk'): string => {
  if (lang === 'uk') {
    return `Пройди урок ${info.prevLessonId} з оцінкою >= 4.5 щоб розблокувати цей урок`;
  }
  return `Пройди урок ${info.prevLessonId} с оценкой >= 4.5 чтобы разблокировать этот урок`;
};
