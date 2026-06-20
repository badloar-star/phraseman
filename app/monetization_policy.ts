import {
  getFreeLessonLimit,
  getFreeLessonsExtra,
  getPremiumLessonsExtra,
} from './remote_flags';
import { isFeaturePremiumGated } from './feature_gates';

/** Default free-lesson limit. Runtime checks use the remote-tunable value via
 *  getFreeLessonLimit(); this constant is the build-time fallback for static
 *  callers and is kept in sync with remote_flags' default. */
export const FREE_LESSON_LIMIT = 8;
export const BRONZE_UNLOCK_SCORE = 2.5;

export type LessonAccessState =
  | 'available'
  | 'premium_required'
  | 'progress_required';

/**
 * Бесплатен ли урок. Правило (приоритет сверху вниз):
 *   1. Весь раздел уроков переведён в «Фри» (gate_lessons_premium=false) → все бесплатны.
 *   2. Урок в premium_lessons_extra → ПРЕМИУМ (исключение поверх порога).
 *   3. Урок в free_lessons_extra → бесплатен (исключение поверх порога).
 *   4. Иначе порог: id ≤ free_lesson_limit → бесплатен.
 */
export function isFreeLesson(lessonId: number): boolean {
  if (!Number.isFinite(lessonId) || lessonId < 1) return false;
  if (!isFeaturePremiumGated('lessons')) return true;
  if (getPremiumLessonsExtra().has(lessonId)) return false;
  if (getFreeLessonsExtra().has(lessonId)) return true;
  return lessonId <= getFreeLessonLimit();
}

export function requiresPremiumForLesson(lessonId: number): boolean {
  if (!Number.isFinite(lessonId) || lessonId < 1) return false;
  return !isFreeLesson(lessonId);
}

export function buildSequentialFreeLessonUnlocks(params: {
  scores: readonly number[];
  persistedUnlocked?: readonly number[];
  lessonCount?: number;
  freeLessonLimit?: number;
}): boolean[] {
  const lessonCount = params.lessonCount ?? 32;
  const freeLessonLimit = Math.min(params.freeLessonLimit ?? getFreeLessonLimit(), lessonCount);
  const unlocked = new Array(Math.max(lessonCount, 0)).fill(false);
  if (lessonCount <= 0) return unlocked;

  if (freeLessonLimit > 0) {
    unlocked[0] = true;
    for (let i = 1; i < freeLessonLimit; i++) {
      unlocked[i] = unlocked[i - 1] && (params.scores[i - 1] ?? 0) >= BRONZE_UNLOCK_SCORE;
    }
  }

  // Поурочные исключения «Пульта»: урок, открытый бесплатно ПОВЕРХ порога
  // (free_lessons_extra) или когда весь раздел переведён в «Фри», доступен сразу,
  // без бронзовой цепочки. ВНИМАНИЕ: уроки внутри обычного порога так не трогаем —
  // там сохраняется последовательная разблокировка по бронзе (см. цикл выше).
  const wholeFeatureFree = !isFeaturePremiumGated('lessons');
  const freeExtra = getFreeLessonsExtra();
  for (let i = 0; i < lessonCount; i++) {
    const id = i + 1;
    if (wholeFeatureFree || freeExtra.has(id)) unlocked[i] = true;
  }

  return unlocked;
}

export type CoursePaywallContext = 'course_after_lesson3';

export function lessonPaywallContext(lessonId: number): CoursePaywallContext | null {
  if (isFreeLesson(lessonId)) return null;
  return 'course_after_lesson3';
}

export function resolveLessonAccess(params: {
  lessonId: number;
  unlocked: boolean;
  isPremium: boolean;
  devMode?: boolean;
  noLimits?: boolean;
}): LessonAccessState {
  const { lessonId, unlocked, isPremium, devMode = false, noLimits = false } = params;
  if (devMode || noLimits) return 'available';
  if (requiresPremiumForLesson(lessonId) && !isPremium) return 'premium_required';
  return unlocked ? 'available' : 'progress_required';
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
