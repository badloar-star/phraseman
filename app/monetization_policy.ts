import {
  getFreeLessonLimit,
  getFreeLessonsExtra,
  getPremiumLessonsExtra,
} from './remote_flags';
import { isFeaturePremiumGated } from './feature_gates';
import { isAlwaysOpenLesson, isMainCourseLesson } from './main_course_access';

/** Historical free-sample threshold, retained for legacy caps and migrations. */
export const FREE_LESSON_LIMIT = 3;
export const BRONZE_UNLOCK_SCORE = 2.5;

export type LessonAccessState =
  | 'available'
  | 'premium_required'
  | 'progress_required';

/**
 * Бесплатен ли урок — то есть НЕ требует ли он денег.
 *
 * зачем (владелец 2026-09-17, «заблокированы… не пейволом»): уроки основного
 * курса остаются бесплатными навсегда, денег за них не просят. Закрывает их
 * прогресс (см. lesson_lock_system), а это другой вопрос — не путать
 * «бесплатен» с «открыт».
 *
 *   0. Основные уроки 1–32 — всегда бесплатны, пейвол к ним не применяется.
 *   1. Весь раздел уроков переведён в «Фри» (gate_lessons_premium=false) → все бесплатны.
 *   2. Урок в premium_lessons_extra → ПРЕМИУМ (исключение поверх порога).
 *   3. Урок в free_lessons_extra → бесплатен (исключение поверх порога).
 *   4. Иначе порог: id ≤ free_lesson_limit → бесплатен.
 */
export function isFreeLesson(lessonId: number): boolean {
  if (isMainCourseLesson(lessonId)) return true;
  if (!Number.isFinite(lessonId) || lessonId < 1) return false;
  if (!isFeaturePremiumGated('lessons')) return true;
  if (getPremiumLessonsExtra().has(lessonId)) return false;
  if (getFreeLessonsExtra().has(lessonId)) return true;
  return lessonId <= getFreeLessonLimit();
}

function normalizedLegacyFreeLessonCap(legacyFreeLessonCap?: number): number {
  if (!Number.isFinite(legacyFreeLessonCap)) return 0;
  return Math.min(8, Math.max(FREE_LESSON_LIMIT, Math.trunc(legacyFreeLessonCap ?? 0)));
}

export function hasLegacyFreeLessonAccess(
  lessonId: number,
  legacyFreeLessonCap?: number,
): boolean {
  if (!Number.isFinite(lessonId) || lessonId < 1) return false;
  return lessonId <= normalizedLegacyFreeLessonCap(legacyFreeLessonCap);
}

export function isLegacyLessonGrandfatheredOpen(
  lessonId: number,
  legacyFreeLessonCap?: number,
): boolean {
  return normalizedLegacyFreeLessonCap(legacyFreeLessonCap) > FREE_LESSON_LIMIT &&
    hasLegacyFreeLessonAccess(lessonId, legacyFreeLessonCap);
}

export function requiresPremiumForLesson(
  lessonId: number,
  legacyFreeLessonCap?: number,
): boolean {
  if (!Number.isFinite(lessonId) || lessonId < 1) return false;
  if (hasLegacyFreeLessonAccess(lessonId, legacyFreeLessonCap)) return false;
  return !isFreeLesson(lessonId);
}

/**
 * Карта открытых уроков для списка (владелец 2026-09-17: курс открывается
 * по мере прохождения).
 *
 * Правила, сверху вниз:
 *   1. Урок 1 — всегда открыт.
 *   2. Куплен за 100 жемчужин — открыт навсегда (`purchasedLessons`).
 *   3. Уже пройден самим человеком (`scores[i] > 0`) — не отбираем.
 *   4. Урок 9/19/29 — только сданный зачёт предыдущего уровня (`passedExams`).
 *   5. Остальные — предыдущий урок пройден на бронзу ★2.5+.
 *
 * зачем цепочка сплошная до 32: прежний вариант считал бронзу только внутри
 * free_lesson_limit, а всё выше отдавал пейволу. Уроки бесплатны, поэтому
 * флаги «Пульта» про деньги (gate_lessons_premium, free_lessons_extra) здесь
 * больше НЕ открывают доступ — иначе «весь раздел во Фри» снова распахнул бы
 * курс целиком, ровно то, что владелец просил убрать.
 */
