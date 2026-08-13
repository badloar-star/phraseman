import { learningV2CourseSessionIdV1 } from "../modules/learning-v2/content/course_topology_v1";
import {
  buildLearningV2CourseAccordionMapModelV1,
  type LearningV2CourseAccordionRowV1,
} from "../modules/learning-v2/map/course_accordion_map_model_v1";

const sessions = (rows: readonly LearningV2CourseAccordionRowV1[]) =>
  rows.filter(
    (
      row,
    ): row is Extract<LearningV2CourseAccordionRowV1, { kind: "session" }> =>
      row.kind === "session",
  );

describe("Learning V2 owner-current course accordion map model v1", () => {
  test("shows one compact list of 32 lessons while every lesson is closed", () => {
    const model = buildLearningV2CourseAccordionMapModelV1({
      expandedLessonOrdinal: null,
      completedSessionIds: [],
      currentSessionId: null,
    });
    expect(model.rows).toHaveLength(32);
    expect(model.rows.every((row) => row.kind === "lesson")).toBe(true);
  });

  test("opens 56 sessions inline and shifts every later lesson below them", () => {
    const model = buildLearningV2CourseAccordionMapModelV1({
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

  test("maps current, next, checkpoint and final exam without plan side cards", () => {
    const current = learningV2CourseSessionIdV1(1, 7);
    const model = buildLearningV2CourseAccordionMapModelV1({
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
    expect(model.personalPlanPlacement).toBe("separate_optional_surface");
    expect(JSON.stringify(model)).not.toContain("personal_plan");
  });

  test("rejects invalid lesson and progress coordinates", () => {
    expect(() =>
      buildLearningV2CourseAccordionMapModelV1({
        expandedLessonOrdinal: 33,
        completedSessionIds: [],
        currentSessionId: null,
      }),
    ).toThrow("learning_v2_course_accordion_expanded_lesson_invalid");
    expect(() =>
      buildLearningV2CourseAccordionMapModelV1({
        expandedLessonOrdinal: 1,
        completedSessionIds: ["unknown-session"],
        currentSessionId: null,
      }),
    ).toThrow("learning_v2_course_accordion_progress_invalid");
  });
});
