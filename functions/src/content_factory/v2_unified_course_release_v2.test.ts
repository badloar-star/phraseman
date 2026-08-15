import {
  LEARNING_V2_COURSE_LESSON_COUNT_V1,
  LEARNING_V2_COURSE_SESSION_COUNT_V1,
  LEARNING_V2_LESSON_SESSION_COUNT_V1,
  learningV2CourseSessionIdV1,
} from "../../../modules/learning-v2/content/course_topology_v1";
import {
  encodeLearningV2CourseLessonReleaseIndexV1,
  materializeLearningV2CourseLessonReleaseIndexV1,
} from "../../../modules/learning-v2/runtime/course_lesson_release_index_v1";
import {
  canonicalJsonV1,
  sha256Utf8,
  utf8ByteLengthV1,
} from "../../../modules/learning-v2/policies/decision_registry";
import {
  decideV2UnifiedCourseReleaseHeadV2,
  isV2UnifiedCourseReleaseHeadV2,
  isV2UnifiedCourseReleaseRootV2,
  materializeV2UnifiedCourseReleaseRootV2,
  parseV2UnifiedCourseReleaseHeadV2,
  parseV2UnifiedCourseReleaseRootV2,
  v2UnifiedCourseLessonIndexObjectPathV2,
  type V2UnifiedCourseLessonReleaseInputV2,
} from "./v2_unified_course_release_v2";

const h = (value: string) => sha256Utf8(value);
const localized = (prefix: string) =>
  Object.fromEntries(
    ["ru", "uk", "es", "pt-BR", "vi", "id", "tr", "pl"].map((locale) => [
      locale,
      `${prefix} ${locale}`,
    ]),
  ) as any;

function pin(
  name: string,
  overrides: Partial<{
    objectPath: string;
    contentHash: string;
    objectGeneration: string;
    byteSize: number;
  }> = {},
) {
  return Object.freeze({
    objectPath:
      overrides.objectPath ?? `learning-v2/test/${name}/${h(name)}.json`,
    contentHash: overrides.contentHash ?? h(name),
    objectGeneration: overrides.objectGeneration ?? "7",
    byteSize: overrides.byteSize ?? 100,
    contentType: "application/json; charset=utf-8" as const,
  });
}

function lessonInput(
  releaseId: string,
  lessonOrdinal: number,
): V2UnifiedCourseLessonReleaseInputV2 {
  const index = materializeLearningV2CourseLessonReleaseIndexV1({
    releaseId,
    lessonOrdinal,
    titleByLocale: localized(`Lesson ${lessonOrdinal}`),
    canDoByLocale: localized(`Can do ${lessonOrdinal}`),
    ownerLessonFingerprint: h(`owner-lesson:${lessonOrdinal}`),
    ownerConfirmationFingerprint: h(`owner-confirmation:${lessonOrdinal}`),
    sessions: Array.from(
      { length: LEARNING_V2_LESSON_SESSION_COUNT_V1 },
      (_, offset) => {
        const sessionOrdinal = offset + 1;
        return {
          courseSessionId: learningV2CourseSessionIdV1(
            lessonOrdinal,
            sessionOrdinal,
          ),
          learningOutcomeKind: "understand" as const,
          learningOutcomeByLocale: localized(
            `Session ${sessionOrdinal} outcome`,
          ),
          packageSchemaVersion:
            "learning-v2-course-session-release-package.v1" as const,
          packageFingerprint: h(`package:${lessonOrdinal}:${sessionOrdinal}`),
          contentHash: h(`package-raw:${lessonOrdinal}:${sessionOrdinal}`),
          objectGeneration: String(
            10_000 + lessonOrdinal * 100 + sessionOrdinal,
          ),
          byteSize: 2_000 + sessionOrdinal,
        };
      },
    ),
  });
  const raw = encodeLearningV2CourseLessonReleaseIndexV1(index);
  const rawHash = h(raw);
  return Object.freeze({
    index,
    indexObject: pin(`index:${lessonOrdinal}`, {
      objectPath: v2UnifiedCourseLessonIndexObjectPathV2({
        releaseId,
        lessonId: index.lessonId,
        indexFingerprint: index.indexFingerprint,
        rawHash,
      }),
      contentHash: rawHash,
      byteSize: utf8ByteLengthV1(raw),
    }),
    ownerConfirmationObject: pin(`confirmation:${lessonOrdinal}`),
  });
}

