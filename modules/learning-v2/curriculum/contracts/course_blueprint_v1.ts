/**
 * Typed authority for one exact Learning V2 curriculum session packet.
 *
 * зачем: пакет планирования обязан быть полным до learner-facing authoring.
 * Этот модуль ничего не придумывает и не заполняет — только отвергает
 * неполные или противоречивые данные стабильным кодом.
 */

export type LearningV2CurriculumLearningDeltaV1 =
  | "support_fade"
  | "delayed_retrieval"
  | "changed_context"
  | "contrast_discrimination"
  | "productive_shift"
  | "targeted_error_repair"
  | "transfer";

export type LearningV2CurriculumLexicalPlanRoleV1 =
  | "introduce_and_retrieve"
  | "retrieval_only";

export type LearningV2CurriculumSessionRoleV1 =
  | "introduce_grammar"
  | "extend_grammar"
  | "guided_application"
  | "retrieval"
  | "variation"
  | "near_transfer_repair"
  | "voice"
  | "checkpoint"
  | "final_exam";

export type LearningV2CurriculumSessionPacketV1 = Readonly<{
  sessionId: string;
  lessonOrdinal: number;
  chapterOrdinal: number;
  sessionOrdinal: number;
  role: LearningV2CurriculumSessionRoleV1;
  primaryCanDoStep: string;
  grammarOperationId: string | null;
  reviewConstructIds: readonly string[];
  learningDelta: readonly LearningV2CurriculumLearningDeltaV1[];
  prerequisiteObjectiveIds: readonly string[];
  newLexicalSenseIds: readonly string[];
  retrievalLexicalSenseIds: readonly string[];
  lexicalPlanRole: LearningV2CurriculumLexicalPlanRoleV1;
  lexicalReviewOnlyReason: string | null;
  phraseFrameIds: readonly string[];
  canonicalEnglishExamples: readonly [string, string, ...string[]];
  allowedLexicalSlotSenseIds: readonly string[];
  forbiddenSurfaceFormIds: readonly string[];
  prohibitedConstructIds: readonly string[];
  sessionKind: string;
  learningFunctions: readonly string[];
  requiredModeFamilies: readonly string[];
  supportStart: "maximum" | "high" | "medium" | "low" | "minimal";
  supportEnd: "high" | "medium" | "low" | "minimal" | "none";
  independentProbeId: string;
  delayedProbeIds: readonly string[];
  reviewSourceSessionIds: readonly string[];
  sourceEvidenceRefs: readonly string[];
}>;

const ROLES = new Set<LearningV2CurriculumSessionRoleV1>([
  "introduce_grammar",
  "extend_grammar",
  "guided_application",
  "retrieval",
  "variation",
  "near_transfer_repair",
  "voice",
  "checkpoint",
  "final_exam",
]);

const LEARNING_DELTAS = new Set<LearningV2CurriculumLearningDeltaV1>([
  "support_fade",
  "delayed_retrieval",
  "changed_context",
  "contrast_discrimination",
  "productive_shift",
  "targeted_error_repair",
  "transfer",
]);

const LEXICAL_PLAN_ROLES = new Set<LearningV2CurriculumLexicalPlanRoleV1>([
  "introduce_and_retrieve",
  "retrieval_only",
]);

const SUPPORT_START = new Set(["maximum", "high", "medium", "low", "minimal"]);
const SUPPORT_END = new Set(["high", "medium", "low", "minimal", "none"]);

function fail(code: string): never {
  throw new Error(code);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every(isNonEmptyString);
}

function hasDuplicates(values: readonly string[]): boolean {
  return new Set(values).size !== values.length;
}

