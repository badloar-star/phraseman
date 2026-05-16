export const FREE_LESSON_LIMIT = 3;

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
