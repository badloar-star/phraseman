"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildV2AttemptEvent = exports.validateAttemptEventEnvelope = void 0;
/** Result is intentionally separate from attempt hash/materialization records. */
const attempt_1 = require("./attempt");
const isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const exactKeys = (value, keys) => Object.keys(value).length === keys.length &&
    Object.keys(value).every((key) => keys.includes(key));
const isHash = (value) => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
const isAttemptRef = (value) => isRecord(value) &&
    exactKeys(value, ["schemaVersion", "opId", "attemptBodyHash"]) &&
    value.schemaVersion === "v2-attempt-ref.v1" &&
    typeof value.opId === "string" &&
    value.opId.length > 0 &&
    isHash(value.attemptBodyHash);
const sameAttempt = (left, right) => isAttemptRef(left) &&
    left.schemaVersion === right.schemaVersion &&
    left.opId === right.opId &&
    left.attemptBodyHash === right.attemptBodyHash;
const isEvidenceRef = (value) => isRecord(value) &&
    exactKeys(value, [
        "observationId",
        "evidenceBodyHash",
        "tupleKey",
        "sourceAttempt",
    ]) &&
    typeof value.observationId === "string" &&
    value.observationId.length > 0 &&
    isHash(value.evidenceBodyHash) &&
    typeof value.tupleKey === "string" &&
    /^letk1\.[A-Za-z0-9_-]+$/.test(value.tupleKey) &&
    isAttemptRef(value.sourceAttempt);
const isNonAssessmentRef = (value) => isRecord(value) &&
    exactKeys(value, [
        "nonAssessmentId",
        "nonAssessmentBodyHash",
        "tupleKey",
        "sourceAttempt",
    ]) &&
    typeof value.nonAssessmentId === "string" &&
    value.nonAssessmentId.length > 0 &&
    isHash(value.nonAssessmentBodyHash) &&
    typeof value.tupleKey === "string" &&
    /^letk1\.[A-Za-z0-9_-]+$/.test(value.tupleKey) &&
    isAttemptRef(value.sourceAttempt);
const isBasis = (value) => {
    if (!isRecord(value))
        return false;
    if (value.kind === "graph_attempt_body")
        return isAttemptRef(value.sourceAttempt);
    return ((value.kind === "delayed_timing_receipt" &&
        typeof value.timingReceiptRef === "string" &&
        value.timingReceiptRef.length > 0) ||
        (value.kind === "delayed_system_failure_receipt" &&
            typeof value.failureReceiptRef === "string" &&
            value.failureReceiptRef.length > 0));
};
const validateAttemptEventEnvelope = (event) => {
    if (typeof event !== "object" || event === null)
        return { ok: false };
    const candidate = event;
    if (!isRecord(event) ||
        !Object.keys(event).every((key) => [
            "schemaVersion",
            "attemptBody",
            "attemptRef",
            "learningEvidenceRefs",
            "learningNonAssessmentRefs",
            "materializationBasis",
        ].includes(key)) ||
        candidate.schemaVersion !== "v2-attempt-envelope.v1" ||
        !Array.isArray(candidate.learningEvidenceRefs) ||
        !Array.isArray(candidate.learningNonAssessmentRefs) ||
        !isBasis(candidate.materializationBasis) ||
        !isAttemptRef(candidate.attemptRef) ||
        candidate.learningEvidenceRefs.some((ref) => !isEvidenceRef(ref)) ||
        candidate.learningNonAssessmentRefs.some((ref) => !isNonAssessmentRef(ref))) {
        return { ok: false };
    }
    const graph = isRecord(candidate.attemptBody) &&
        isRecord(candidate.attemptBody.attemptSurface) &&
        candidate.attemptBody.attemptSurface.kind === "episode_graph_node";
    if ((graph && candidate.materializationBasis.kind !== "graph_attempt_body") ||
        (!graph && candidate.materializationBasis.kind === "graph_attempt_body") ||
        (candidate.materializationBasis.kind === "graph_attempt_body" &&
            !sameAttempt(candidate.materializationBasis.sourceAttempt, candidate.attemptRef)))
        return { ok: false };
    const refs = [
        ...candidate.learningEvidenceRefs,
        ...candidate.learningNonAssessmentRefs,
    ];
    if (refs.some((ref) => !sameAttempt(ref.sourceAttempt, candidate.attemptRef)) ||
        new Set(refs.map((ref) => ref.tupleKey)).size !== refs.length)
        return { ok: false };
    return (0, attempt_1.validateCanonicalAttemptRef)(candidate.attemptBody, candidate.attemptRef);
};
exports.validateAttemptEventEnvelope = validateAttemptEventEnvelope;
const buildV2AttemptEvent = (input) => {
    if (!(0, attempt_1.validateCanonicalAttemptRef)(input.attemptBody, input.canonicalAttemptRef)
        .ok) {
        throw new Error("attempt_event_canonical_ref_mismatch");
    }
    if (input.learningEvidenceRefs.some((ref) => !isEvidenceRef(ref)) ||
        input.learningNonAssessmentRefs.some((ref) => !isNonAssessmentRef(ref)) ||
        !isBasis(input.materializationBasis))
        throw new Error("attempt_event_materialization_ref_invalid");
    const graph = input.attemptBody.attemptSurface.kind === "episode_graph_node";
    if ((graph && input.materializationBasis.kind !== "graph_attempt_body") ||
        (!graph && input.materializationBasis.kind === "graph_attempt_body") ||
        (input.materializationBasis.kind === "graph_attempt_body" &&
            (input.materializationBasis.sourceAttempt.opId !==
                input.canonicalAttemptRef.opId ||
                input.materializationBasis.sourceAttempt.attemptBodyHash !==
                    input.canonicalAttemptRef.attemptBodyHash))) {
        throw new Error("attempt_event_materialization_basis_mismatch");
    }
    const refs = [
        ...input.learningEvidenceRefs,
        ...input.learningNonAssessmentRefs,
    ];
    if (refs.some((ref) => ref.sourceAttempt.schemaVersion !==
        input.canonicalAttemptRef.schemaVersion ||
        ref.sourceAttempt.opId !== input.canonicalAttemptRef.opId ||
        ref.sourceAttempt.attemptBodyHash !==
            input.canonicalAttemptRef.attemptBodyHash ||
        !/^letk1\./.test(ref.tupleKey) ||
        ("evidenceBodyHash" in ref
            ? !/^[a-f0-9]{64}$/.test(ref.evidenceBodyHash)
            : !/^[a-f0-9]{64}$/.test(ref.nonAssessmentBodyHash))) ||
        new Set(refs.map((ref) => ref.tupleKey)).size !== refs.length) {
        throw new Error("attempt_event_materialization_ref_invalid");
    }
    return Object.freeze({
        schemaVersion: "v2-attempt-envelope.v1",
        attemptBody: input.attemptBody,
        attemptRef: input.canonicalAttemptRef,
        learningEvidenceRefs: Object.freeze([...input.learningEvidenceRefs]),
        learningNonAssessmentRefs: Object.freeze([
            ...input.learningNonAssessmentRefs,
        ]),
        materializationBasis: input.materializationBasis,
    });
};
exports.buildV2AttemptEvent = buildV2AttemptEvent;
//# sourceMappingURL=activity_result.js.map