import {
  LEARNING_V2_APPROVAL_STAGES,
  LEARNING_V2_INTERFACE_LOCALES,
  LEARNING_V2_LEARNING_CYCLE,
  LEARNING_V2_REQUIRED_CONTENT_KINDS,
  type LearningV2Localized,
} from "../modules/learning-v2/content/generator_course_contract";
import {
  assertLearningV2GeneratedCourseReleaseApprovedV2,
  learningV2GeneratedCoursePackageV2Fingerprint,
  learningV2GeneratorTopologyBindingV1,
  validateLearningV2GeneratedCoursePackageV2,
  type LearningV2GeneratedCoursePackageV2,
} from "../modules/learning-v2/content/generator_course_contract_v2";
import { LEARNING_V2_PERSONAL_PLAN_POLICY_V1 } from "../modules/learning-v2/content/course_topology_v1";

const localized = <T>(
  value: (locale: (typeof LEARNING_V2_INTERFACE_LOCALES)[number]) => T,
): LearningV2Localized<T> =>
  Object.fromEntries(
    LEARNING_V2_INTERFACE_LOCALES.map((locale) => [locale, value(locale)]),
  ) as LearningV2Localized<T>;

function validPackage(): LearningV2GeneratedCoursePackageV2 {
  return {
    schemaVersion: "learning-v2-generated-course-package.v2",
    packageId: "neutral-owner-course-release-1",
    targetLanguage: "en",
    entryBand: "PRE_A1",
    exitBand: "C2",
    interfaceLocales: LEARNING_V2_INTERFACE_LOCALES,
    learningCycle: LEARNING_V2_LEARNING_CYCLE,
    topology: learningV2GeneratorTopologyBindingV1(),
    personalPlanDelivery: LEARNING_V2_PERSONAL_PLAN_POLICY_V1,
    realLessonContentAuthorship: "owner_only",
    objectives: [
      {
        objectiveId: "neutral-fixture-objective",
        cefrBand: "PRE_A1",
        canDoByLocale: localized(
          (locale) => `Neutral fixture objective (${locale})`,
        ),
      },
    ],
    artifacts: LEARNING_V2_REQUIRED_CONTENT_KINDS.map((kind, index) => ({
      artifactId: `neutral-artifact-${String(index + 1).padStart(2, "0")}`,
      kind,
      sequenceOrdinal: index + 1,
      contentByLocale: localized((locale) => ({
        title: `Neutral ${kind} (${locale})`,
        body: `Mechanics-only fixture ${index + 1}`,
      })),
      introducesConceptIds: index === 3 ? ["neutral-concept"] : [],
      usesConceptIds: index >= 3 ? ["neutral-concept"] : [],
      dependsOnArtifactIds:
        index === 0
          ? []
          : [`neutral-artifact-${String(index).padStart(2, "0")}`],
    })),
  };
}

describe("Learning V2 whole-course generator contract v2", () => {
  test("requires the exact owner-current 32 by 56 topology", () => {
    const coursePackage = validPackage();
    expect(validateLearningV2GeneratedCoursePackageV2(coursePackage)).toBe(
      coursePackage,
    );
    expect(coursePackage.topology).toMatchObject({
      lessonCount: 32,
      sessionsPerLesson: 56,
      chaptersPerLesson: 7,
      sessionsPerChapter: 8,
      durationMinutes: { min: 5, target: 7, max: 8 },
    });
  });

  test("rejects old 12-session topology and Personal Plan on the main map", () => {
    const coursePackage = validPackage();
    expect(() =>
      validateLearningV2GeneratedCoursePackageV2({
        ...coursePackage,
        topology: { ...coursePackage.topology, sessionsPerLesson: 12 as never },
      }),
    ).toThrow("learning_v2_generator_course_v2_topology_invalid");
    expect(() =>
      validateLearningV2GeneratedCoursePackageV2({
        ...coursePackage,
        personalPlanDelivery: {
          ...coursePackage.personalPlanDelivery,
          mainMapPlacement: "side_cards" as never,
        },
      }),
    ).toThrow("learning_v2_generator_course_v2_personal_plan_policy_invalid");
  });

  test("cannot relabel Codex-created content as owner-authored", () => {
    expect(() =>
      validateLearningV2GeneratedCoursePackageV2({
        ...validPackage(),
        realLessonContentAuthorship: "codex_generated" as never,
      }),
    ).toThrow("learning_v2_generator_course_v2_authorship_invalid");
  });

  test("requires owner approval against the exact v2 topology-bound package", () => {
    const coursePackage = validPackage();
    const packageFingerprint =
      learningV2GeneratedCoursePackageV2Fingerprint(coursePackage);
    const approvals = LEARNING_V2_APPROVAL_STAGES.map((stage) => ({
      stage,
      state: "approved" as const,
      packageFingerprint,
      reviewerId: "owner",
      reviewedAtIso: "2026-08-13T15:30:00.000Z",
    }));
    expect(() =>
      assertLearningV2GeneratedCourseReleaseApprovedV2({
        coursePackage,
        approvalReceipts: approvals,
      }),
    ).not.toThrow();
    expect(() =>
      assertLearningV2GeneratedCourseReleaseApprovedV2({
        coursePackage,
        approvalReceipts: approvals.map((receipt) => ({
          ...receipt,
          packageFingerprint:
            receipt.stage === "curriculum"
              ? "0".repeat(64)
              : receipt.packageFingerprint,
        })),
      }),
    ).toThrow("learning_v2_generator_approval_curriculum_missing");
  });
});
