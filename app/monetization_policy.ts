import {
  getFreeLessonLimit,
  getFreeLessonsExtra,
  getPremiumLessonsExtra,
} from './remote_flags';
import { isFeaturePremiumGated } from './feature_gates';
import { isAlwaysOpenLesson, isMainCourseLesson } from './main_course_access';

/**
 * Owner 2026-09-20: lessons 1–3 carry NO paywall — Free may reach them without
 * Plus. Owner 2026-09-20 (later, same day): being paywall-free is NOT the same
 * as being open. Only lesson 1 starts unlocked; lessons 2 and 3 must still be
 * earned with bronze ★2.5 on the previous lesson, or bought for 100 pearls.
 *
 * зачем: раньше эти два смысла были одной константой, и isFreeSampleLesson
 * коротко замыкало ВЫШЕ проверки бронзы в шести местах сразу — поэтому
 * уроки 2 и 3 открывались сами собой и вся система замков на них не работала.
 * Теперь пейвольная граница (FREE_LESSON_LIMIT) и стартовый доступ
 * (UNCONDITIONALLY_OPEN_LESSON_LIMIT) — разные величины.
 */
export const FREE_LESSON_LIMIT = 3;

/**
 * Сколько уроков открыто БЕЗ всяких условий. Ровно один: первый.
 * Всё остальное зарабатывается или покупается.
 */
export const UNCONDITIONALLY_OPEN_LESSON_LIMIT = 1;
export const BRONZE_UNLOCK_SCORE = 2.5;
const PREMIUM_SECTION_STARTERS = new Set([1, 9, 19, 29]);

export type LessonAccessState =
  | 'available'
  | 'premium_required'
  | 'progress_required';

/**
 * The main course is deliberately fail-closed: remote/legacy unlocks cannot
 * widen the three-lesson Free sample. Non-course content keeps its existing
 * remote-flag policy.
 */
export function isFreeLesson(lessonId: number): boolean {
  if (!Number.isFinite(lessonId) || lessonId < 1) return false;
  if (isMainCourseLesson(lessonId)) return lessonId <= FREE_LESSON_LIMIT;
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
  _legacyFreeLessonCap?: number,
): boolean {
  if (!Number.isFinite(lessonId) || lessonId < 1) return false;
  if (isMainCourseLesson(lessonId)) return lessonId > FREE_LESSON_LIMIT;
  return !isFreeLesson(lessonId);
}

/**
 * Урок без пейвола: Free может до него добраться без Plus.
 * Это НЕ значит «открыт» — замок прогресса на нём по-прежнему действует.
 * Для «открыт безусловно» есть isUnconditionallyOpenLesson.
 */
export function isFreeSampleLesson(lessonId: number): boolean {
  return isMainCourseLesson(lessonId) && lessonId <= FREE_LESSON_LIMIT;
}

/** Единственный урок, открытый без прогресса и без покупки. */
export function isUnconditionallyOpenLesson(lessonId: number): boolean {
  return isMainCourseLesson(lessonId) && lessonId <= UNCONDITIONALLY_OPEN_LESSON_LIMIT;
}

export function isPremiumSectionStarterLesson(lessonId: number): boolean {
  return isMainCourseLesson(lessonId) && PREMIUM_SECTION_STARTERS.has(lessonId);
}

/**
 * Free list projection. Old progress, persisted unlocks, exams and a legacy
 * cap are intentionally ignored; only the Free sample and exact durable pearl
 * grants survive.
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

  // зачем (владелец 2026-09-20): раньше здесь безусловно открывались все
  // три бесплатных урока, и замок на 2–3 был недостижим. Теперь безусловен
  // только первый урок; 2 и 3 без пейвола, но требуют бронзы ★2.5 на
  // предыдущем или покупки за 100 жемчужин.
  for (let i = 0; i < Math.min(UNCONDITIONALLY_OPEN_LESSON_LIMIT, lessonCount); i++) {
    unlocked[i] = true;
  }
  for (let i = UNCONDITIONALLY_OPEN_LESSON_LIMIT; i < Math.min(FREE_LESSON_LIMIT, lessonCount); i++) {
    if ((params.scores[i - 1] ?? 0) >= BRONZE_UNLOCK_SCORE) unlocked[i] = true;
  }
  for (const lessonId of params.purchasedLessons ?? []) {
    if (lessonId >= 1 && lessonId <= lessonCount) unlocked[lessonId - 1] = true;
  }

  return unlocked;
}

/** Plus projection: Free sample + section starters + exact pearl grants;
 * every other lesson still requires bronze on its immediate predecessor. */
export function buildPremiumLessonUnlocks(params: {
  scores: readonly number[];
  purchasedLessons?: readonly number[];
  lessonCount?: number;
}): boolean[] {
  const lessonCount = params.lessonCount ?? 32;
  const unlocked = new Array(Math.max(lessonCount, 0)).fill(false);
  const purchased = new Set(params.purchasedLessons ?? []);
  for (let i = 0; i < lessonCount; i++) {
    const lessonId = i + 1;
    // зачем: у Plus снят пейвол, но не замок прогресса. Безусловно открыт
    // первый урок и старты разделов 9/19/29; уроки 2–3 больше НЕ дарятся.
    unlocked[i] = isUnconditionallyOpenLesson(lessonId)
      || isPremiumSectionStarterLesson(lessonId)
      || purchased.has(lessonId)
      || (i > 0 && (params.scores[i - 1] ?? 0) >= BRONZE_UNLOCK_SCORE);
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
  purchased?: boolean;
  devMode?: boolean;
  noLimits?: boolean;
  legacyFreeLessonCap?: number;
}): LessonAccessState {
  const {
    lessonId,
    unlocked,
    isPremium,
    purchased = false,
    devMode = false,
    noLimits = false,
  } = params;
  // зачем (владелец 2026-09-20): раньше здесь стоял isFreeSampleLesson — уроки
  // 2 и 3 возвращали 'available' выше проверки прогресса и открывались сами.
  // Безусловен только урок 1; остальное решает замок ниже.
  if (isAlwaysOpenLesson(lessonId) || isUnconditionallyOpenLesson(lessonId)) return 'available';
  if (devMode || noLimits) return 'available';
  // Exact pearl grants are permanent entitlements and outrank subscription.
  if (purchased) return 'available';
  if (requiresPremiumForLesson(lessonId) && !isPremium) return 'premium_required';
  return unlocked ? 'available' : 'progress_required';
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
