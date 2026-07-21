"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.materializeProgressEvidenceBundle = exports.mergeProgressEvidenceIndex = void 0;
const decision_registry_1 = require("../../../modules/learning-v2/policies/decision_registry");
const evidence_1 = require("../../../modules/learning-v2/contracts/evidence");
const mergeProgressEvidenceIndex = (existing, incoming, maxEntries = 256) => {
    if (!Number.isSafeInteger(maxEntries) || maxEntries < 1 || maxEntries > 1024)
        throw new Error("v2_progress_evidence_index_bound_invalid");
    const next = { ...existing };
    for (const ref of incoming) {
        const key = ref.tupleKey;
        const prior = next[key];
        if (prior) {
            const priorHash = "evidenceBodyHash" in prior ? prior.evidenceBodyHash : prior.nonAssessmentBodyHash;
            const nextHash = "evidenceBodyHash" in ref ? ref.evidenceBodyHash : ref.nonAssessmentBodyHash;
            if (priorHash !== nextHash)
                throw new Error("v2_progress_evidence_index_conflict");
            continue;
        }
        if (Object.keys(next).length >= maxEntries)
            throw new Error("v2_progress_evidence_index_overflow");
        next[key] = ref;
    }
    return Object.freeze(next);
};
exports.mergeProgressEvidenceIndex = mergeProgressEvidenceIndex;
const sameAttempt = (left, right) => left.schemaVersion === right.schemaVersion && left.opId === right.opId && left.attemptBodyHash === right.attemptBodyHash;
const exactKeys = (value, keys) => Object.keys(value).length === keys.length && keys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
const isRef = (value) => typeof value === "object" && value !== null && !Array.isArray(value) && exactKeys(value, ["schemaVersion", "opId", "attemptBodyHash"]) && value.schemaVersion === "v2-attempt-ref.v1" && typeof value.opId === "string" && /^[a-f0-9]{64}$/.test(String(value.attemptBodyHash));
const materializeProgressEvidenceBundle = (bundle) => {
    if (bundle.schemaVersion !== "v2-progress-evidence-bundle.v1" || !isRef(bundle.attemptRef) || bundle.evidenceBodies.length > 256 || bundle.nonAssessmentBodies.length > 256)
        throw new Error("v2_progress_evidence_bundle_invalid");
    const refs = [];
    const tupleKeys = new Set();
    for (const body of bundle.evidenceBodies) {
        if (!(0, evidence_1.validateLearningEvidenceBody)(body).ok || !sameAttempt(body.sourceAttempt, bundle.attemptRef))
            throw new Error("v2_progress_evidence_body_invalid");
        const tupleKey = (0, evidence_1.buildLearningEvidenceTupleKey)(body);
        if (tupleKeys.has(tupleKey))
            throw new Error("v2_progress_evidence_tuple_duplicate");
        tupleKeys.add(tupleKey);
        refs.push({ observationId: body.observationId, evidenceBodyHash: (0, decision_registry_1.hashCanonicalBody)(body), tupleKey: tupleKey, sourceAttempt: body.sourceAttempt });
    }
    for (const body of bundle.nonAssessmentBodies) {
        if (!(0, evidence_1.validateLearningNonAssessmentBody)(body).ok || !sameAttempt(body.sourceAttempt, bundle.attemptRef))
            throw new Error("v2_progress_non_assessment_body_invalid");
        const tupleKey = (0, evidence_1.buildLearningEvidenceTupleKey)(body);
        if (tupleKeys.has(tupleKey))
            throw new Error("v2_progress_evidence_tuple_duplicate");
        tupleKeys.add(tupleKey);
        refs.push({ nonAssessmentId: body.nonAssessmentId, nonAssessmentBodyHash: (0, decision_registry_1.hashCanonicalBody)(body), tupleKey: tupleKey, sourceAttempt: body.sourceAttempt });
    }
    return { attemptRef: bundle.attemptRef, refs, componentFingerprint: (0, decision_registry_1.hashCanonicalBody)({ attemptRef: bundle.attemptRef, refs }) };
};
exports.materializeProgressEvidenceBundle = materializeProgressEvidenceBundle;
