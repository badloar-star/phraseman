import {
  encodeLearningV2CourseLessonReleaseIndexV1,
  isLearningV2CourseLessonReleaseIndexV1,
  learningV2CourseSessionPackageObjectPathV1,
  materializeLearningV2CourseLessonReleaseIndexV1,
  parseLearningV2CourseLessonReleaseIndexV1,
  type LearningV2CourseLessonReleaseSessionInputV1,
} from "../modules/learning-v2/runtime/course_lesson_release_index_v1";
import {
  LEARNING_V2_LESSON_SESSION_COUNT_V1,
  learningV2CourseSessionIdV1,
} from "../modules/learning-v2/content/course_topology_v1";
import {
  canonicalJsonV1,
  sha256Utf8,
} from "../modules/learning-v2/policies/decision_registry";
import { LEARNING_V2_INTERFACE_LOCALES } from "../modules/learning-v2/content/generator_course_contract";

const localized = (prefix: string) =>
  Object.fromEntries(
    LEARNING_V2_INTERFACE_LOCALES.map((locale) => [
      locale,
      `${prefix} ${locale}`,
    ]),
  ) as any;

function sessionInputs(
  lessonOrdinal = 1,
): LearningV2CourseLessonReleaseSessionInputV1[] {
  return Array.from(
    { length: LEARNING_V2_LESSON_SESSION_COUNT_V1 },
    (_, index) => {
      const sessionOrdinal = index + 1;
      return {
        courseSessionId: learningV2CourseSessionIdV1(
          lessonOrdinal,
          sessionOrdinal,
        ),
        learningOutcomeKind: "understand" as const,
        learningOutcomeByLocale: localized(`Session ${sessionOrdinal} outcome`),
        packageSchemaVersion: "learning-v2-course-session-release-package.v1",
        packageFingerprint: sha256Utf8(
          `package:${lessonOrdinal}:${sessionOrdinal}`,
        ),
        contentHash: sha256Utf8(`raw:${lessonOrdinal}:${sessionOrdinal}`),
        objectGeneration: String(10_000 + sessionOrdinal),
        byteSize: 2_048 + sessionOrdinal,
      };
    },
  );
}

function validIndex() {
  return materializeLearningV2CourseLessonReleaseIndexV1({
    releaseId: "release-owner-course-1",
    lessonOrdinal: 1,
    titleByLocale: localized("Lesson title"),
    canDoByLocale: localized("Can do outcome"),
    ownerLessonFingerprint: sha256Utf8("owner-lesson-1"),
    ownerConfirmationFingerprint: sha256Utf8("owner-confirmation-1"),
    sessions: sessionInputs(),
  });
}

