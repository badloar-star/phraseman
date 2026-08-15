import {
  getLearningV2CourseSessionReadbackSummaryV1,
  isLearningV2CourseSessionReadbackHandleV1,
  loadLearningV2CourseSessionReadbackV1,
  resolveLearningV2CourseSessionLearnerMaterialV1,
} from "../modules/learning-v2/runtime/course_session_readback_v1";
import {
  LEARNING_V2_COURSE_SESSION_CHILD_SCHEMAS_V1,
  encodeLearningV2CourseSessionReleasePackageV1,
  materializeLearningV2CourseSessionReleasePackageV1,
  type LearningV2CourseSessionChildInputV1,
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

const h = sha256Utf8;

function fixture() {
  const raws = [
    canonicalJsonV1({ schemaVersion: "intro.v1", pages: [1, 2, 3] }),
    canonicalJsonV1({ schemaVersion: "learner.v1", interactions: 16 }),
    canonicalJsonV1({
      schemaVersion: "evaluator-capsule.v1",
      acceptedCommitments: ["a".repeat(64)],
    }),
    canonicalJsonV1({
      schemaVersion: "evaluator-sidecar.v1",
      acceptedAnswers: ["secret"],
    }),
    canonicalJsonV1({ schemaVersion: "auxiliary.v1", reports: true }),
  ];
  const kinds = [
    "intro",
    "learner",
    "evaluator_capsule",
    "evaluator_sidecar",
    "auxiliary",
  ] as const;
  const children: LearningV2CourseSessionChildInputV1[] = kinds.map(
    (kind, index) => ({
      kind,
      schemaVersion: LEARNING_V2_COURSE_SESSION_CHILD_SCHEMAS_V1[kind],
      artifactFingerprint: h(`artifact:${kind}`),
      contentHash: h(raws[index]!),
      objectGeneration: String(index + 10),
      byteSize: utf8ByteLengthV1(raws[index]!),
    }),
  );
  const outcomes = Object.fromEntries(
    LEARNING_V2_INTERFACE_LOCALES.map((locale) => [
      locale,
      `Outcome ${locale}: build complete phrases accurately.`,
    ]),
  ) as any;
  const value = materializeLearningV2CourseSessionReleasePackageV1({
    releaseId: "release-1",
    lessonOrdinal: 1,
    sessionOrdinal: 1,
    ownerLessonFingerprint: h("owner-lesson"),
    ownerConfirmationFingerprint: h("owner-confirmation"),
    learningOutcomeKind: "understand" as const,
    learningOutcomeByLocale: outcomes,
    interactionProfile: "standard",
    interactionIds: Array.from(
      { length: 16 },
      (_, index) => `interaction-${index + 1}`,
    ),
    children,
  });
  const packageRaw = encodeLearningV2CourseSessionReleasePackageV1(value);
  const sessions: LearningV2CourseLessonReleaseSessionInputV1[] = Array.from(
    { length: 56 },
    (_, index) => ({
      courseSessionId: learningV2CourseSessionIdV1(1, index + 1),
      learningOutcomeKind: "understand" as const,
      learningOutcomeByLocale: outcomes,
      packageSchemaVersion: "learning-v2-course-session-release-package.v1",
      packageFingerprint:
        index === 0 ? value.packageFingerprint : h(`package:${index}`),
      contentHash: index === 0 ? h(packageRaw) : h(`raw:${index}`),
      objectGeneration: String(100 + index),
      byteSize: index === 0 ? utf8ByteLengthV1(packageRaw) : 200,
    }),
  );
  const index = materializeLearningV2CourseLessonReleaseIndexV1({
    releaseId: "release-1",
    lessonOrdinal: 1,
    titleByLocale: outcomes,
    canDoByLocale: outcomes,
    ownerLessonFingerprint: h("owner-lesson"),
    ownerConfirmationFingerprint: h("owner-confirmation"),
    sessions,
  });
  return { value, packageRaw, raws, index };
}

describe("Learning V2 direct course session generation-pinned readback v1", () => {
  test("reads five children with bounded concurrency, exposes capsules and hides sidecar raw", async () => {
    const f = fixture();
    let inFlight = 0;
    let peak = 0;
    const handle = await loadLearningV2CourseSessionReadbackV1({
      index: f.index,
      package: f.value,
      packageRaw: f.packageRaw,
      reader: {
        async readExact(pin) {
          inFlight += 1;
          peak = Math.max(peak, inFlight);
          await Promise.resolve();
          inFlight -= 1;
          const raw =
            f.raws[
              f.value.children.findIndex(
                (candidate) => candidate.kind === pin.kind,
              )
            ]!;
          return {
            raw,
            objectGeneration: pin.objectGeneration,
            byteSize: pin.byteSize,
            contentHash: pin.contentHash,
            contentType: pin.contentType,
          };
        },
      },
    });
    expect(peak).toBeLessThanOrEqual(2);
    expect(isLearningV2CourseSessionReadbackHandleV1(handle)).toBe(true);
    expect(isLearningV2CourseSessionReadbackHandleV1({ ...handle })).toBe(
      false,
    );
    expect(getLearningV2CourseSessionReadbackSummaryV1(handle)).toMatchObject({
      courseSessionId: "lesson-01:session:01",
      childCount: 5,
      storageIntegrity: "exact_generation_hash_size_content_type_readback",
      runtimeAuthority: "integrity_only_no_active_release_authority",
      releaseAuthority: false,
    });
    const material = resolveLearningV2CourseSessionLearnerMaterialV1(handle);
    expect(material).toMatchObject({
      introRaw: f.raws[0],
      learnerRaw: f.raws[1],
      evaluatorCapsuleRaw: f.raws[2],
      auxiliaryRaw: f.raws[4],
      evaluatorSidecarRawExposed: false,
    });
    expect(JSON.stringify(material)).not.toContain("acceptedAnswers");
    expect(JSON.stringify(material)).not.toContain("secret");
  });

  test.each([
    "objectGeneration",
    "byteSize",
    "contentHash",
    "contentType",
    "raw",
  ] as const)("rejects %s substitution", async (field) => {
    const f = fixture();
    await expect(
      loadLearningV2CourseSessionReadbackV1({
        index: f.index,
        package: f.value,
        packageRaw: f.packageRaw,
        reader: {
          async readExact(pin) {
            const raw =
              f.raws[
                f.value.children.findIndex(
                  (candidate) => candidate.kind === pin.kind,
                )
              ]!;
            const exact: any = {
              raw,
              objectGeneration: pin.objectGeneration,
              byteSize: pin.byteSize,
              contentHash: pin.contentHash,
              contentType: pin.contentType,
            };
            if (pin.kind === "intro")
              exact[field] =
                field === "byteSize"
                  ? pin.byteSize + 1
                  : field === "raw"
                    ? `${raw} `
                    : "wrong";
            return exact;
          },
        },
      }),
    ).rejects.toThrow("learning_v2_course_session_readback_invalid");
  });

  test("rejects package bytes that differ from the branded package", async () => {
    const f = fixture();
    await expect(
      loadLearningV2CourseSessionReadbackV1({
        index: f.index,
        package: f.value,
        packageRaw: `${f.packageRaw} `,
        reader: {
          async readExact() {
            throw new Error("must_not_read");
          },
        },
      }),
    ).rejects.toThrow("learning_v2_course_session_readback_invalid");
  });
});
