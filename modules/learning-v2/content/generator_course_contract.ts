import { hashCanonicalBody, utf8ByteLengthV1 } from '../policies/decision_registry';

/** Every generated Learning V2 package is atomic across these UI languages. */
export const LEARNING_V2_INTERFACE_LOCALES = Object.freeze([
  'ru',
  'uk',
  'es',
  'pt-BR',
  'vi',
  'id',
  'tr',
  'pl',
] as const);

export type LearningV2InterfaceLocale = (typeof LEARNING_V2_INTERFACE_LOCALES)[number];
export type LearningV2Localized<T> = Readonly<Record<LearningV2InterfaceLocale, T>>;

/** PRE_A1 is the product's absolute-zero entry point before ordinary CEFR A1. */
export const LEARNING_V2_CEFR_LADDER = Object.freeze([
  'PRE_A1', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2',
] as const);
export type LearningV2CefrBand = (typeof LEARNING_V2_CEFR_LADDER)[number];

export const LEARNING_V2_REQUIRED_CONTENT_KINDS = Object.freeze([
  'course_map',
  'section_intro',
  'lesson_intro',
  'explanation',
  'model',
  'supported_practice',
  'guided_practice',
  'retrieval_practice',
  'near_transfer',
  'independent_check',
  'delayed_review',
  'sector_exam',
  'hint',
  'error_explanation',
  'accessibility_copy',
  'audio_script',
] as const);
export type LearningV2GeneratedContentKind = (typeof LEARNING_V2_REQUIRED_CONTENT_KINDS)[number];

export const LEARNING_V2_LEARNING_CYCLE = Object.freeze([
  'explain',
  'model',
  'supported_practice',
  'guided_practice',
  'retrieval',
  'near_transfer',
  'independent_check',
  'delayed_review',
  'exam',
] as const);

export const LEARNING_V2_APPROVAL_STAGES = Object.freeze([
  'research',
  'curriculum',
  'lesson_outline',
  'localized_content',
  'audio',
  'quality_assurance',
  'owner_release',
] as const);
export type LearningV2ApprovalStage = (typeof LEARNING_V2_APPROVAL_STAGES)[number];

export type LearningV2GeneratedArtifact = Readonly<{
  artifactId: string;
  kind: LearningV2GeneratedContentKind;
  sequenceOrdinal: number;
  /** Exact localized payload; no locale may be omitted or added. */
  contentByLocale: LearningV2Localized<unknown>;
  /** New concepts taught here. */
  introducesConceptIds: readonly string[];
  /** Concepts used by this artifact; each must already be introduced. */
  usesConceptIds: readonly string[];
  /** Only earlier artifacts may be dependencies. */
  dependsOnArtifactIds: readonly string[];
}>;

export type LearningV2CourseObjective = Readonly<{
  objectiveId: string;
  cefrBand: LearningV2CefrBand;
  canDoByLocale: LearningV2Localized<string>;
}>;

export type LearningV2GeneratedCoursePackage = Readonly<{
  schemaVersion: 'learning-v2-generated-course-package.v1';
  packageId: string;
  targetLanguage: string;
  entryBand: 'PRE_A1';
  exitBand: LearningV2CefrBand;
  interfaceLocales: typeof LEARNING_V2_INTERFACE_LOCALES;
  learningCycle: typeof LEARNING_V2_LEARNING_CYCLE;
  objectives: readonly LearningV2CourseObjective[];
  artifacts: readonly LearningV2GeneratedArtifact[];
}>;

export type LearningV2ApprovalReceipt = Readonly<{
  stage: LearningV2ApprovalStage;
  state: 'pending' | 'approved' | 'rejected';
  packageFingerprint: string | null;
  reviewerId: string | null;
  reviewedAtIso: string | null;
}>;

const TOKEN_RE = /^[A-Za-z0-9._:-]{1,160}$/;
const LANGUAGE_RE = /^[a-z]{2,12}(?:-[A-Z]{2})?$/;
const SHA256_RE = /^[a-f0-9]{64}$/;
const MAX_LOCALIZED_JSON_BYTES = 128 * 1024;

