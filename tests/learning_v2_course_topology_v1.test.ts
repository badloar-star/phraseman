import {
  LEARNING_V2_CHAPTER_SESSION_COUNT_V1,
  LEARNING_V2_COURSE_LESSON_COUNT_V1,
  LEARNING_V2_COURSE_SESSION_COUNT_V1,
  LEARNING_V2_COURSE_TARGET_MINUTES_V1,
  LEARNING_V2_LESSON_SESSION_COUNT_V1,
  LEARNING_V2_PERSONAL_PLAN_POLICY_V1,
  buildLearningV2CourseTopologyV1,
  learningV2CourseLessonIdV1,
  learningV2CourseSessionIdV1,
  learningV2CourseSessionRoleV1,
} from "../modules/learning-v2/content/course_topology_v1";

describe("Learning V2 owner-current course topology v1", () => {
  test("fixes 32 owner-authored lessons and 56 sessions per lesson", () => {
    const topology = buildLearningV2CourseTopologyV1();
    const sessions = topology.lessons.flatMap((lesson) => lesson.sessions);

    expect(topology.lessons).toHaveLength(LEARNING_V2_COURSE_LESSON_COUNT_V1);
    expect(
      topology.lessons.every(
        (lesson) =>
          lesson.sessions.length === LEARNING_V2_LESSON_SESSION_COUNT_V1,
      ),
    ).toBe(true);
    expect(sessions).toHaveLength(LEARNING_V2_COURSE_SESSION_COUNT_V1);
    expect(new Set(sessions.map((session) => session.sessionId)).size).toBe(
      LEARNING_V2_COURSE_SESSION_COUNT_V1,
    );
    expect(topology.realContentAuthorship).toBe("owner_only");
    expect(topology.generatorResponsibility).toBe(
      "structure_validation_preview_release_tooling_only",
    );
  });

  test("groups every lesson into seven chapters of eight sessions with exact checks", () => {
    const lesson = buildLearningV2CourseTopologyV1().lessons[0];

    expect(lesson.sessions.map((session) => session.chapterOrdinal)).toEqual(
      Array.from({ length: 7 }, (_, chapterIndex) =>
        Array(LEARNING_V2_CHAPTER_SESSION_COUNT_V1).fill(chapterIndex + 1),
      ).flat(),
    );
    expect(
      lesson.sessions
        .filter((session) => session.role === "chapter_checkpoint")
        .map((session) => session.sessionOrdinal),
    ).toEqual([8, 16, 24, 32, 40, 48]);
    expect(
      lesson.sessions
        .slice(48, 55)
        .every((session) => session.role === "transfer_practice"),
    ).toBe(true);
    expect(lesson.sessions[55].role).toBe("final_exam");
  });

  test("targets five to eight minutes and about 209 hours for the full course", () => {
    const topology = buildLearningV2CourseTopologyV1();
    expect(topology.lessons[0].sessions[0].durationMinutes).toEqual({
      min: 5,
      target: 7,
      max: 8,
    });
    expect(topology.courseTotals).toEqual({
      sessionCount: 1_792,
      targetMinutes: LEARNING_V2_COURSE_TARGET_MINUTES_V1,
      targetWholeHours: 209,
      targetRemainingMinutes: 4,
    });
  });

  test("keeps personal plans optional and outside the main course map and readiness gate", () => {
    expect(LEARNING_V2_PERSONAL_PLAN_POLICY_V1).toEqual({
      mainCourseCompleteness: "self_contained_without_personal_plan",
      mainMapPlacement: "not_present",
      productPlacement: "separate_optional_surface",
      generatorDelivery: "deferred_second_wave_specialization",
      blocksMainGeneratorReadiness: false,
      existingFeaturePolicy: "preserve_do_not_remove",
    });
  });

  test("uses stable coordinates and rejects values outside the canonical topology", () => {
    expect(learningV2CourseLessonIdV1(1)).toBe("lesson-01");
    expect(learningV2CourseLessonIdV1(32)).toBe("lesson-32");
    expect(learningV2CourseSessionIdV1(32, 56)).toBe("lesson-32:session:56");
    expect(learningV2CourseSessionRoleV1(56)).toBe("final_exam");
    expect(() => learningV2CourseLessonIdV1(33)).toThrow(
      "learning_v2_course_topology_lesson_ordinal_invalid",
    );
    expect(() => learningV2CourseSessionIdV1(1, 57)).toThrow(
      "learning_v2_course_topology_session_ordinal_invalid",
    );
  });

  test("is deterministic without inventing any real lesson title or learning body", () => {
    const first = buildLearningV2CourseTopologyV1();
    const second = buildLearningV2CourseTopologyV1();
    expect(first.topologyFingerprint).toBe(second.topologyFingerprint);
    expect(JSON.stringify(first)).not.toMatch(
      /hello|grammar|travel|interview/i,
    );
  });
});
