/** Local Learning V2 access rule: R1 — every lesson is free (owner 13.10); the old limit of two free lessons is kept but not applied. */
export const LEARNING_V2_FREE_LESSON_LIMIT = 2;

let loggedFreeAll = false;

export function learningV2LessonRequiresPremium(
  lessonOrdinal: number,
): boolean {
  // зачем: владелец 13.10 — все уроки V2 бесплатны в R1 (замок «Уроки 3+ доступны в Plus» снят). Лимит остаётся константой
  // на случай возврата платности после R1; сейчас он не применяется.
  if (!loggedFreeAll) {
    loggedFreeAll = true;
    console.log(`[V2-ACCESS] free=all (решение владельца 13.10), прежний лимит ${LEARNING_V2_FREE_LESSON_LIMIT} не применяется; первый запрос урока ${String(lessonOrdinal)}`); // guard-ok: одна строка на запуск
  }
  return false;
}

export function learningV2LessonIsAccessible(
  lessonOrdinal: number,
  isPremium: boolean,
): boolean {
  return isPremium || !learningV2LessonRequiresPremium(lessonOrdinal);
}
