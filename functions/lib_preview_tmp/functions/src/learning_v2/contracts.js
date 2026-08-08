"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FUNCTIONS_V2_CONTRACT_MANIFEST = exports.validateLearningMaterialization = exports.buildLearningNonAssessmentRef = exports.buildLearningEvidenceRef = exports.validateLearningNonAssessmentBody = exports.validateLearningEvidenceBody = exports.validateGraphTupleDispositions = exports.validateCanonicalAttemptRef = exports.buildCanonicalAttemptRef = exports.sanitizeAttemptBody = exports.validateV2CheckpointContract = exports.validateV2CurriculumProjection = exports.validateV2EpisodeContract = exports.validateV2LearningPackage = exports.hashCanonicalBody = exports.canonicalJsonV1 = void 0;
/**
 * Functions-side entry point for the canonical Learning V2 contracts.
 *
 * This is deliberately an adapter, not a second schema.  Cloud Functions
 * compile the canonical contract modules into their bundle and expose the
 * exact same validators, canonical JSON and hash functions used by the app.
 * Keeping this seam explicit prevents server handlers from inventing a
 * permissive DTO that can drift from the release/runtime contract.
 */
var decision_registry_1 = require("../../../modules/learning-v2/policies/decision_registry");
Object.defineProperty(exports, "canonicalJsonV1", { enumerable: true, get: function () { return decision_registry_1.canonicalJsonV1; } });
Object.defineProperty(exports, "hashCanonicalBody", { enumerable: true, get: function () { return decision_registry_1.hashCanonicalBody; } });
var validation_1 = require("../../../modules/learning-v2/contracts/validation");
Object.defineProperty(exports, "validateV2LearningPackage", { enumerable: true, get: function () { return validation_1.validateV2LearningPackage; } });
Object.defineProperty(exports, "validateV2EpisodeContract", { enumerable: true, get: function () { return validation_1.validateV2EpisodeContract; } });
Object.defineProperty(exports, "validateV2CurriculumProjection", { enumerable: true, get: function () { return validation_1.validateV2CurriculumProjection; } });
Object.defineProperty(exports, "validateV2CheckpointContract", { enumerable: true, get: function () { return validation_1.validateV2CheckpointContract; } });
var attempt_1 = require("../../../modules/learning-v2/contracts/attempt");
Object.defineProperty(exports, "sanitizeAttemptBody", { enumerable: true, get: function () { return attempt_1.sanitizeAttemptBody; } });
Object.defineProperty(exports, "buildCanonicalAttemptRef", { enumerable: true, get: function () { return attempt_1.buildCanonicalAttemptRef; } });
Object.defineProperty(exports, "validateCanonicalAttemptRef", { enumerable: true, get: function () { return attempt_1.validateCanonicalAttemptRef; } });
Object.defineProperty(exports, "validateGraphTupleDispositions", { enumerable: true, get: function () { return attempt_1.validateGraphTupleDispositions; } });
var evidence_1 = require("../../../modules/learning-v2/contracts/evidence");
Object.defineProperty(exports, "validateLearningEvidenceBody", { enumerable: true, get: function () { return evidence_1.validateLearningEvidenceBody; } });
Object.defineProperty(exports, "validateLearningNonAssessmentBody", { enumerable: true, get: function () { return evidence_1.validateLearningNonAssessmentBody; } });
Object.defineProperty(exports, "buildLearningEvidenceRef", { enumerable: true, get: function () { return evidence_1.buildLearningEvidenceRef; } });
Object.defineProperty(exports, "buildLearningNonAssessmentRef", { enumerable: true, get: function () { return evidence_1.buildLearningNonAssessmentRef; } });
Object.defineProperty(exports, "validateLearningMaterialization", { enumerable: true, get: function () { return evidence_1.validateLearningMaterialization; } });
/** Stable manifest used by conformance tests and diagnostics. */
exports.FUNCTIONS_V2_CONTRACT_MANIFEST = Object.freeze({
    packageSchemaVersion: "learning-v2-contract-fixture.v1",
    episodeSchemaVersion: "v2-episode-contract.v1",
    curriculumSchemaVersion: "v2-curriculum-contract.v1",
    attemptBodySchemaVersion: "v2-attempt-body.v1",
    evidenceBodySchemaVersion: "learning-evidence-body.v1",
    nonAssessmentBodySchemaVersion: "learning-non-assessment-body.v1",
    canonicalJsonVersion: "canonical-json.v1",
    hashAlgorithm: "sha256-utf8",
});
//# sourceMappingURL=contracts.js.map