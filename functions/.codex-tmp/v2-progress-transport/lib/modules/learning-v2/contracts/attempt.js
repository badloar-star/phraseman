"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateGraphTupleDispositions = exports.validateCanonicalAttemptRef = exports.buildCanonicalAttemptRef = exports.sanitizeAttemptBody = void 0;
const evidence_1 = require("./evidence");
const decision_registry_1 = require("../policies/decision_registry");
const v2AttemptResultCodes = [
    "CORRECT",
    "WRONG",
    "COMPLETED",
    "SKIPPED",
    "PASS_CONFIDENT",
    "NEEDS_WORK_CONFIDENT",
    "UNCERTAIN",
    "INVALID_AUDIO_OR_SYSTEM",
];
const postHashAttemptBodyKeys = [
    "learningEvidenceRefs",
    "learningNonAssessmentRefs",
    "attemptBodyHash",
    "canonicalAttemptRef",
];
const delayedServerOwnedKeys = [
    "learningTupleDispositions",
    "terminalDisposition",
    "terminalResolution",
    "serverResolution",
    "serverResolutionRef",
    "timingReceiptRef",
];
const graphBodyKeys = [
    "schemaVersion",
    "opId",
    "attemptSurface",
    "outcome",
    "evidence",
    "provenance",
    "inputBinding",
    "learningTupleDispositions",
];
const delayedBodyKeys = [
    "schemaVersion",
    "opId",
    "attemptSurface",
    "outcome",
    "evidence",
    "provenance",
    "inputBinding",
    "delayedCandidates",
];
const isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const hasOneOf = (value, allowed) => typeof value === "string" && allowed.includes(value);
const isValidEvidence = (value) => hasOnlyKeys(value, ["hintsUsed"]) &&
    typeof value.hintsUsed === "number" &&
    Number.isInteger(value.hintsUsed) &&
    value.hintsUsed >= 0;
const hasForbiddenOwnKey = (value, keys) => keys.some((key) => Object.prototype.hasOwnProperty.call(value, key));
const hasOnlyKeys = (value, allowed) => isRecord(value) && Object.keys(value).every((key) => allowed.includes(key));
const cloneAndDeepFreeze = (value) => {
    if (Array.isArray(value))
        return Object.freeze(value.map((entry) => cloneAndDeepFreeze(entry)));
    if (!isRecord(value))
        return value;
    return Object.freeze(Object.fromEntries(Object.entries(value).map(([key, entry]) => [
        key,
        cloneAndDeepFreeze(entry),
    ])));
};
const hasForbiddenKeyRecursively = (value, keys, seen = new WeakSet()) => {
    if (Array.isArray(value))
        return value.some((entry) => hasForbiddenKeyRecursively(entry, keys, seen));
    if (!isRecord(value))
        return false;
    if (seen.has(value))
        return false;
    seen.add(value);
    return Object.entries(value).some(([key, entry]) => keys.includes(key) || hasForbiddenKeyRecursively(entry, keys, seen));
};
const isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;
const hasValidLearningTupleFields = (value, requiredPhase) => isRecord(value) &&
    isNonEmptyString(value.nodeId) &&
    isNonEmptyString(value.objectiveId) &&
    isNonEmptyString(value.skillId) &&
    hasOneOf(value.construct, [
        "semantic",
        "listening",
        "recall",
        "spoken",
        "interaction",
    ]) &&
    hasOneOf(value.phase, [
        "encounter_build",
        "near_transfer",
        "independent_probe",
        "delayed_probe",
    ]) &&
    (requiredPhase === undefined || value.phase === requiredPhase) &&
    hasOneOf(value.targetKind, [
        "objective",
        "semantic_slot",
        "critical_constraint",
    ]) &&
    isNonEmptyString(value.targetId);
const isValidLearningTupleIdentity = (value, requiredPhase) => hasOnlyKeys(value, [
    "nodeId",
    "objectiveId",
    "skillId",
    "construct",
    "phase",
    "targetKind",
    "targetId",
]) && hasValidLearningTupleFields(value, requiredPhase);
const isValidGraphTupleDisposition = (value) => hasOnlyKeys(value, [
    "nodeId",
    "objectiveId",
    "skillId",
    "construct",
    "phase",
    "targetKind",
    "targetId",
    "terminalDisposition",
    "reasonCode",
]) &&
    hasValidLearningTupleFields(value) &&
    hasOneOf(value.terminalDisposition, [
        "assessed_candidate",
        "non_assessment_candidate",
        "no_record",
    ]) &&
    (value.reasonCode === undefined || value.reasonCode === "skipped_by_learner");
const isValidDelayedCandidate = (value) => hasOnlyKeys(value, [
    "candidateId",
    "binding",
    "candidateOutcome",
    "candidateEvidence",
]) &&
    isNonEmptyString(value.candidateId) &&
    isValidLearningTupleIdentity(value.binding, "delayed_probe") &&
    hasOnlyKeys(value.candidateOutcome, ["resultCode"]) &&
    hasOneOf(value.candidateOutcome.resultCode, v2AttemptResultCodes) &&
    isValidEvidence(value.candidateEvidence);
/**
 * Accepts only the hash-free canonical body.  Post-hash chain fields belong to
 * a later materialization envelope and are never silently removed here.
 */
