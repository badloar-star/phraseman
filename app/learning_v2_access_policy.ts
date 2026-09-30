/** Local Learning V2 access rule: first two full lessons are free; later lessons require Plus. */
export const LEARNING_V2_FREE_LESSON_LIMIT = 2;

export function learningV2LessonRequiresPremium(
  lessonOrdinal: number,
): boolean {
  return Number.isFinite(lessonOrdinal) && lessonOrdinal > LEARNING_V2_FREE_LESSON_LIMIT;
}

export function learningV2LessonIsAccessible(
  lessonOrdinal: number,
  isPremium: boolean,
): boolean {
  return isPremium || !learningV2LessonRequiresPremium(lessonOrdinal);
}
