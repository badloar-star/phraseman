import { learningV2CourseSessionIdV1 } from "../content/course_topology_v1";
import type { Lesson1LocalProgressState } from "../progress/lesson1_local_progress";
import type { LearningV2CourseAccordionMapInputV1 } from "./course_accordion_map_model_v1";

export const LEARNING_V2_NEUTRAL_LESSON1_SESSION_IDS_V1 = Object.freeze(
  ["understand", "use", "master"].flatMap((zone) =>
    [1, 2, 3, 4].map((index) => `lesson-1-${zone}-${index}`),
  ),
);

/**
 * Compatibility-only projection for the neutral 12-session fixture.
 * It cannot create progress or authorize any owner sessions 13..56.
 */
export function learningV2CourseAccordionInputFromNeutralProgressV1(
  state: Lesson1LocalProgressState,
  expandedLessonOrdinal: number | null,
): LearningV2CourseAccordionMapInputV1 {
  if (
    state.requiredSessionIds.length !==
      LEARNING_V2_NEUTRAL_LESSON1_SESSION_IDS_V1.length ||
    state.requiredSessionIds.some(
      (sessionId, index) =>
        sessionId !== LEARNING_V2_NEUTRAL_LESSON1_SESSION_IDS_V1[index],
    )
  ) {
    throw new Error("learning_v2_course_neutral_progress_contract_invalid");
  }
  const completedSessionIds = state.requiredSessionIds.flatMap(
    (sessionId, index) =>
      state.sessions[sessionId] === "completed"
        ? [learningV2CourseSessionIdV1(1, index + 1)]
        : [],
  );
  const currentIndex = state.requiredSessionIds.findIndex(
    (sessionId) => state.sessions[sessionId] !== "completed",
  );
  return Object.freeze({
    expandedLessonOrdinal,
    completedSessionIds: Object.freeze(completedSessionIds),
    currentSessionId:
      currentIndex < 0
        ? null
        : learningV2CourseSessionIdV1(1, currentIndex + 1),
  });
}
