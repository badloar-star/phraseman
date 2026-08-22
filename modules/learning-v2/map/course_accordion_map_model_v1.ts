import {
  LEARNING_V2_CHAPTER_SESSION_COUNT_V1,
  LEARNING_V2_COURSE_LESSON_COUNT_V1,
  LEARNING_V2_LESSON_SESSION_COUNT_V1,
  learningV2CourseLessonIdV1,
  learningV2CourseSessionIdV1,
  learningV2CourseSessionRoleV1,
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
  projectionScopeKey: string;
  expandedLessonOrdinal: number | null;
  completedSessionIds: readonly string[];
  currentSessionId: string | null;
}>;

declare const learningV2PreparedAccordionProgressBrandV1: unique symbol;

export type LearningV2PreparedAccordionProgressV1 = Readonly<{
  readonly [learningV2PreparedAccordionProgressBrandV1]: true;
}>;

export type LearningV2PreparedAccordionProgressInputV1 = Readonly<{
  completedSessionIds: readonly string[];
  currentSessionId: string | null;
}>;

export type LearningV2PreparedCourseAccordionMapInputV1 = Readonly<{
  projectionScopeKey: string;
  expandedLessonOrdinal: number | null;
  preparedProgress: LearningV2PreparedAccordionProgressV1;
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

const SESSION_ID_PATTERN = /^lesson-(\d{2}):session:(\d{2})$/;
const PROJECTION_CACHE_LIMIT = 8;

type SessionCoordinate = Readonly<{
  lessonOrdinal: number;
  sessionOrdinal: number;
}>;

type PreparedProgressInternals = Readonly<{
  completed: ReadonlySet<string>;
  currentSessionId: string | null;
  currentCoordinate: SessionCoordinate | null;
}>;

type ProjectionCacheEntry = Readonly<{
  projectionScopeKey: string;
  expandedLessonOrdinal: number | null;
  preparedProgress: LearningV2PreparedAccordionProgressV1;
  model: LearningV2CourseAccordionMapModelV1;
}>;

const preparedProgressInternals = new WeakMap<
  LearningV2PreparedAccordionProgressV1,
  PreparedProgressInternals
>();
const preparedProgressByRawInput = new WeakMap<
  LearningV2CourseAccordionMapInputV1,
  LearningV2PreparedAccordionProgressV1
>();
const projectionCache: ProjectionCacheEntry[] = [];

function exactProjectionScope(value: string): string {
  if (value.length === 0) {
    throw new Error("learning_v2_course_accordion_scope_invalid");
  }
  return value;
}

function parseSessionCoordinate(value: string): SessionCoordinate | null {
  const match = SESSION_ID_PATTERN.exec(value);
  if (!match) return null;
  const lessonOrdinal = Number(match[1]);
  const sessionOrdinal = Number(match[2]);
  if (
    !Number.isSafeInteger(lessonOrdinal) ||
    lessonOrdinal < 1 ||
    lessonOrdinal > LEARNING_V2_COURSE_LESSON_COUNT_V1 ||
    !Number.isSafeInteger(sessionOrdinal) ||
    sessionOrdinal < 1 ||
    sessionOrdinal > LEARNING_V2_LESSON_SESSION_COUNT_V1 ||
    learningV2CourseSessionIdV1(lessonOrdinal, sessionOrdinal) !== value
  ) {
    return null;
  }
  return Object.freeze({ lessonOrdinal, sessionOrdinal });
}

function rememberProjection(
  entry: ProjectionCacheEntry,
): LearningV2CourseAccordionMapModelV1 {
  projectionCache.push(entry);
  if (projectionCache.length > PROJECTION_CACHE_LIMIT) projectionCache.shift();
  return entry.model;
}

export function prepareLearningV2CourseAccordionProgressV1(
  input: LearningV2PreparedAccordionProgressInputV1,
): LearningV2PreparedAccordionProgressV1 {
  const completed = new Set(input.completedSessionIds);
  const currentCoordinate =
    input.currentSessionId === null
      ? null
      : parseSessionCoordinate(input.currentSessionId);
  if (completed.size !== input.completedSessionIds.length) {
    throw new Error("learning_v2_course_accordion_progress_invalid");
  }
  for (const sessionId of completed) {
    if (parseSessionCoordinate(sessionId) === null) {
      throw new Error("learning_v2_course_accordion_progress_invalid");
    }
  }
  if (input.currentSessionId !== null && currentCoordinate === null) {
    throw new Error("learning_v2_course_accordion_progress_invalid");
  }

  const preparedProgress = Object.freeze(
    {},
  ) as LearningV2PreparedAccordionProgressV1;
  preparedProgressInternals.set(
    preparedProgress,
    Object.freeze({
      completed,
      currentSessionId: input.currentSessionId,
      currentCoordinate,
    }),
  );
  return preparedProgress;
}

export function buildLearningV2CourseAccordionMapFromPreparedProgressV1(
  input: LearningV2PreparedCourseAccordionMapInputV1,
): LearningV2CourseAccordionMapModelV1 {
  const expandedLessonOrdinal = exactExpandedLesson(
    input.expandedLessonOrdinal,
  );
  const projectionScopeKey = exactProjectionScope(input.projectionScopeKey);
  const prepared = preparedProgressInternals.get(input.preparedProgress);
  if (!prepared) {
    throw new Error("learning_v2_course_accordion_prepared_progress_invalid");
  }

  const cached = projectionCache.find(
    (entry) =>
      entry.projectionScopeKey === projectionScopeKey &&
      entry.expandedLessonOrdinal === expandedLessonOrdinal &&
      entry.preparedProgress === input.preparedProgress,
  );
  if (cached) return cached.model;

  const rows: LearningV2CourseAccordionRowV1[] = [];
  for (
    let lessonOrdinal = 1;
    lessonOrdinal <= LEARNING_V2_COURSE_LESSON_COUNT_V1;
    lessonOrdinal += 1
  ) {
    const lessonId = learningV2CourseLessonIdV1(lessonOrdinal);
    const expanded = lessonOrdinal === expandedLessonOrdinal;
    rows.push(
      Object.freeze({
        kind: "lesson",
        id: lessonId,
        lessonOrdinal,
        expanded,
      }),
    );
    if (!expanded) continue;

    for (
      let sessionOrdinal = 1;
      sessionOrdinal <= LEARNING_V2_LESSON_SESSION_COUNT_V1;
      sessionOrdinal += 1
    ) {
      const chapterOrdinal = Math.ceil(
        sessionOrdinal / LEARNING_V2_CHAPTER_SESSION_COUNT_V1,
      );
      const positionInChapter =
        ((sessionOrdinal - 1) % LEARNING_V2_CHAPTER_SESSION_COUNT_V1) + 1;
      const sessionId = learningV2CourseSessionIdV1(
        lessonOrdinal,
        sessionOrdinal,
      );
      if (positionInChapter === 1) {
        rows.push(
          Object.freeze({
            kind: "chapter",
            id: `${lessonId}:chapter:${String(chapterOrdinal).padStart(2, "0")}`,
            lessonOrdinal,
            chapterOrdinal,
          }),
        );
      }
      const state: LearningV2AccordionSessionStateV1 = prepared.completed.has(
        sessionId,
      )
        ? "completed"
        : prepared.currentSessionId === sessionId
          ? "current"
          : sessionOrdinal === 1 && prepared.currentSessionId === null
            ? "current"
            : prepared.currentCoordinate?.lessonOrdinal === lessonOrdinal &&
                prepared.currentCoordinate.sessionOrdinal + 1 === sessionOrdinal
              ? "next"
              : "locked";
      rows.push(
        Object.freeze({
          kind: "session",
          id: sessionId,
          lessonOrdinal,
          sessionOrdinal,
          chapterOrdinal,
          positionInChapter,
          role: learningV2CourseSessionRoleV1(sessionOrdinal),
          state,
        }),
      );
    }
  }

  return rememberProjection(
    Object.freeze({
      projectionScopeKey,
      expandedLessonOrdinal,
      preparedProgress: input.preparedProgress,
      model: Object.freeze({
        lessonCount: LEARNING_V2_COURSE_LESSON_COUNT_V1,
        expandedLessonOrdinal,
        rows: Object.freeze(rows),
      }),
    }),
  );
}

export function buildLearningV2CourseAccordionMapModelV1(
  input: LearningV2CourseAccordionMapInputV1,
): LearningV2CourseAccordionMapModelV1 {
  let preparedProgress = preparedProgressByRawInput.get(input);
  if (!preparedProgress) {
    preparedProgress = prepareLearningV2CourseAccordionProgressV1({
      completedSessionIds: input.completedSessionIds,
      currentSessionId: input.currentSessionId,
    });
    preparedProgressByRawInput.set(input, preparedProgress);
  }
  return buildLearningV2CourseAccordionMapFromPreparedProgressV1({
    projectionScopeKey: input.projectionScopeKey,
    expandedLessonOrdinal: input.expandedLessonOrdinal,
    preparedProgress,
  });
}
