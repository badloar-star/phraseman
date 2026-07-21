"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveServerScore = void 0;
exports.assertServerScoreResolution = assertServerScoreResolution;
const decision_registry_1 = require("../../../modules/learning-v2/policies/decision_registry");
const RESULT_CODES = [
    "PASS_CONFIDENT",
    "NEEDS_WORK_CONFIDENT",
    "UNCERTAIN",
    "INVALID_AUDIO_OR_SYSTEM",
    "CORRECT",
    "WRONG",
    "COMPLETED",
    "SKIPPED",
];
const isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const exactKeys = (value, keys) => Object.keys(value).length === keys.length && keys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
const isSafeId = (value) => typeof value === "string" && /^[A-Za-z0-9._-]{1,128}$/.test(value);
const isHash = (value) => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
const isAttemptRef = (value) => isRecord(value) &&
    exactKeys(value, ["schemaVersion", "opId", "attemptBodyHash"]) &&
    value.schemaVersion === "v2-attempt-ref.v1" &&
    isSafeId(value.opId) &&
    isHash(value.attemptBodyHash);
const isPolicyRef = (value) => isRecord(value) &&
    exactKeys(value, ["kind", "key", "version", "contentHash"]) &&
    value.kind === "scoring" &&
    isSafeId(value.key) &&
    Number.isSafeInteger(value.version) &&
    Number(value.version) >= 1 &&
    isHash(value.contentHash);
const isResultCode = (value) => typeof value === "string" && RESULT_CODES.includes(value);
const isStars = (value) => typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 3;
const scoreBody = (resolution) => resolution;
const assertInput = (input) => {
    if (!isAttemptRef(input.attemptRef))
        throw new Error("v2_server_score_attempt_ref_invalid");
    if (!isSafeId(input.activityId) || !isSafeId(input.starSlotId) || !input.progressCompatibilityKey.trim()) {
        throw new Error("v2_server_score_identity_invalid");
    }
    if (!isPolicyRef(input.scoringPolicyRef))
        throw new Error("v2_server_score_policy_ref_invalid");
    if (!isResultCode(input.resultCode))
        throw new Error("v2_server_score_result_invalid");
    if (!isHash(input.evidenceComponentFingerprint))
        throw new Error("v2_server_score_evidence_fingerprint_invalid");
};
/**
 * Resolve a score inside trusted Functions code.  The evaluator is intentionally
 * injected: policy lookup/evaluation is a later integration seam, while this
 * contract already prevents a client projection from being treated as a score.
 */
const resolveServerScore = (input, evaluate) => {
    assertInput(input);
    const candidatePerformanceStars = evaluate(Object.freeze({ ...input }));
    if (!isStars(candidatePerformanceStars))
        throw new Error("v2_server_score_output_invalid");
    if ((input.resultCode === "UNCERTAIN" || input.resultCode === "INVALID_AUDIO_OR_SYSTEM" || input.resultCode === "SKIPPED") && candidatePerformanceStars !== 0) {
        throw new Error("v2_server_score_result_must_be_zero");
    }
    const body = scoreBody({
        schemaVersion: "v2-server-score-resolution.v1",
        source: "server_policy",
        attemptRef: input.attemptRef,
        activityId: input.activityId,
        starSlotId: input.starSlotId,
        progressCompatibilityKey: input.progressCompatibilityKey,
        scoringPolicyRef: input.scoringPolicyRef,
        resultCode: input.resultCode,
        candidatePerformanceStars,
        evidenceComponentFingerprint: input.evidenceComponentFingerprint,
    });
    return Object.freeze({ ...body, decisionHash: (0, decision_registry_1.hashCanonicalBody)(body) });
};
exports.resolveServerScore = resolveServerScore;
function assertServerScoreResolution(value, expected) {
    if (!isRecord(value) || !exactKeys(value, ["schemaVersion", "source", "attemptRef", "activityId", "starSlotId", "progressCompatibilityKey", "scoringPolicyRef", "resultCode", "candidatePerformanceStars", "evidenceComponentFingerprint", "decisionHash"]) || value.schemaVersion !== "v2-server-score-resolution.v1" || value.source !== "server_policy" || !isAttemptRef(value.attemptRef) || !isSafeId(value.activityId) || !isSafeId(value.starSlotId) || typeof value.progressCompatibilityKey !== "string" || !value.progressCompatibilityKey.trim() || !isPolicyRef(value.scoringPolicyRef) || !isResultCode(value.resultCode) || !isStars(value.candidatePerformanceStars) || !isHash(value.evidenceComponentFingerprint) || !isHash(value.decisionHash)) {
        throw new Error("v2_server_score_resolution_invalid");
    }
    if ((value.resultCode === "UNCERTAIN" || value.resultCode === "INVALID_AUDIO_OR_SYSTEM" || value.resultCode === "SKIPPED") && value.candidatePerformanceStars !== 0)
        throw new Error("v2_server_score_result_must_be_zero");
    const body = { ...value };
    delete body.decisionHash;
    if ((0, decision_registry_1.hashCanonicalBody)(body) !== value.decisionHash)
        throw new Error("v2_server_score_hash_mismatch");
    if (expected && ((0, decision_registry_1.hashCanonicalBody)(value.attemptRef) !== (0, decision_registry_1.hashCanonicalBody)(expected.attemptRef) || value.activityId !== expected.activityId || value.starSlotId !== expected.starSlotId || value.progressCompatibilityKey !== expected.progressCompatibilityKey || (0, decision_registry_1.hashCanonicalBody)(value.scoringPolicyRef) !== (0, decision_registry_1.hashCanonicalBody)(expected.scoringPolicyRef) || value.evidenceComponentFingerprint !== expected.evidenceComponentFingerprint)) {
        throw new Error("v2_server_score_context_mismatch");
    }
}
