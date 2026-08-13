import {
  LEARNING_V2_COURSE_LESSON_COUNT_V1,
  buildLearningV2CourseTopologyV1,
  type LearningV2CourseSessionRoleV1,
} from "../content/course_topology_v1";

export type LearningV2AccordionSessionStateV1 =
  | "completed"
  | "current"
  | "next"
  | "locked";

export type LearningV2CourseAccordionRowV1 =
  | Readonly<{
      kind: "lesson";
      id: string;
      lessonOrdinal: number;
      expanded: boolean;
    }>
  | Readonly<{
      kind: "chapter";
      id: string;
      lessonOrdinal: number;
      chapterOrdinal: number;
    }>
  | Readonly<{
      kind: "session";
      id: string;
      lessonOrdinal: number;
      sessionOrdinal: number;
      chapterOrdinal: number;
      positionInChapter: number;
      role: LearningV2CourseSessionRoleV1;
      state: LearningV2AccordionSessionStateV1;
    }>;

export type LearningV2CourseAccordionMapInputV1 = Readonly<{
  expandedLessonOrdinal: number | null;
  completedSessionIds: readonly string[];
  currentSessionId: string | null;
}>;

export type LearningV2CourseAccordionMapModelV1 = Readonly<{
  lessonCount: typeof LEARNING_V2_COURSE_LESSON_COUNT_V1;
  expandedLessonOrdinal: number | null;
  rows: readonly LearningV2CourseAccordionRowV1[];
}>;

function exactExpandedLesson(value: number | null): number | null {
  if (value === null) return null;
  if (
    !Number.isSafeInteger(value) ||
    value < 1 ||
    value > LEARNING_V2_COURSE_LESSON_COUNT_V1
  ) {
    throw new Error("learning_v2_course_accordion_expanded_lesson_invalid");
  }
  return value;
}

export function buildLearningV2CourseAccordionMapModelV1(
  input: LearningV2CourseAccordionMapInputV1,
): LearningV2CourseAccordionMapModelV1 {
  const topology = buildLearningV2CourseTopologyV1();
  const expandedLessonOrdinal = exactExpandedLesson(
    input.expandedLessonOrdinal,
  );
  const completed = new Set(input.completedSessionIds);
  const allSessionIds = new Set(
    topology.lessons.flatMap((lesson) =>
      lesson.sessions.map((session) => session.sessionId),
    ),
  );
  if (
    completed.size !== input.completedSessionIds.length ||
    input.completedSessionIds.some(
      (sessionId) => !allSessionIds.has(sessionId),
    ) ||
    (input.currentSessionId !== null &&
      !allSessionIds.has(input.currentSessionId))
  ) {
    throw new Error("learning_v2_course_accordion_progress_invalid");
  }

  const rows: LearningV2CourseAccordionRowV1[] = [];
  for (const lesson of topology.lessons) {
    const expanded = lesson.lessonOrdinal === expandedLessonOrdinal;
    rows.push(
      Object.freeze({
        kind: "lesson",
        id: lesson.lessonId,
        lessonOrdinal: lesson.lessonOrdinal,
        expanded,
      }),
    );
    if (!expanded) continue;

    for (const session of lesson.sessions) {
      if (session.positionInChapter === 1) {
        rows.push(
          Object.freeze({
            kind: "chapter",
            id: `${lesson.lessonId}:chapter:${String(session.chapterOrdinal).padStart(2, "0")}`,
            lessonOrdinal: lesson.lessonOrdinal,
            chapterOrdinal: session.chapterOrdinal,
          }),
        );
      }
      const state: LearningV2AccordionSessionStateV1 = completed.has(
        session.sessionId,
      )
        ? "completed"
        : input.currentSessionId === session.sessionId
          ? "current"
          : session.sessionOrdinal === 1 && input.currentSessionId === null
            ? "current"
            : input.currentSessionId !== null &&
                lesson.sessions.findIndex(
                  (candidate) => candidate.sessionId === input.currentSessionId,
                ) +
                  2 ===
                  session.sessionOrdinal
              ? "next"
              : "locked";
      rows.push(
        Object.freeze({
          kind: "session",
          id: session.sessionId,
          lessonOrdinal: lesson.lessonOrdinal,
          sessionOrdinal: session.sessionOrdinal,
          chapterOrdinal: session.chapterOrdinal,
          positionInChapter: session.positionInChapter,
          role: session.role,
          state,
        }),
      );
    }
  }

  return Object.freeze({
    lessonCount: LEARNING_V2_COURSE_LESSON_COUNT_V1,
    expandedLessonOrdinal,
    rows: Object.freeze(rows),
  });
}
