import { learningV2CourseSessionIdV1 } from "../modules/learning-v2/content/course_topology_v1";
import {
  buildLearningV2CourseAccordionMapFromPreparedProgressV1,
  buildLearningV2CourseAccordionMapModelV1,
  prepareLearningV2CourseAccordionProgressV1,
  type LearningV2CourseAccordionRowV1,
} from "../modules/learning-v2/map/course_accordion_map_model_v1";

const sessions = (rows: readonly LearningV2CourseAccordionRowV1[]) =>
  rows.filter(
    (
      row,
    ): row is Extract<LearningV2CourseAccordionRowV1, { kind: "session" }> =>
      row.kind === "session",
  );

const PROJECTION_SCOPE = "test-account:en";

describe("Learning V2 owner-current course accordion map model v1", () => {
  test("shows one compact list of 32 lessons while every lesson is closed", () => {
    const model = buildLearningV2CourseAccordionMapModelV1({
      projectionScopeKey: PROJECTION_SCOPE,
      expandedLessonOrdinal: null,
      completedSessionIds: [],
      currentSessionId: null,
    });
    expect(model.rows).toHaveLength(32);
    expect(model.rows.every((row) => row.kind === "lesson")).toBe(true);
  });

  test("opens 56 sessions inline and shifts every later lesson below them", () => {
    const model = buildLearningV2CourseAccordionMapModelV1({
      projectionScopeKey: PROJECTION_SCOPE,
      expandedLessonOrdinal: 2,
      completedSessionIds: [],
      currentSessionId: learningV2CourseSessionIdV1(2, 1),
    });
    const lesson2Index = model.rows.findIndex((row) => row.id === "lesson-02");
    const lesson3Index = model.rows.findIndex((row) => row.id === "lesson-03");
    expect(sessions(model.rows)).toHaveLength(56);
    expect(model.rows.filter((row) => row.kind === "chapter")).toHaveLength(7);
    expect(lesson3Index - lesson2Index).toBe(64);
    expect(model.rows).toHaveLength(95);
  });

  test("keeps the exact lesson, chapter and session order around the expanded lesson", () => {
    const model = buildLearningV2CourseAccordionMapModelV1({
      projectionScopeKey: PROJECTION_SCOPE,
      expandedLessonOrdinal: 2,
      completedSessionIds: [],
      currentSessionId: learningV2CourseSessionIdV1(2, 1),
    });
    const expectedExpandedRows = Array.from(
      { length: 7 },
      (_, chapterIndex) => {
        const chapterOrdinal = chapterIndex + 1;
        const firstSessionOrdinal = chapterIndex * 8 + 1;
        return [
          `lesson-02:chapter:${String(chapterOrdinal).padStart(2, "0")}`,
          ...Array.from({ length: 8 }, (_, sessionIndex) =>
            learningV2CourseSessionIdV1(2, firstSessionOrdinal + sessionIndex),
          ),
        ];
      },
    ).flat();

    expect(model.rows.map((row) => row.id)).toEqual([
      "lesson-01",
      "lesson-02",
      ...expectedExpandedRows,
      ...Array.from(
        { length: 30 },
        (_, index) => `lesson-${String(index + 3).padStart(2, "0")}`,
      ),
    ]);
  });

  test("maps current, next, checkpoint and final exam without plan side cards", () => {
    const current = learningV2CourseSessionIdV1(1, 7);
    const model = buildLearningV2CourseAccordionMapModelV1({
      projectionScopeKey: PROJECTION_SCOPE,
      expandedLessonOrdinal: 1,
      completedSessionIds: Array.from({ length: 6 }, (_, index) =>
        learningV2CourseSessionIdV1(1, index + 1),
      ),
      currentSessionId: current,
    });
    const route = sessions(model.rows);
    expect(route.slice(0, 8).map((session) => session.state)).toEqual([
      "completed",
      "completed",
      "completed",
      "completed",
      "completed",
      "completed",
      "current",
      "next",
    ]);
    expect(route[7].role).toBe("chapter_checkpoint");
    expect(route[55].role).toBe("final_exam");
    expect(JSON.stringify(model)).not.toContain("personal_plan");
  });

  test("rejects invalid lesson and progress coordinates", () => {
    expect(() =>
      buildLearningV2CourseAccordionMapModelV1({
        projectionScopeKey: PROJECTION_SCOPE,
        expandedLessonOrdinal: 33,
        completedSessionIds: [],
        currentSessionId: null,
      }),
    ).toThrow("learning_v2_course_accordion_expanded_lesson_invalid");
    expect(() =>
      buildLearningV2CourseAccordionMapModelV1({
        projectionScopeKey: PROJECTION_SCOPE,
        expandedLessonOrdinal: 1,
        completedSessionIds: ["unknown-session"],
        currentSessionId: null,
      }),
    ).toThrow("learning_v2_course_accordion_progress_invalid");
    expect(() =>
      buildLearningV2CourseAccordionMapModelV1({
        projectionScopeKey: "",
        expandedLessonOrdinal: 1,
        completedSessionIds: [],
        currentSessionId: null,
      }),
    ).toThrow("learning_v2_course_accordion_scope_invalid");
  });

  test("does not mark another lesson next when current progress belongs to lesson one", () => {
    const model = buildLearningV2CourseAccordionMapModelV1({
      projectionScopeKey: PROJECTION_SCOPE,
      expandedLessonOrdinal: 2,
      completedSessionIds: [],
      currentSessionId: learningV2CourseSessionIdV1(1, 1),
    });
    expect(
      sessions(model.rows).every((session) => session.state === "locked"),
    ).toBe(true);
  });

  test("reuses one immutable projection for the same scoped semantic input", () => {
    const input = {
      projectionScopeKey: "account-1:en",
      expandedLessonOrdinal: 1,
      completedSessionIds: [learningV2CourseSessionIdV1(1, 1)],
      currentSessionId: learningV2CourseSessionIdV1(1, 2),
    } as const;

    expect(buildLearningV2CourseAccordionMapModelV1(input)).toBe(
      buildLearningV2CourseAccordionMapModelV1(input),
    );
  });

  test("hits the prepared projection cache before progress needs traversal", () => {
    const preparedProgress = prepareLearningV2CourseAccordionProgressV1({
      completedSessionIds: Array.from({ length: 56 }, (_, index) =>
        learningV2CourseSessionIdV1(1, index + 1),
      ),
      currentSessionId: learningV2CourseSessionIdV1(2, 1),
    });
    const input = {
      projectionScopeKey: "account-1:en",
      expandedLessonOrdinal: 1,
      preparedProgress,
    } as const;

    expect(buildLearningV2CourseAccordionMapFromPreparedProgressV1(input)).toBe(
      buildLearningV2CourseAccordionMapFromPreparedProgressV1(input),
    );
  });

  test("does not reuse a projection across account or target scopes", () => {
    const preparedProgress = prepareLearningV2CourseAccordionProgressV1({
      completedSessionIds: [learningV2CourseSessionIdV1(1, 1)],
      currentSessionId: learningV2CourseSessionIdV1(1, 2),
    });

    expect(
      buildLearningV2CourseAccordionMapFromPreparedProgressV1({
        projectionScopeKey: "account-1:en",
        expandedLessonOrdinal: 1,
        preparedProgress,
      }),
    ).not.toBe(
      buildLearningV2CourseAccordionMapFromPreparedProgressV1({
        projectionScopeKey: "account-2:en",
        expandedLessonOrdinal: 1,
        preparedProgress,
      }),
    );
  });
});
