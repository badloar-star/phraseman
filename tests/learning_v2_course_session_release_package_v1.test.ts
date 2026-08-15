import {
  bindLearningV2CourseSessionPackageToReleaseIndexV1,
  encodeLearningV2CourseSessionReleasePackageV1,
  isLearningV2CourseSessionReleasePackageV1,
  learningV2CourseSessionChildObjectPathV1,
  materializeLearningV2CourseSessionReleasePackageV1,
  parseLearningV2CourseSessionReleasePackageV1,
  type LearningV2CourseSessionChildInputV1,
  LEARNING_V2_COURSE_SESSION_CHILD_SCHEMAS_V1,
} from "../modules/learning-v2/runtime/course_session_release_package_v1";
import {
  materializeLearningV2CourseLessonReleaseIndexV1,
  type LearningV2CourseLessonReleaseSessionInputV1,
} from "../modules/learning-v2/runtime/course_lesson_release_index_v1";
import { LEARNING_V2_INTERFACE_LOCALES } from "../modules/learning-v2/content/generator_course_contract";
import { learningV2CourseSessionIdV1 } from "../modules/learning-v2/content/course_topology_v1";
import {
  canonicalJsonV1,
  sha256Utf8,
  utf8ByteLengthV1,
} from "../modules/learning-v2/policies/decision_registry";

const h = (value: string) => sha256Utf8(value);
const RELEASE_ID = "owner-course-release-1";
const OWNER_LESSON = h("owner-lesson-1");
const OWNER_CONFIRMATION = h("owner-confirmation-1");

function children(): LearningV2CourseSessionChildInputV1[] {
  return (
    [
      "intro",
      "learner",
      "evaluator_capsule",
      "evaluator_sidecar",
      "auxiliary",
    ] as const
  ).map((kind, index) => ({
    kind,
    schemaVersion: LEARNING_V2_COURSE_SESSION_CHILD_SCHEMAS_V1[kind],
    artifactFingerprint: h(`artifact:${kind}`),
    contentHash: h(`raw:${kind}`),
    objectGeneration: String(index + 11),
    byteSize: 1_024 + index,
  }));
}

function outcomes() {
  return Object.fromEntries(
    LEARNING_V2_INTERFACE_LOCALES.map((locale) => [
      locale,
      `Outcome for ${locale}: build a complete sentence with to be.`,
    ]),
  ) as Record<(typeof LEARNING_V2_INTERFACE_LOCALES)[number], string>;
}

const lessonTitles = () =>
  Object.fromEntries(
    LEARNING_V2_INTERFACE_LOCALES.map((locale) => [locale, `Lesson ${locale}`]),
  ) as any;

function packageFixture(
  profile: "standard" | "rapid" | "voice_heavy" = "standard",
) {
  const count = profile === "rapid" ? 20 : profile === "voice_heavy" ? 12 : 16;
  return materializeLearningV2CourseSessionReleasePackageV1({
    releaseId: RELEASE_ID,
    lessonOrdinal: 1,
    sessionOrdinal: 1,
    ownerLessonFingerprint: OWNER_LESSON,
    ownerConfirmationFingerprint: OWNER_CONFIRMATION,
    learningOutcomeKind: "understand" as const,
    learningOutcomeByLocale: outcomes(),
    interactionProfile: profile,
    interactionIds: Array.from(
      { length: count },
      (_, index) => `interaction-${index + 1}`,
    ),
    children: children(),
  });
}

function indexForPackage() {
  const value = packageFixture();
  const raw = encodeLearningV2CourseSessionReleasePackageV1(value);
  const sessions: LearningV2CourseLessonReleaseSessionInputV1[] = Array.from(
    { length: 56 },
    (_, index) => {
      const ordinal = index + 1;
      return {
        courseSessionId: learningV2CourseSessionIdV1(1, ordinal),
        learningOutcomeKind: "understand" as const,
        learningOutcomeByLocale: outcomes(),
        packageSchemaVersion: "learning-v2-course-session-release-package.v1",
        packageFingerprint:
          ordinal === 1 ? value.packageFingerprint : h(`package:${ordinal}`),
        contentHash:
          ordinal === 1 ? sha256Utf8(raw) : h(`package-raw:${ordinal}`),
        objectGeneration: String(1_000 + ordinal),
        byteSize: ordinal === 1 ? utf8ByteLengthV1(raw) : 2_048,
      };
    },
  );
  return {
    value,
    raw,
    index: materializeLearningV2CourseLessonReleaseIndexV1({
      releaseId: RELEASE_ID,
      lessonOrdinal: 1,
      titleByLocale: lessonTitles(),
      canDoByLocale: outcomes(),
      ownerLessonFingerprint: OWNER_LESSON,
      ownerConfirmationFingerprint: OWNER_CONFIRMATION,
      sessions,
    }),
  };
}

