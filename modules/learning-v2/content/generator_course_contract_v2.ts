import { hashCanonicalBody } from "../policies/decision_registry";
import {
  LEARNING_V2_APPROVAL_STAGES,
  validateLearningV2GeneratedCoursePackage,
  type LearningV2ApprovalReceipt,
  type LearningV2GeneratedCoursePackage,
} from "./generator_course_contract";
import {
  LEARNING_V2_CHAPTER_SESSION_COUNT_V1,
  LEARNING_V2_COURSE_LESSON_COUNT_V1,
  LEARNING_V2_COURSE_TOPOLOGY_SCHEMA_V1,
  LEARNING_V2_LESSON_CHAPTER_COUNT_V1,
  LEARNING_V2_LESSON_SESSION_COUNT_V1,
  LEARNING_V2_SESSION_MAX_MINUTES_V1,
  LEARNING_V2_SESSION_MIN_MINUTES_V1,
  LEARNING_V2_SESSION_TARGET_MINUTES_V1,
  buildLearningV2CourseTopologyV1,
  learningV2SessionInteractionBudgetV1,
  type LearningV2SessionInteractionBudgetV1,
} from "./course_topology_v1";

export const LEARNING_V2_GENERATED_COURSE_PACKAGE_SCHEMA_V2 =
  "learning-v2-generated-course-package.v2" as const;

export type LearningV2GeneratorTopologyBindingV1 = Readonly<{
  schemaVersion: typeof LEARNING_V2_COURSE_TOPOLOGY_SCHEMA_V1;
  topologyFingerprint: string;
  lessonCount: typeof LEARNING_V2_COURSE_LESSON_COUNT_V1;
  sessionsPerLesson: typeof LEARNING_V2_LESSON_SESSION_COUNT_V1;
  chaptersPerLesson: typeof LEARNING_V2_LESSON_CHAPTER_COUNT_V1;
  sessionsPerChapter: typeof LEARNING_V2_CHAPTER_SESSION_COUNT_V1;
  durationMinutes: Readonly<{
    min: typeof LEARNING_V2_SESSION_MIN_MINUTES_V1;
    target: typeof LEARNING_V2_SESSION_TARGET_MINUTES_V1;
    max: typeof LEARNING_V2_SESSION_MAX_MINUTES_V1;
  }>;
  interactionBudget: LearningV2SessionInteractionBudgetV1;
}>;

export type LearningV2GeneratedCoursePackageV2 = Omit<
  LearningV2GeneratedCoursePackage,
  "schemaVersion"
> &
  Readonly<{
    schemaVersion: typeof LEARNING_V2_GENERATED_COURSE_PACKAGE_SCHEMA_V2;
    topology: LearningV2GeneratorTopologyBindingV1;
    realLessonContentAuthorship: "owner_only";
  }>;

export function learningV2GeneratorTopologyBindingV1(): LearningV2GeneratorTopologyBindingV1 {
  const topology = buildLearningV2CourseTopologyV1();
  return Object.freeze({
    schemaVersion: topology.schemaVersion,
    topologyFingerprint: topology.topologyFingerprint,
    lessonCount: topology.lessonCount,
    sessionsPerLesson: topology.sessionsPerLesson,
    chaptersPerLesson: topology.chaptersPerLesson,
    sessionsPerChapter: topology.sessionsPerChapter,
    durationMinutes: Object.freeze({
      min: LEARNING_V2_SESSION_MIN_MINUTES_V1,
      target: LEARNING_V2_SESSION_TARGET_MINUTES_V1,
      max: LEARNING_V2_SESSION_MAX_MINUTES_V1,
    }),
    interactionBudget: learningV2SessionInteractionBudgetV1(),
  });
}

function exactFingerprintMatch(left: unknown, right: unknown): boolean {
  return hashCanonicalBody(left) === hashCanonicalBody(right);
}

export function validateLearningV2GeneratedCoursePackageV2(
  input: LearningV2GeneratedCoursePackageV2,
): LearningV2GeneratedCoursePackageV2 {
  if (input.schemaVersion !== LEARNING_V2_GENERATED_COURSE_PACKAGE_SCHEMA_V2) {
    throw new Error("learning_v2_generator_course_v2_schema_invalid");
  }
  if (
    !exactFingerprintMatch(
      input.topology,
      learningV2GeneratorTopologyBindingV1(),
    )
  ) {
    throw new Error("learning_v2_generator_course_v2_topology_invalid");
  }
  if (input.realLessonContentAuthorship !== "owner_only") {
    throw new Error("learning_v2_generator_course_v2_authorship_invalid");
  }
  const basePackage: LearningV2GeneratedCoursePackage = {
    schemaVersion: "learning-v2-generated-course-package.v1",
    packageId: input.packageId,
    targetLanguage: input.targetLanguage,
    entryBand: input.entryBand,
    exitBand: input.exitBand,
    interfaceLocales: input.interfaceLocales,
    learningCycle: input.learningCycle,
    objectives: input.objectives,
    artifacts: input.artifacts,
  };
  validateLearningV2GeneratedCoursePackage(basePackage);
  return input;
}

export function learningV2GeneratedCoursePackageV2Fingerprint(
  input: LearningV2GeneratedCoursePackageV2,
): string {
  validateLearningV2GeneratedCoursePackageV2(input);
  return hashCanonicalBody(input);
}

/** Release stays owner-only and must bind the exact topology-bearing v2 bytes. */
export function assertLearningV2GeneratedCourseReleaseApprovedV2(
  input: Readonly<{
    coursePackage: LearningV2GeneratedCoursePackageV2;
    approvalReceipts: readonly LearningV2ApprovalReceipt[];
  }>,
): void {
  const fingerprint = learningV2GeneratedCoursePackageV2Fingerprint(
    input.coursePackage,
  );
  if (input.approvalReceipts.length !== LEARNING_V2_APPROVAL_STAGES.length) {
    throw new Error("learning_v2_generator_approval_incomplete");
  }
  for (const [index, stage] of LEARNING_V2_APPROVAL_STAGES.entries()) {
    const receipt = input.approvalReceipts[index];
    if (
      receipt?.stage !== stage ||
      receipt.state !== "approved" ||
      receipt.packageFingerprint !== fingerprint ||
      receipt.reviewerId !== "owner" ||
      typeof receipt.reviewedAtIso !== "string" ||
      Number.isNaN(Date.parse(receipt.reviewedAtIso))
    ) {
      throw new Error(`learning_v2_generator_approval_${stage}_missing`);
    }
  }
}
