export type LearningV2SessionRouteCoordinatesV1 = Readonly<{
  lessonOrdinal: number;
  sessionOrdinal: number;
}>;

const exactOrdinal = (value: string, max: number): number | null => {
  if (!/^\d+$/u.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 1 && parsed <= max ? parsed : null;
};

/** Resolves one canonical session coordinate and rejects conflicting route claims. */
export function resolveLearningV2SessionRouteCoordinatesV1(input: Readonly<{
  id: string;
  lessonOrdinal: string;
  sessionOrdinal: string;
}>): LearningV2SessionRouteCoordinatesV1 | null {
  const idMatch = /^lesson-(\d{2}):session:(\d{2})$/u.exec(input.id);
  const idLesson = idMatch ? exactOrdinal(idMatch[1]!, 32) : null;
  const idSession = idMatch ? exactOrdinal(idMatch[2]!, 56) : null;
  const hasQueryLesson = input.lessonOrdinal.length > 0;
  const hasQuerySession = input.sessionOrdinal.length > 0;
  const queryLesson = hasQueryLesson ? exactOrdinal(input.lessonOrdinal, 32) : null;
  const querySession = hasQuerySession ? exactOrdinal(input.sessionOrdinal, 56) : null;

  if ((input.id.length > 0 && (!idLesson || !idSession)) ||
    (hasQueryLesson && !queryLesson) || (hasQuerySession && !querySession) ||
    (hasQueryLesson !== hasQuerySession)) return null;

  if (idLesson && queryLesson && idLesson !== queryLesson) return null;
  if (idSession && querySession && idSession !== querySession) return null;

  const lessonOrdinal = queryLesson ?? idLesson;
  const sessionOrdinal = querySession ?? idSession;
  return lessonOrdinal && sessionOrdinal
    ? Object.freeze({ lessonOrdinal, sessionOrdinal })
    : null;
}