function release(releaseId: string, full = true) {
  return materializeV2UnifiedCourseReleaseRootV2({
    environment: full ? "production" : "lab",
    releaseId,
    planFingerprint: h("plan-v2"),
    courseContractFingerprint: h("course-v2"),
    seasonId: "season-v2",
    targetLanguage: "en-US",
    studyTarget: "en",
    learnerSourceLocale: "ru",
    interfaceLocales: ["ru", "uk", "es", "pt-BR", "vi", "id", "tr", "pl"],
    contentClass: full ? "production_candidate" : "neutral_test_fixture",
    releaseScope: full ? "full_course" : "vertical_slice",
    rollout: {
      revision: 1,
      state: full ? "live" : "internal",
      percent: full ? 100 : 0,
      cohortSaltVersion: 1,
      allowlistCohortIds: [],
      excludeCohortIds: [],
    },
    lessons: Array.from(
      { length: full ? LEARNING_V2_COURSE_LESSON_COUNT_V1 : 1 },
      (_, index) => lessonInput(releaseId, index + 1),
    ),
  });
}

function rootPin(root: ReturnType<typeof release>) {
  const raw = canonicalJsonV1(root);
  return pin(`root:${root.releaseId}`, {
    objectPath: `learning-v2/unified-course-release-v2/roots/${root.releaseId}/${root.rootFingerprint}/${h(raw)}.json`,
    contentHash: h(raw),
    byteSize: utf8ByteLengthV1(raw),
  });
}