export function buildSequentialFreeLessonUnlocks(params: {
  scores: readonly number[];
  persistedUnlocked?: readonly number[];
  purchasedLessons?: readonly number[];
  passedExams?: Readonly<Record<string, boolean>>;
  lessonCount?: number;
  freeLessonLimit?: number;
  legacyFreeLessonCap?: number;
}): boolean[] {
  const lessonCount = params.lessonCount ?? 32;
  const unlocked = new Array(Math.max(lessonCount, 0)).fill(false);
  if (lessonCount <= 0) return unlocked;

  const purchased = new Set(params.purchasedLessons ?? []);
  const exams = params.passedExams ?? {};
  // Зачёт, который открывает границу: урок 9 ← A1, 19 ← A2, 29 ← B1.
  const gateExamForLesson: Readonly<Record<number, string>> = { 9: 'A1', 19: 'A2', 29: 'B1' };

  unlocked[0] = true;
  for (let i = 1; i < lessonCount; i++) {
    const id = i + 1;
    if (purchased.has(id)) {
      unlocked[i] = true;
      continue;
    }
    // зачем (аудит 2026-09-17): с 2026-09-08 по 2026-09-17 курс был открыт
    // весь, и человек мог пройти урок 15 или 9, не трогая предыдущий. Уже
    // пройденный урок не отбираем. Порядок и условие ТЕ ЖЕ, что в
    // isLessonUnlockedByEarnedProgress — иначе карточка покажет замок на
    // уроке, который экран урока открывает (класс бага «карточка врёт»).
    if ((params.scores[i] ?? 0) > 0) {
      unlocked[i] = true;
      continue;
    }
    const gateExam = gateExamForLesson[id];
    if (gateExam) {
      unlocked[i] = exams[gateExam] === true;
      continue;
    }
    unlocked[i] = (params.scores[i - 1] ?? 0) >= BRONZE_UNLOCK_SCORE;
  }

  const legacyCap = normalizedLegacyFreeLessonCap(params.legacyFreeLessonCap);
  if (legacyCap > FREE_LESSON_LIMIT) {
    for (let i = 0; i < Math.min(legacyCap, lessonCount); i++) unlocked[i] = true;
  }

  return unlocked;
}

export type CoursePaywallContext = 'course_after_lesson3';

export function lessonPaywallContext(
  lessonId: number,
  legacyFreeLessonCap?: number,
): CoursePaywallContext | null {
  if (!requiresPremiumForLesson(lessonId, legacyFreeLessonCap)) return null;
  return 'course_after_lesson3';
}

export function resolveLessonAccess(params: {
  lessonId: number;
  unlocked: boolean;
  isPremium: boolean;
  devMode?: boolean;
  noLimits?: boolean;
  legacyFreeLessonCap?: number;
}): LessonAccessState {
  const {
    lessonId,
    unlocked,
    isPremium,
    devMode = false,
    noLimits = false,
    legacyFreeLessonCap,
  } = params;
  // зачем (владелец 2026-09-17): урок 1 открыт всегда; остальное решает
  // переданный `unlocked` — он уже учитывает прогресс и покупку за жемчуг.
  if (isAlwaysOpenLesson(lessonId)) return 'available';
  if (devMode || noLimits) return 'available';
  if (isLegacyLessonGrandfatheredOpen(lessonId, legacyFreeLessonCap)) return 'available';
  if (requiresPremiumForLesson(lessonId, legacyFreeLessonCap) && !isPremium) return 'premium_required';
  return unlocked ? 'available' : 'progress_required';
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