function assertToken(value: unknown, field: string): asserts value is string {
  if (typeof value !== 'string' || !TOKEN_RE.test(value)) {
    throw new Error(`learning_v2_generator_${field}_invalid`);
  }
}

export function assertLearningV2LocalizedEnvelope<T>(value: unknown, field: string): asserts value is LearningV2Localized<T> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`learning_v2_generator_${field}_locales_invalid`);
  }
  const keys = Object.keys(value);
  if (keys.length !== LEARNING_V2_INTERFACE_LOCALES.length ||
    LEARNING_V2_INTERFACE_LOCALES.some((locale, index) => keys[index] !== locale)) {
    throw new Error(`learning_v2_generator_${field}_locales_invalid`);
  }
  for (const locale of LEARNING_V2_INTERFACE_LOCALES) {
    const localized = (value as Record<string, unknown>)[locale];
    if (localized == null || (typeof localized === 'string' && !localized.trim())) {
      throw new Error(`learning_v2_generator_${field}_${locale}_empty`);
    }
    let encoded: string;
    try {
      encoded = JSON.stringify(localized);
    } catch {
      throw new Error(`learning_v2_generator_${field}_${locale}_invalid`);
    }
    if (!encoded || encoded.length > MAX_LOCALIZED_JSON_BYTES || utf8ByteLengthV1(encoded) > MAX_LOCALIZED_JSON_BYTES) {
      throw new Error(`learning_v2_generator_${field}_${locale}_invalid`);
    }
  }
}

function assertUniqueTokens(values: readonly string[], field: string): void {
  if (!Array.isArray(values) || values.some((value) => typeof value !== 'string' || !TOKEN_RE.test(value)) ||
    new Set(values).size !== values.length) {
    throw new Error(`learning_v2_generator_${field}_invalid`);
  }
}

/**
 * Validates the whole generated course package. This is intentionally broader
 * than intro validation: map copy, teaching, tasks, feedback, exams,
 * accessibility and audio scripts all share one all-locales release boundary.
 */
