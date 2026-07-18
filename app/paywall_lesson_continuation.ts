const FIRST_LEGACY_LESSON_ID = 1;
const LAST_LEGACY_LESSON_ID = 32;

export type LessonPurchaseContinuationParams = Readonly<{
  resume_kind: 'course_lesson';
  resume_lesson_id: string;
}>;

/** Accepts only a scalar lesson id; arbitrary return routes are never trusted. */
export function parseResumeLessonId(raw: unknown): number | null {
  if (typeof raw !== 'string' || !/^\d{1,2}$/.test(raw)) return null;
  const lessonId = Number(raw);
  if (!Number.isInteger(lessonId)) return null;
  if (lessonId < FIRST_LEGACY_LESSON_ID || lessonId > LAST_LEGACY_LESSON_ID) return null;
  return lessonId;
}

export function lessonPurchaseContinuationParams(lessonId: number): LessonPurchaseContinuationParams {
  if (!Number.isInteger(lessonId)
    || lessonId < FIRST_LEGACY_LESSON_ID
    || lessonId > LAST_LEGACY_LESSON_ID) {
    throw new RangeError(`Invalid legacy lesson id: ${lessonId}`);
  }
  return {
    resume_kind: 'course_lesson',
    resume_lesson_id: String(lessonId),
  };
}

export function resumeLessonAfterPremium(
  router: { replace: (href: any) => void },
  lessonId: number | null | undefined,
): boolean {
  if (lessonId == null
    || !Number.isInteger(lessonId)
    || lessonId < FIRST_LEGACY_LESSON_ID
    || lessonId > LAST_LEGACY_LESSON_ID) return false;
  router.replace({
    pathname: '/lesson_menu',
    params: { id: String(lessonId) },
  });
  return true;
}

/* expo-router route shim. */
export default function __RouteShim() { return null; }
