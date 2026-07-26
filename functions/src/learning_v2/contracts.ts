/**
 * Functions-side entry point for the canonical Learning V2 contracts.
 *
 * This is deliberately an adapter, not a second schema.  Cloud Functions
 * compile the canonical contract modules into their bundle and expose the
 * exact same validators, canonical JSON and hash functions used by the app.
 * Keeping this seam explicit prevents server handlers from inventing a
 * permissive DTO that can drift from the release/runtime contract.
 */
export {
  canonicalJsonV1,
  hashCanonicalBody,
} from "../../../modules/learning-v2/policies/decision_registry";

export {
  validateV2LearningPackage,
  validateV2EpisodeContract,
  validateV2CurriculumProjection,
  validateV2CheckpointContract,
} from "../../../modules/learning-v2/contracts/validation";

export {
  sanitizeAttemptBody,
  buildCanonicalAttemptRef,
  validateCanonicalAttemptRef,
  validateGraphTupleDispositions,
} from "../../../modules/learning-v2/contracts/attempt";

export {
  validateLearningEvidenceBody,
  validateLearningNonAssessmentBody,
  buildLearningEvidenceRef,
  buildLearningNonAssessmentRef,
  validateLearningMaterialization,
} from "../../../modules/learning-v2/contracts/evidence";

export type {
  V2LearningPackage,
  V2ContractValidationContext,
  V2ContractValidationResult,
  V2ContractIssue,
} from "../../../modules/learning-v2/contracts/validation";
export type {
  V2AttemptEventBody,
  CanonicalAttemptRef,
} from "../../../modules/learning-v2/contracts/attempt";
export type {
  LearningEvidenceBody,
  LearningNonAssessmentBody,
  LearningEvidenceRef,
  LearningNonAssessmentRef,
  LearningMaterializationRef,
} from "../../../modules/learning-v2/contracts/evidence";

/** Stable manifest used by conformance tests and diagnostics. */
export const FUNCTIONS_V2_CONTRACT_MANIFEST = Object.freeze({
  packageSchemaVersion: "learning-v2-contract-fixture.v1",
  episodeSchemaVersion: "v2-episode-contract.v1",
  curriculumSchemaVersion: "v2-curriculum-contract.v1",
  attemptBodySchemaVersion: "v2-attempt-body.v1",
  evidenceBodySchemaVersion: "learning-evidence-body.v1",
  nonAssessmentBodySchemaVersion: "learning-non-assessment-body.v1",
  canonicalJsonVersion: "canonical-json.v1",
  hashAlgorithm: "sha256-utf8",
} as const);