describe("Learning V2 unified direct 32×56 course release v2", () => {
  test("binds exactly 32 owner lessons and 1792 direct session coordinates", () => {
    const root = release("release-v2-a");
    expect(root.lessonCount).toBe(LEARNING_V2_COURSE_LESSON_COUNT_V1);
    expect(root.sessionsPerLesson).toBe(LEARNING_V2_LESSON_SESSION_COUNT_V1);
    expect(root.directSessionCount).toBe(LEARNING_V2_COURSE_SESSION_COUNT_V1);
    expect(root.lessons).toHaveLength(32);
    expect(root.lessons[0]).toMatchObject({
      lessonId: "lesson-01",
      sessionCount: 56,
    });
    expect(root.lessons[31]).toMatchObject({
      lessonId: "lesson-32",
      sessionCount: 56,
    });
    expect(root.courseModel).toBe(
      "direct_32_lessons_56_sessions_no_hidden_episode_grouping",
    );
    expect(JSON.stringify(root)).not.toMatch(
      /episodeId|activityPackageFingerprint/u,
    );
    expect(root.contentAuthorship).toBe("owner_only");
    expect(root.runtimeConsumer).toBe(false);
    expect(root.releaseAuthority).toBe(false);
  });

  test("round-trips canonical root bytes and rejects copied brands", () => {
    const root = release("release-v2-a", false);
    const parsed = parseV2UnifiedCourseReleaseRootV2(canonicalJsonV1(root));
    expect(parsed).toEqual(root);
    expect(isV2UnifiedCourseReleaseRootV2(parsed)).toBe(true);
    expect(isV2UnifiedCourseReleaseRootV2({ ...parsed })).toBe(false);
    expect(() =>
      parseV2UnifiedCourseReleaseRootV2(`${canonicalJsonV1(root)} `),
    ).toThrow("v2_unified_course_release_v2_invalid");
  });

  test("rejects 31 lessons, reordered lesson coordinates and production fixtures", () => {
    const releaseId = "release-v2-a";
    const base = {
      environment: "production" as const,
      releaseId,
      planFingerprint: h("plan-v2"),
      courseContractFingerprint: h("course-v2"),
      seasonId: "season-v2",
      targetLanguage: "en-US",
      studyTarget: "en",
      learnerSourceLocale: "ru",
      interfaceLocales: ["ru", "uk", "es", "pt-BR", "vi", "id", "tr", "pl"],
      contentClass: "production_candidate" as const,
      releaseScope: "full_course" as const,
      rollout: {
        revision: 1,
        state: "live" as const,
        percent: 100 as const,
        cohortSaltVersion: 1,
        allowlistCohortIds: [],
        excludeCohortIds: [],
      },
      lessons: Array.from({ length: 32 }, (_, index) =>
        lessonInput(releaseId, index + 1),
      ),
    };
    expect(() =>
      materializeV2UnifiedCourseReleaseRootV2({
        ...base,
        lessons: base.lessons.slice(0, 31),
      }),
    ).toThrow("v2_unified_course_release_v2_scope_invalid");
    expect(() =>
      materializeV2UnifiedCourseReleaseRootV2({
        ...base,
        lessons: [base.lessons[1]!, base.lessons[0]!, ...base.lessons.slice(2)],
      }),
    ).toThrow("v2_unified_course_release_v2_lesson_index_invalid");
    expect(() =>
      materializeV2UnifiedCourseReleaseRootV2({
        ...base,
        contentClass: "neutral_test_fixture" as never,
      }),
    ).toThrow("v2_unified_course_release_v2_scope_invalid");
  });

  test("binds each lesson index pin to exact canonical bytes and path", () => {
    const valid = lessonInput("release-v2-a", 1);
    expect(() =>
      materializeV2UnifiedCourseReleaseRootV2({
        environment: "lab",
        releaseId: "release-v2-a",
        planFingerprint: h("plan-v2"),
        courseContractFingerprint: h("course-v2"),
        seasonId: "season-v2",
        targetLanguage: "en-US",
        studyTarget: "en",
        learnerSourceLocale: "ru",
        interfaceLocales: ["ru", "uk", "es", "pt-BR", "vi", "id", "tr", "pl"],
        contentClass: "neutral_test_fixture",
        releaseScope: "vertical_slice",
        rollout: {
          revision: 1,
          state: "internal",
          percent: 0,
          cohortSaltVersion: 1,
          allowlistCohortIds: [],
          excludeCohortIds: [],
        },
        lessons: [
          {
            ...valid,
            indexObject: { ...valid.indexObject, contentHash: h("wrong") },
          },
        ],
      }),
    ).toThrow("v2_unified_course_release_v2_lesson_index_pin_invalid");
  });

  test("performs A→B activation and exact rollback without crossing topology", () => {
    const a = release("release-v2-a", false);
    const b = release("release-v2-b", false);
    const first = decideV2UnifiedCourseReleaseHeadV2({
      current: null,
      target: a,
      targetObject: rootPin(a),
      action: "activate",
      expectedRevision: 0,
      operationId: "activate-a",
      updatedAtIso: "2026-08-13T00:00:00.000Z",
    });
    const second = decideV2UnifiedCourseReleaseHeadV2({
      current: first.head,
      target: b,
      targetObject: rootPin(b),
      action: "activate",
      expectedRevision: 1,
      operationId: "activate-b",
      updatedAtIso: "2026-08-13T00:01:00.000Z",
    });
    const rollback = decideV2UnifiedCourseReleaseHeadV2({
      current: second.head,
      target: a,
      targetObject: rootPin(a),
      action: "rollback",
      expectedRevision: 2,
      operationId: "rollback-a",
      updatedAtIso: "2026-08-13T00:02:00.000Z",
    });
    expect(rollback.head.activeReleaseId).toBe("release-v2-a");
    expect(rollback.head.previousReleaseId).toBe("release-v2-b");
    const parsed = parseV2UnifiedCourseReleaseHeadV2(
      canonicalJsonV1(rollback.head),
    );
    expect(isV2UnifiedCourseReleaseHeadV2(parsed)).toBe(true);
    const replay = decideV2UnifiedCourseReleaseHeadV2({
      current: rollback.head,
      target: a,
      targetObject: rootPin(a),
      action: "rollback",
      expectedRevision: 2,
      operationId: "rollback-a",
      updatedAtIso: "2026-08-13T00:03:00.000Z",
    });
    expect(replay.kind).toBe("exact_replay");
  });

  test("rejects stale CAS, arbitrary rollback and canonical authority escalation", () => {
    const a = release("release-v2-a", false);
    const b = release("release-v2-b", false);
    const first = decideV2UnifiedCourseReleaseHeadV2({
      current: null,
      target: a,
      targetObject: rootPin(a),
      action: "activate",
      expectedRevision: 0,
      operationId: "activate-a",
      updatedAtIso: "2026-08-13T00:00:00.000Z",
    });
    expect(() =>
      decideV2UnifiedCourseReleaseHeadV2({
        current: first.head,
        target: b,
        targetObject: rootPin(b),
        action: "activate",
        expectedRevision: 0,
        operationId: "stale",
        updatedAtIso: "2026-08-13T00:01:00.000Z",
      }),
    ).toThrow("v2_unified_course_release_v2_head_conflict");
    expect(() =>
      decideV2UnifiedCourseReleaseHeadV2({
        current: first.head,
        target: b,
        targetObject: rootPin(b),
        action: "rollback",
        expectedRevision: 1,
        operationId: "bad-rollback",
        updatedAtIso: "2026-08-13T00:01:00.000Z",
      }),
    ).toThrow("v2_unified_course_release_v2_rollback_target_invalid");
    const raw = JSON.parse(canonicalJsonV1(a));
    raw.runtimeConsumer = true;
    raw.rootFingerprint = h("rewritten");
    expect(() =>
      parseV2UnifiedCourseReleaseRootV2(canonicalJsonV1(raw)),
    ).toThrow();
  });
});
