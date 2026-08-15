import {
  LEARNING_V2_NEUTRAL_LESSON1_SESSION_IDS_V1,
  learningV2CourseAccordionInputFromNeutralProgressV1,
} from "../modules/learning-v2/map/course_neutral_progress_bridge_v1";
import type { Lesson1LocalProgressState } from "../modules/learning-v2/progress/lesson1_local_progress";

function state(completed: number): Lesson1LocalProgressState {
  return {
    schemaVersion: "learning-v2-lesson1-progress.v1",
    accountKey: "fixture",
    requiredSessionIds: LEARNING_V2_NEUTRAL_LESSON1_SESSION_IDS_V1,
    lessonStatus:
      completed === 12
        ? "completed"
        : completed === 0
          ? "not_started"
          : "in_progress",
    sessions: Object.fromEntries(
      LEARNING_V2_NEUTRAL_LESSON1_SESSION_IDS_V1.map((sessionId, index) => [
        sessionId,
        index < completed ? "completed" : "in_progress",
      ]),
    ),
    operations: {},
    migration: { status: "not_checked" },
    revision: completed,
  };
}

describe("Learning V2 neutral progress to owner-current course bridge", () => {
  test("projects only the first twelve canonical session coordinates", () => {
    const input = learningV2CourseAccordionInputFromNeutralProgressV1(
      state(3),
      1,
    );
    expect(input.completedSessionIds).toEqual([
      "lesson-01:session:01",
      "lesson-01:session:02",
      "lesson-01:session:03",
    ]);
    expect(input.currentSessionId).toBe("lesson-01:session:04");
    expect(JSON.stringify(input)).not.toContain("session:13");
  });

  test("does not loop to session one after all neutral sessions complete", () => {
    const input = learningV2CourseAccordionInputFromNeutralProgressV1(
      state(12),
      1,
    );
    expect(input.completedSessionIds).toHaveLength(12);
    expect(input.currentSessionId).toBeNull();
  });

  test("rejects a reordered or expanded legacy contract", () => {
    const original = state(0);
    expect(() =>
      learningV2CourseAccordionInputFromNeutralProgressV1(
        {
          ...original,
          requiredSessionIds: [...original.requiredSessionIds].reverse(),
        },
        1,
      ),
    ).toThrow("learning_v2_course_neutral_progress_contract_invalid");
  });
});
