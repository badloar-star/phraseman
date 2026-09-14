/** Owner decision, 2026-09-08: all 32 main lessons are open to everyone.
 * This does not grant Plus, exam completion, rewards or access to other features.
 * Stale remote paywall flags and saved progress cannot close these lessons.
 */
export const MAIN_COURSE_LESSON_COUNT = 32;

export function isOpenMainCourseLesson(lessonId: number): boolean {
  return Number.isInteger(lessonId) && lessonId >= 1 && lessonId <= MAIN_COURSE_LESSON_COUNT;
}

export default function __RouteShim() { return null; }