describe("Learning V2 direct 56-coordinate session release package v1", () => {
  test.each([
    ["standard", 16],
    ["rapid", 20],
    ["voice_heavy", 12],
  ] as const)(
    "accepts %s profile with %i planned interactions",
    (profile, count) => {
      const value = packageFixture(profile);
      expect(value).toMatchObject({
        courseSessionId: "lesson-01:session:01",
        plannedPrimaryInteractionCount: count,
        introPageCount: 3,
        practiceStartOrdinal: 4,
        contentAuthorship: "owner_only",
        runtimeAuthority: "none_active_release_join_required",
        releaseAuthority: false,
      });
      expect(value.introInteractionIds).toEqual(
        value.interactionIds.slice(0, 3),
      );
      expect(value.practiceInteractionIds).toEqual(
        value.interactionIds.slice(3),
      );
    },
  );

  test("round-trips canonical bytes, rejects a clone and binds exact raw bytes to the 56-row index", () => {
    const fixture = indexForPackage();
    const parsed = parseLearningV2CourseSessionReleasePackageV1(fixture.raw);
    expect(parsed).toEqual(fixture.value);
    expect(isLearningV2CourseSessionReleasePackageV1(parsed)).toBe(true);
    expect(isLearningV2CourseSessionReleasePackageV1({ ...parsed })).toBe(
      false,
    );
    expect(
      bindLearningV2CourseSessionPackageToReleaseIndexV1({
        index: fixture.index,
        package: parsed,
      }),
    ).toBe(parsed);
    expect(() =>
      bindLearningV2CourseSessionPackageToReleaseIndexV1({
        index: { ...fixture.index },
        package: parsed,
      }),
    ).toThrow("learning_v2_course_session_release_package_invalid");
  });

  test("keeps intro questions embedded and never duplicates slots 1–3 in practice", () => {
    const value = packageFixture();
    expect(value.introQuestionPolicy).toBe(
      "one_embedded_question_per_intro_page_no_post_intro_duplicate",
    );
    expect(
      new Set([...value.introInteractionIds, ...value.practiceInteractionIds])
        .size,
    ).toBe(16);
    expect(value.practiceInteractionIds).not.toEqual(
      expect.arrayContaining(value.introInteractionIds),
    );
  });

  test("rejects fixed-12 standard sessions, duplicate interactions and a second intro copy", () => {
    const base = {
      releaseId: RELEASE_ID,
      lessonOrdinal: 1,
      sessionOrdinal: 1,
      ownerLessonFingerprint: OWNER_LESSON,
      ownerConfirmationFingerprint: OWNER_CONFIRMATION,
      learningOutcomeKind: "understand" as const,
      learningOutcomeByLocale: outcomes(),
      interactionProfile: "standard" as const,
      children: children(),
    };
    expect(() =>
      materializeLearningV2CourseSessionReleasePackageV1({
        ...base,
        interactionIds: Array.from(
          { length: 12 },
          (_, index) => `short-${index}`,
        ),
      }),
    ).toThrow("learning_v2_course_session_release_package_invalid");
    expect(() =>
      materializeLearningV2CourseSessionReleasePackageV1({
        ...base,
        interactionIds: Array.from({ length: 16 }, (_, index) =>
          index === 15 ? "item-1" : `item-${index + 1}`,
        ),
      }),
    ).toThrow("learning_v2_course_session_release_package_invalid");

    const raw = encodeLearningV2CourseSessionReleasePackageV1(packageFixture());
    const rewritten = JSON.parse(raw) as Record<string, any>;
    rewritten.practiceInteractionIds[0] = rewritten.introInteractionIds[0];
    rewritten.interactionSetFingerprint = h("forged-interactions");
    rewritten.packageFingerprint = h("forged-package");
    expect(() =>
      parseLearningV2CourseSessionReleasePackageV1(canonicalJsonV1(rewritten)),
    ).toThrow("learning_v2_course_session_release_package_invalid");
  });

  test("rejects outcome, child order/path and authority drift", () => {
    const raw = encodeLearningV2CourseSessionReleasePackageV1(packageFixture());
    for (const mutate of [
      (value: any) => {
        value.learningOutcomeByLocale.ru = "short";
      },
      (value: any) => {
        [value.children[0], value.children[1]] = [
          value.children[1],
          value.children[0],
        ];
      },
      (value: any) => {
        value.children[0].objectPath = "learning-v2/elsewhere.json";
      },
      (value: any) => {
        value.repositoryOriginAuthority = "authenticated";
      },
    ]) {
      const value = JSON.parse(raw);
      mutate(value);
      value.packageFingerprint = h("coordinated-rewrite");
      expect(() =>
        parseLearningV2CourseSessionReleasePackageV1(canonicalJsonV1(value)),
      ).toThrow("learning_v2_course_session_release_package_invalid");
    }
  });

  test("derives only content-addressed child paths and rejects traversal coordinates", () => {
    expect(
      learningV2CourseSessionChildObjectPathV1({
        releaseId: RELEASE_ID,
        lessonOrdinal: 32,
        sessionOrdinal: 56,
        kind: "learner",
        artifactFingerprint: "a".repeat(64),
        contentHash: "b".repeat(64),
      }),
    ).toMatch(
      /^learning-v2\/course-session-children\/[a-f0-9]{64}\/lesson-32\/sessions\/56\/learner\/a{64}\/b{64}\.json$/u,
    );
    expect(() =>
      learningV2CourseSessionChildObjectPathV1({
        releaseId: "../prod",
        lessonOrdinal: 1,
        sessionOrdinal: 1,
        kind: "learner",
        artifactFingerprint: "a".repeat(64),
        contentHash: "b".repeat(64),
      }),
    ).toThrow("learning_v2_course_session_release_package_invalid");
  });

  test("fails the index join on raw-hash, byte-size, owner or coordinate substitution", () => {
    const fixture = indexForPackage();
    const badIndex = {
      ...fixture.index,
      ownerConfirmationFingerprint: h("other-confirmation"),
    } as never;
    expect(() =>
      bindLearningV2CourseSessionPackageToReleaseIndexV1({
        index: badIndex,
        package: fixture.value,
      }),
    ).toThrow("learning_v2_course_session_release_package_invalid");
  });
});
