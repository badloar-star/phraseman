"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveDelayedTerminal = exports.validateDelayedAttemptCandidate = void 0;
const evidence_1 = require("./evidence");
const attempt_1 = require("./attempt");
const isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const exactKeys = (value, keys) => Object.keys(value).length === keys.length &&
    Object.keys(value).every((key) => keys.includes(key));
const isTupleKey = (value) => typeof value === "string" && /^letk1\.[A-Za-z0-9_-]+$/.test(value);
const isTerminalWindow = (value) => value === "inside_pinned_window" ||
    value === "outside_pinned_window" ||
    value === "system_failure";
const isAttemptRef = (value) => isRecord(value) &&
    exactKeys(value, ["schemaVersion", "opId", "attemptBodyHash"]) &&
    value.schemaVersion === "v2-attempt-ref.v1" &&
    typeof value.opId === "string" &&
    value.opId.length > 0 &&
    typeof value.attemptBodyHash === "string" &&
    /^[a-f0-9]{64}$/.test(value.attemptBodyHash);
const candidateDisposition = (body) => {
    if (body.candidateOutcome.resultCode === "SKIPPED")
        return "no_record";
    if (body.candidateOutcome.resultCode === "UNCERTAIN" ||
        body.candidateOutcome.resultCode === "INVALID_AUDIO_OR_SYSTEM")
        return "non_assessment_candidate";
    return "assessed_candidate";
};
const readCandidateBody = (candidate) => {
    if (!exactKeys(candidate, ["schemaVersion", "attemptBody", "attemptRef"]) ||
        candidate.schemaVersion !== "v2-delayed-attempt-candidate.v1" ||
        !isAttemptRef(candidate.attemptRef))
        return null;
    try {
        const body = (0, attempt_1.sanitizeAttemptBody)(candidate.attemptBody);
        if (body.attemptSurface.kind !== "scheduled_delayed_probe")
            return null;
        if (!(0, attempt_1.validateCanonicalAttemptRef)(body, candidate.attemptRef).ok)
            return null;
        return {
            body: body,
            ref: candidate.attemptRef,
        };
    }
    catch {
        return null;
    }
};
const validateDelayedAttemptCandidate = (candidate, expectedTupleKeys) => {
    const parsed = readCandidateBody(candidate);
    if (!parsed)
        return { ok: false };
    const seen = new Set();
    for (const entry of parsed.body.delayedCandidates) {
        const tupleKey = (0, evidence_1.buildLearningEvidenceTupleKey)(entry.binding);
        if (!isTupleKey(tupleKey) ||
            seen.has(tupleKey) ||
            entry.candidateEvidence.hintsUsed !== 0)
            return { ok: false };
        seen.add(tupleKey);
    }
    if (expectedTupleKeys &&
        (expectedTupleKeys.length !== seen.size ||
            expectedTupleKeys.some((key) => !seen.has(key))))
        return { ok: false };
    return { ok: true };
};
exports.validateDelayedAttemptCandidate = validateDelayedAttemptCandidate;
const resolveDisposition = (disposition, window) => {
    if (disposition === "no_record")
        return "no_record";
    if (window === "outside_pinned_window")
        return "not_assessed_for_window";
    if (window === "system_failure")
        return "not_assessed_system";
    return disposition === "assessed_candidate" ? "assessed" : "non_assessment";
};
const resolveDelayedTerminal = (candidate, window, expectedTupleKeys) => {
    const parsed = readCandidateBody(candidate);
    if (!isTerminalWindow(window) ||
        !parsed ||
        !(0, exports.validateDelayedAttemptCandidate)(candidate, expectedTupleKeys).ok)
        return { ok: false, resolutions: [] };
    const resolutions = parsed.body.delayedCandidates.map((entry) => {
        const sourceCandidateDisposition = candidateDisposition(entry);
        return {
            tupleKey: (0, evidence_1.buildLearningEvidenceTupleKey)(entry.binding),
            sourceCandidateDisposition,
            terminalDisposition: resolveDisposition(sourceCandidateDisposition, window),
        };
    });
    return { ok: true, resolutions };
};
exports.resolveDelayedTerminal = resolveDelayedTerminal;
