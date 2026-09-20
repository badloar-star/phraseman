import {
  getFreeLessonLimit,
  getFreeLessonsExtra,
  getPremiumLessonsExtra,
} from './remote_flags';
import { isFeaturePremiumGated } from './feature_gates';
import { isAlwaysOpenLesson, isMainCourseLesson } from './main_course_access';

/** Owner 2026-09-20: the only unconditional Free sample is lessons 1–3. */
export const FREE_LESSON_LIMIT = 3;
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

export function isFreeSampleLesson(lessonId: number): boolean {
  return isMainCourseLesson(lessonId) && lessonId <= FREE_LESSON_LIMIT;
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

  for (let i = 0; i < Math.min(FREE_LESSON_LIMIT, lessonCount); i++) unlocked[i] = true;
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
    unlocked[i] = isFreeSampleLesson(lessonId)
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
  if (isAlwaysOpenLesson(lessonId) || isFreeSampleLesson(lessonId)) return 'available';
  if (devMode || noLimits) return 'available';
  // Exact pearl grants are permanent entitlements and outrank subscription.
  if (purchased) return 'available';
  if (requiresPremiumForLesson(lessonId) && !isPremium) return 'premium_required';
  return unlocked ? 'available' : 'progress_required';
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