export function validateLearningV2GeneratedCoursePackage(
  input: LearningV2GeneratedCoursePackage,
): LearningV2GeneratedCoursePackage {
  if (input.schemaVersion !== 'learning-v2-generated-course-package.v1') {
    throw new Error('learning_v2_generator_course_schema_invalid');
  }
  assertToken(input.packageId, 'course_package_id');
  if (!LANGUAGE_RE.test(input.targetLanguage)) throw new Error('learning_v2_generator_target_language_invalid');
  if (input.entryBand !== 'PRE_A1' || !LEARNING_V2_CEFR_LADDER.includes(input.exitBand)) {
    throw new Error('learning_v2_generator_cefr_ladder_invalid');
  }
  if (input.interfaceLocales.length !== LEARNING_V2_INTERFACE_LOCALES.length ||
    input.interfaceLocales.some((locale, index) => locale !== LEARNING_V2_INTERFACE_LOCALES[index])) {
    throw new Error('learning_v2_generator_interface_locales_invalid');
  }
  if (input.learningCycle.length !== LEARNING_V2_LEARNING_CYCLE.length ||
    input.learningCycle.some((stage, index) => stage !== LEARNING_V2_LEARNING_CYCLE[index])) {
    throw new Error('learning_v2_generator_learning_cycle_invalid');
  }
  if (!Array.isArray(input.objectives) || input.objectives.length < 1 || input.objectives.length > 2_000) {
    throw new Error('learning_v2_generator_objectives_invalid');
  }
  const objectiveIds = new Set<string>();
  for (const objective of input.objectives) {
    assertToken(objective.objectiveId, 'objective_id');
    if (objectiveIds.has(objective.objectiveId) || !LEARNING_V2_CEFR_LADDER.includes(objective.cefrBand)) {
      throw new Error('learning_v2_generator_objective_invalid');
    }
    objectiveIds.add(objective.objectiveId);
    assertLearningV2LocalizedEnvelope<string>(objective.canDoByLocale, 'objective');
  }
  if (!Array.isArray(input.artifacts) || input.artifacts.length < LEARNING_V2_REQUIRED_CONTENT_KINDS.length || input.artifacts.length > 10_000) {
    throw new Error('learning_v2_generator_artifacts_invalid');
  }
  const kinds = new Set<LearningV2GeneratedContentKind>();
  const artifactIds = new Set<string>();
  const introducedConcepts = new Set<string>();
  let previousOrdinal = 0;
  for (const artifact of input.artifacts) {
    assertToken(artifact.artifactId, 'artifact_id');
    if (artifactIds.has(artifact.artifactId) || !LEARNING_V2_REQUIRED_CONTENT_KINDS.includes(artifact.kind)) {
      throw new Error('learning_v2_generator_artifact_invalid');
    }
    if (!Number.isSafeInteger(artifact.sequenceOrdinal) || artifact.sequenceOrdinal !== previousOrdinal + 1) {
      throw new Error('learning_v2_generator_artifact_order_invalid');
    }
    previousOrdinal = artifact.sequenceOrdinal;
    assertLearningV2LocalizedEnvelope(artifact.contentByLocale, 'artifact');
    assertUniqueTokens(artifact.introducesConceptIds, 'introduced_concepts');
    assertUniqueTokens(artifact.usesConceptIds, 'used_concepts');
    assertUniqueTokens(artifact.dependsOnArtifactIds, 'artifact_dependencies');
    if (artifact.dependsOnArtifactIds.some((id: string) => !artifactIds.has(id))) {
      throw new Error('learning_v2_generator_dependency_not_previous');
    }
    if (artifact.usesConceptIds.some((id: string) => !introducedConcepts.has(id) && !artifact.introducesConceptIds.includes(id))) {
      throw new Error('learning_v2_generator_use_before_introduction');
    }
    if (artifact.introducesConceptIds.some((id: string) => introducedConcepts.has(id))) {
      throw new Error('learning_v2_generator_concept_reintroduced');
    }
    artifact.introducesConceptIds.forEach((id: string) => introducedConcepts.add(id));
    artifactIds.add(artifact.artifactId);
    kinds.add(artifact.kind);
  }
  if (LEARNING_V2_REQUIRED_CONTENT_KINDS.some((kind) => !kinds.has(kind))) {
    throw new Error('learning_v2_generator_required_content_missing');
  }
  return input;
}

export function learningV2GeneratedCoursePackageFingerprint(input: LearningV2GeneratedCoursePackage): string {
  validateLearningV2GeneratedCoursePackage(input);
  return hashCanonicalBody(input);
}

/** Release is impossible until the owner approved every generation stage. */
export function assertLearningV2GeneratedCourseReleaseApproved(input: Readonly<{
  coursePackage: LearningV2GeneratedCoursePackage;
  approvalReceipts: readonly LearningV2ApprovalReceipt[];
}>): void {
  const fingerprint = learningV2GeneratedCoursePackageFingerprint(input.coursePackage);
  if (input.approvalReceipts.length !== LEARNING_V2_APPROVAL_STAGES.length) {
    throw new Error('learning_v2_generator_approval_incomplete');
  }
  for (const [index, stage] of LEARNING_V2_APPROVAL_STAGES.entries()) {
    const receipt = input.approvalReceipts[index];
    if (receipt?.stage !== stage || receipt.state !== 'approved' || receipt.packageFingerprint !== fingerprint ||
      receipt.reviewerId !== 'owner' || typeof receipt.reviewedAtIso !== 'string' ||
      Number.isNaN(Date.parse(receipt.reviewedAtIso))) {
      throw new Error(`learning_v2_generator_approval_${stage}_missing`);
    }
  }
  if (!SHA256_RE.test(fingerprint)) throw new Error('learning_v2_generator_fingerprint_invalid');
}