const sanitizeAttemptBody = (input) => {
    if (!isRecord(input))
        throw new Error("attempt_body_invalid");
    if (hasForbiddenKeyRecursively(input, postHashAttemptBodyKeys)) {
        throw new Error("attempt_body_post_hash_field_forbidden");
    }
    const surface = input.attemptSurface;
    const outcome = input.outcome;
    const evidence = input.evidence;
    const provenance = input.provenance;
    const inputBinding = input.inputBinding;
    if (input.schemaVersion !== "v2-attempt-body.v1" ||
        typeof input.opId !== "string" ||
        input.opId.trim().length === 0 ||
        !hasOnlyKeys(surface, ["kind"]) ||
        !hasOneOf(surface.kind, [
            "episode_graph_node",
            "scheduled_delayed_probe",
        ]) ||
        !hasOnlyKeys(outcome, ["resultCode"]) ||
        !hasOneOf(outcome.resultCode, v2AttemptResultCodes) ||
        !isValidEvidence(evidence) ||
        !hasOnlyKeys(provenance, ["phase"]) ||
        !hasOneOf(provenance.phase, [
            "encounter_build",
            "near_transfer",
            "independent_probe",
            "delayed_probe",
        ]) ||
        !hasOnlyKeys(inputBinding, ["source"]) ||
        !hasOneOf(inputBinding.source, [
            "keyboard",
            "tap",
            "word_bank",
            "microphone",
            "accessibility_alternative",
        ])) {
        throw new Error("attempt_body_invalid");
    }
    if (surface.kind === "episode_graph_node") {
        if (provenance.phase === "delayed_probe") {
            throw new Error("attempt_body_surface_phase_mismatch");
        }
        if (!hasOnlyKeys(input, graphBodyKeys)) {
            throw new Error("attempt_body_invalid");
        }
        if (Object.prototype.hasOwnProperty.call(input, "delayedCandidates") ||
            !Array.isArray(input.learningTupleDispositions) ||
            !input.learningTupleDispositions.every(isValidGraphTupleDisposition) ||
            new Set(input.learningTupleDispositions.map(evidence_1.buildLearningEvidenceTupleKey)).size !== input.learningTupleDispositions.length) {
            throw new Error("attempt_body_graph_dispositions_invalid");
        }
        return cloneAndDeepFreeze(input);
    }
    if (provenance.phase !== "delayed_probe") {
        throw new Error("attempt_body_surface_phase_mismatch");
    }
    if (hasForbiddenOwnKey(input, delayedServerOwnedKeys) ||
        (Array.isArray(input.delayedCandidates) &&
            hasForbiddenKeyRecursively(input.delayedCandidates, delayedServerOwnedKeys))) {
        throw new Error("attempt_body_delayed_server_field_forbidden");
    }
    if (!hasOnlyKeys(input, delayedBodyKeys)) {
        throw new Error("attempt_body_invalid");
    }
    if (!Array.isArray(input.delayedCandidates) ||
        !input.delayedCandidates.every(isValidDelayedCandidate)) {
        throw new Error("attempt_body_delayed_candidate_invalid");
    }
    const candidates = input.delayedCandidates;
    const candidateIds = new Set(candidates.map((candidate) => candidate.candidateId));
    const bindingKeys = new Set(candidates.map((candidate) => (0, evidence_1.buildLearningEvidenceTupleKey)(candidate.binding)));
    if (candidateIds.size !== candidates.length ||
        bindingKeys.size !== candidates.length) {
        throw new Error("attempt_body_delayed_candidate_duplicate");
    }
    return cloneAndDeepFreeze(input);
};
exports.sanitizeAttemptBody = sanitizeAttemptBody;
const buildCanonicalAttemptRef = (body) => {
    const canonicalBody = (0, exports.sanitizeAttemptBody)(body);
    return {
        schemaVersion: "v2-attempt-ref.v1",
        opId: canonicalBody.opId,
        attemptBodyHash: (0, decision_registry_1.hashCanonicalBody)(canonicalBody),
    };
};
exports.buildCanonicalAttemptRef = buildCanonicalAttemptRef;
/** Verifies that a ref is the exact canonical hash of a hash-free body. */
const validateCanonicalAttemptRef = (body, ref) => {
    try {
        const sanitized = (0, exports.sanitizeAttemptBody)(body);
        return {
            ok: ref.schemaVersion === "v2-attempt-ref.v1" &&
                ref.opId === sanitized.opId &&
                ref.attemptBodyHash === (0, decision_registry_1.hashCanonicalBody)(sanitized),
        };
    }
    catch {
        return { ok: false };
    }
};
exports.validateCanonicalAttemptRef = validateCanonicalAttemptRef;
const validateGraphTupleDispositions = (declarations, dispositions, resultCode) => {
    const declarationEntries = declarations;
    const dispositionEntries = dispositions;
    if (!Array.isArray(declarationEntries) ||
        !Array.isArray(dispositionEntries) ||
        !hasOneOf(resultCode, v2AttemptResultCodes) ||
        !declarationEntries.every((entry) => isValidLearningTupleIdentity(entry)) ||
        !dispositionEntries.every(isValidGraphTupleDisposition)) {
        return { ok: false };
    }
    const expected = declarationEntries.map(evidence_1.buildLearningEvidenceTupleKey).sort();
    const actual = dispositionEntries.map(evidence_1.buildLearningEvidenceTupleKey).sort();
    if (new Set(expected).size !== expected.length ||
        new Set(actual).size !== actual.length) {
        return { ok: false };
    }
    const exact = expected.length === actual.length &&
        expected.every((key, index) => key === actual[index]);
    const skipped = resultCode === "SKIPPED";
    return {
        ok: exact &&
            dispositions.every((entry) => skipped
                ? entry.terminalDisposition === "no_record" &&
                    entry.reasonCode === "skipped_by_learner"
                : entry.terminalDisposition !== "no_record" &&
                    entry.reasonCode === undefined),
    };
};
exports.validateGraphTupleDispositions = validateGraphTupleDispositions;