describe("Learning V2 56-session lesson release index v1", () => {
  test("binds exactly 56 canonical map coordinates without legacy dummy sessions", () => {
    const index = validIndex();
    expect(index.sessionCount).toBe(56);
    expect(index.sessions).toHaveLength(56);
    expect(index).toMatchObject({
      sessionIdentityModel: "direct_56_no_hidden_grouping",
      packageBinding: "exact_56_direct_content_addressed_session_packages",
    });
    expect(index.sessions[0]).toMatchObject({
      courseSessionId: "lesson-01:session:01",
      sessionOrdinal: 1,
      chapterOrdinal: 1,
      positionInChapter: 1,
      role: "guided_learning",
    });
    expect(index.sessions[7].role).toBe("chapter_checkpoint");
    expect(index.sessions[12].courseSessionId).toBe("lesson-01:session:13");
    expect(index.sessions[48].role).toBe("transfer_practice");
    expect(index.sessions[55]).toMatchObject({
      courseSessionId: "lesson-01:session:56",
      role: "final_exam",
    });
    expect(
      new Set(index.sessions.map((row) => row.packageFingerprint)).size,
    ).toBe(56);
    expect(JSON.stringify(index)).not.toContain("session:57");
    expect(JSON.stringify(index)).not.toMatch(
      /packageGroup|packageEpisode|packageSessionOrdinal|12_12_12/u,
    );
  });

  test("round-trips canonical bytes and rejects a copied handle", () => {
    const index = validIndex();
    const raw = encodeLearningV2CourseLessonReleaseIndexV1(index);
    const parsed = parseLearningV2CourseLessonReleaseIndexV1(raw);
    expect(parsed).toEqual(index);
    expect(isLearningV2CourseLessonReleaseIndexV1(parsed)).toBe(true);
    expect(isLearningV2CourseLessonReleaseIndexV1({ ...parsed })).toBe(false);
    expect(() => parseLearningV2CourseLessonReleaseIndexV1(`${raw} `)).toThrow(
      "learning_v2_course_lesson_release_index_invalid",
    );
  });

  test("rejects 55 rows, reordering and course-coordinate substitution", () => {
    const base = sessionInputs();
    const materialize = (
      sessions: LearningV2CourseLessonReleaseSessionInputV1[],
    ) =>
      materializeLearningV2CourseLessonReleaseIndexV1({
        releaseId: "release-owner-course-1",
        lessonOrdinal: 1,
        titleByLocale: localized("Lesson title"),
        canDoByLocale: localized("Can do outcome"),
        ownerLessonFingerprint: sha256Utf8("owner-lesson-1"),
        ownerConfirmationFingerprint: sha256Utf8("owner-confirmation-1"),
        sessions,
      });
    expect(() => materialize(base.slice(0, 55))).toThrow(
      "learning_v2_course_lesson_release_index_invalid",
    );
    expect(() => materialize([base[1]!, base[0]!, ...base.slice(2)])).toThrow(
      "learning_v2_course_lesson_release_index_invalid",
    );
    expect(() =>
      materialize([
        { ...base[0]!, courseSessionId: "lesson-02:session:01" },
        ...base.slice(1),
      ]),
    ).toThrow("learning_v2_course_lesson_release_index_invalid");
  });

  test("derives content-addressed paths and rejects traversal-like release IDs", () => {
    expect(
      learningV2CourseSessionPackageObjectPathV1({
        releaseId: "release-owner-course-1",
        lessonOrdinal: 32,
        sessionOrdinal: 56,
        packageFingerprint: "a".repeat(64),
        contentHash: "b".repeat(64),
      }),
    ).toMatch(
      /^learning-v2\/course-session-packages\/[a-f0-9]{64}\/lesson-32\/sessions\/56\/a{64}\/b{64}\.json$/u,
    );
    expect(() =>
      learningV2CourseSessionPackageObjectPathV1({
        releaseId: "../production",
        lessonOrdinal: 1,
        sessionOrdinal: 1,
        packageFingerprint: "a".repeat(64),
        contentHash: "b".repeat(64),
      }),
    ).toThrow("learning_v2_course_lesson_release_index_invalid");
  });

  test("fails closed on role, pin path and authority drift after canonical rewrite", () => {
    const raw = encodeLearningV2CourseLessonReleaseIndexV1(validIndex());
    const parsed = JSON.parse(raw) as Record<string, any>;
    parsed.sessions[7].role = "guided_learning";
    parsed.sessions[7].packagePin.objectPath = "learning-v2/elsewhere.json";
    parsed.repositoryOriginAuthority = "authenticated";
    parsed.indexFingerprint = sha256Utf8("coordinated-rewrite");
    expect(() =>
      parseLearningV2CourseLessonReleaseIndexV1(canonicalJsonV1(parsed)),
    ).toThrow("learning_v2_course_lesson_release_index_invalid");
  });

  test("keeps all 56 learner sessions direct and independently addressable", () => {
    const index = validIndex();
    expect(index.sessions.map((row) => row.sessionOrdinal)).toEqual(
      Array.from({ length: 56 }, (_, index) => index + 1),
    );
    expect(
      new Set(index.sessions.map((row) => row.packagePin.objectPath)).size,
    ).toBe(56);
    expect(
      index.sessions.every(
        (row) =>
          row.packageSchemaVersion ===
          "learning-v2-course-session-release-package.v1",
      ),
    ).toBe(true);
  });
});
