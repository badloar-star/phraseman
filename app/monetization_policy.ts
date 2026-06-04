export const FREE_LESSON_LIMIT = 8;
export const BRONZE_UNLOCK_SCORE = 2.5;

export type LessonAccessState =
  | 'available'
  | 'premium_required'
  | 'progress_required';

export function isFreeLesson(lessonId: number): boolean {
  return Number.isFinite(lessonId) && lessonId >= 1 && lessonId <= FREE_LESSON_LIMIT;
}

export function requiresPremiumForLesson(lessonId: number): boolean {
  return Number.isFinite(lessonId) && lessonId > FREE_LESSON_LIMIT;
}

export function buildSequentialFreeLessonUnlocks(params: {
  scores: readonly number[];
  persistedUnlocked?: readonly number[];
  lessonCount?: number;
  freeLessonLimit?: number;
}): boolean[] {
  const lessonCount = params.lessonCount ?? 32;
  const freeLessonLimit = Math.min(params.freeLessonLimit ?? FREE_LESSON_LIMIT, lessonCount);
  const unlocked = new Array(Math.max(lessonCount, 0)).fill(false);
  if (lessonCount <= 0 || freeLessonLimit <= 0) return unlocked;

  unlocked[0] = true;
  for (let i = 1; i < freeLessonLimit; i++) {
    unlocked[i] = unlocked[i - 1] && (params.scores[i - 1] ?? 0) >= BRONZE_UNLOCK_SCORE;
  }

  return unlocked;
}

export type CoursePaywallContext = 'course_after_lesson3';

export function lessonPaywallContext(lessonId: number): CoursePaywallContext {
  void lessonId;
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