export function assertLearningV2CurriculumSessionPacketV1(
  input: unknown,
): asserts input is LearningV2CurriculumSessionPacketV1 {
  if (!isRecord(input)) fail("learning_v2_curriculum_packet_invalid");

  if (
    !isNonEmptyString(input.sessionId) ||
    !Number.isSafeInteger(input.lessonOrdinal) ||
    (input.lessonOrdinal as number) < 1 ||
    (input.lessonOrdinal as number) > 32 ||
    !Number.isSafeInteger(input.chapterOrdinal) ||
    (input.chapterOrdinal as number) < 1 ||
    (input.chapterOrdinal as number) > 7 ||
    !Number.isSafeInteger(input.sessionOrdinal) ||
    (input.sessionOrdinal as number) < 1 ||
    (input.sessionOrdinal as number) > 56 ||
    !ROLES.has(input.role as LearningV2CurriculumSessionRoleV1) ||
    !isNonEmptyString(input.primaryCanDoStep)
  ) {
    fail("learning_v2_curriculum_packet_identity_invalid");
  }

  if (
    input.grammarOperationId !== null &&
    !isNonEmptyString(input.grammarOperationId)
  ) {
    fail("learning_v2_curriculum_packet_grammar_operation_invalid");
  }
  if (!isStringArray(input.reviewConstructIds)) {
    fail("learning_v2_curriculum_packet_review_constructs_invalid");
  }

  const hasGrammarOperation = isNonEmptyString(input.grammarOperationId);
  const hasReviewConstructs = input.reviewConstructIds.length > 0;
  if (!hasGrammarOperation && !hasReviewConstructs) {
    fail("learning_v2_curriculum_packet_grammar_or_review_required");
  }
  if (hasGrammarOperation && hasReviewConstructs) {
    fail("learning_v2_curriculum_packet_grammar_and_review_conflict");
  }

  if (
    !isStringArray(input.learningDelta) ||
    input.learningDelta.length === 0 ||
    input.learningDelta.some(
      (delta) =>
        !LEARNING_DELTAS.has(delta as LearningV2CurriculumLearningDeltaV1),
    )
  ) {
    fail("learning_v2_curriculum_packet_learning_delta_invalid");
  }

  for (const field of [
    "prerequisiteObjectiveIds",
    "newLexicalSenseIds",
    "retrievalLexicalSenseIds",
    "allowedLexicalSlotSenseIds",
    "forbiddenSurfaceFormIds",
    "prohibitedConstructIds",
    "delayedProbeIds",
    "reviewSourceSessionIds",
  ] as const) {
    if (!isStringArray(input[field])) {
      fail(`learning_v2_curriculum_packet_${field}_invalid`);
    }
  }

  if (
    !LEXICAL_PLAN_ROLES.has(
      input.lexicalPlanRole as LearningV2CurriculumLexicalPlanRoleV1,
    )
  ) {
    fail("learning_v2_curriculum_packet_lexical_plan_role_invalid");
  }

  // зачем (2026-08-30): вход валидируется как unknown; спискам сенсов нужен
  // явный narrow до string[] — не прошёл: тот же fail, что и у соседей.
  const senseListOf = (value: unknown, code: string): readonly string[] => {
    if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) fail(code);
    return value as readonly string[];
  };
  const newLexicalSenseIds = senseListOf(input.newLexicalSenseIds, "learning_v2_curriculum_packet_new_senses_invalid");
  const retrievalLexicalSenseIds = senseListOf(input.retrievalLexicalSenseIds, "learning_v2_curriculum_packet_retrieval_senses_invalid");
  const allowedLexicalSlotSenseIds = senseListOf(input.allowedLexicalSlotSenseIds, "learning_v2_curriculum_packet_allowed_slots_invalid");

  if (input.lexicalPlanRole === "retrieval_only") {
    if (!isNonEmptyString(input.lexicalReviewOnlyReason)) {
      fail("learning_v2_curriculum_packet_retrieval_only_reason_required");
    }
    if (newLexicalSenseIds.length > 0) {
      fail("learning_v2_curriculum_packet_retrieval_only_new_senses_forbidden");
    }
    if (retrievalLexicalSenseIds.length === 0) {
      fail("learning_v2_curriculum_packet_retrieval_only_senses_required");
    }
  } else if (input.lexicalReviewOnlyReason !== null) {
    fail("learning_v2_curriculum_packet_lexical_review_reason_forbidden");
  }

  if (
    !newLexicalSenseIds.every((senseId) =>
      allowedLexicalSlotSenseIds.includes(senseId),
    )
  ) {
    fail("learning_v2_curriculum_packet_new_sense_outside_allowed_slots");
  }

  if (!isStringArray(input.phraseFrameIds) || input.phraseFrameIds.length === 0) {
    fail("learning_v2_curriculum_packet_phrase_frames_required");
  }

  if (
    !isStringArray(input.canonicalEnglishExamples) ||
    input.canonicalEnglishExamples.length < 2 ||
    input.canonicalEnglishExamples.length > 4
  ) {
    fail("learning_v2_curriculum_packet_canonical_examples_count");
  }
  if (hasDuplicates(input.canonicalEnglishExamples)) {
    fail("learning_v2_curriculum_packet_canonical_examples_duplicate");
  }

  if (
    !isNonEmptyString(input.sessionKind) ||
    !isStringArray(input.learningFunctions) ||
    input.learningFunctions.length === 0 ||
    !isStringArray(input.requiredModeFamilies) ||
    input.requiredModeFamilies.length === 0 ||
    !SUPPORT_START.has(input.supportStart as string) ||
    !SUPPORT_END.has(input.supportEnd as string) ||
    !isNonEmptyString(input.independentProbeId) ||
    !isStringArray(input.sourceEvidenceRefs) ||
    input.sourceEvidenceRefs.length === 0
  ) {
    fail("learning_v2_curriculum_packet_learning_contract_invalid");
  }
}
