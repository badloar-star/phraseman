"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateFailureReceipt = exports.validateTimingReceipt = exports.buildFailureReceiptRef = exports.buildTimingReceiptRef = void 0;
const decision_registry_1 = require("../policies/decision_registry");
const isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const isNonEmpty = (value) => typeof value === "string" && value.length > 0;
const isHash = (value) => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
const exactKeys = (value, keys) => Object.keys(value).length === keys.length &&
    Object.keys(value).every((key) => keys.includes(key));
const isRef = (value, keys) => isRecord(value) &&
    exactKeys(value, keys) &&
    isNonEmpty(value[keys[0]]) &&
    isHash(value[keys[1]]);
const isTupleKey = (value) => typeof value === "string" && /^letk1\.[A-Za-z0-9_-]+$/.test(value);
const validResolution = (value) => isRecord(value) &&
    exactKeys(value, [
        "tupleKey",
        "sourceCandidateDisposition",
        "terminalDisposition",
    ]) &&
    isTupleKey(value.tupleKey) &&
    (value.sourceCandidateDisposition === "assessed_candidate" ||
        value.sourceCandidateDisposition === "non_assessment_candidate") &&
    [
        "assessed",
        "non_assessment",
        "not_assessed_for_window",
        "not_assessed_system",
    ].includes(String(value.terminalDisposition));
const validResolutions = (values) => {
    if (!Array.isArray(values))
        return false;
    const keys = values.map((value) => isRecord(value) ? value.tupleKey : undefined);
    return values.every(validResolution) && new Set(keys).size === keys.length;
};
const validAttemptRef = (value) => isRecord(value) &&
    exactKeys(value, ["schemaVersion", "opId", "attemptBodyHash"]) &&
    value.schemaVersion === "v2-attempt-ref.v1" &&
    isNonEmpty(value.opId) &&
    isHash(value.attemptBodyHash);
const sameAttempt = (left, right) => left.schemaVersion === right.schemaVersion &&
    left.opId === right.opId &&
    left.attemptBodyHash === right.attemptBodyHash;
const validExpectedKeys = (keys) => keys.every((key) => isTupleKey(key)) && new Set(keys).size === keys.length;
const validResolutionSemantics = (resolution, mode) => mode === "inside"
    ? (resolution.sourceCandidateDisposition === "assessed_candidate" &&
        resolution.terminalDisposition === "assessed") ||
        (resolution.sourceCandidateDisposition === "non_assessment_candidate" &&
            resolution.terminalDisposition === "non_assessment")
    : mode === "outside"
        ? resolution.terminalDisposition === "not_assessed_for_window"
        : resolution.terminalDisposition === "not_assessed_system";
const buildTimingReceiptRef = (body) => ({
    timingReceiptId: body.timingReceiptId,
    contentHash: (0, decision_registry_1.hashCanonicalBody)(body),
});
exports.buildTimingReceiptRef = buildTimingReceiptRef;
const buildFailureReceiptRef = (body) => ({
    failureReceiptId: body.failureReceiptId,
    contentHash: (0, decision_registry_1.hashCanonicalBody)(body),
});
exports.buildFailureReceiptRef = buildFailureReceiptRef;
const validateTimingReceipt = (body, ref, candidateTupleKeys, candidateAttemptRef) => {
    const valid = isRecord(body) &&
        exactKeys(body, [
            "schemaVersion",
            "timingReceiptId",
            "assignmentRef",
            "launchReceiptRef",
            "attemptRef",
            "acceptedAtServer",
            "observedDelayMs",
            "assessmentTiming",
            "windowPolicyId",
            "terminalTupleResolutions",
        ]) &&
        body.schemaVersion === "v2-delayed-probe-timing-receipt.v1" &&
        isNonEmpty(body.timingReceiptId) &&
        isRef(body.assignmentRef, ["assignmentId", "contentHash"]) &&
        isRef(body.launchReceiptRef, ["launchId", "contentHash"]) &&
        validAttemptRef(body.attemptRef) &&
        isNonEmpty(body.acceptedAtServer) &&
        typeof body.observedDelayMs === "number" &&
        body.observedDelayMs >= 0 &&
        (body.assessmentTiming === "inside_pinned_window" ||
            body.assessmentTiming === "outside_pinned_window") &&
        isNonEmpty(body.windowPolicyId) &&
        validAttemptRef(candidateAttemptRef) &&
        sameAttempt(body.attemptRef, candidateAttemptRef) &&
        validExpectedKeys(candidateTupleKeys) &&
        validResolutions(body.terminalTupleResolutions) &&
        body.terminalTupleResolutions.every((resolution) => validResolutionSemantics(resolution, body.assessmentTiming === "inside_pinned_window" ? "inside" : "outside")) &&
        body.terminalTupleResolutions.length === candidateTupleKeys.length &&
        candidateTupleKeys.every((key) => body.terminalTupleResolutions.some((resolution) => resolution.tupleKey === key));
    return {
        ok: !!valid &&
            isRef(ref, ["timingReceiptId", "contentHash"]) &&
            ref.timingReceiptId === body.timingReceiptId &&
            ref.contentHash === (0, decision_registry_1.hashCanonicalBody)(body),
    };
};
exports.validateTimingReceipt = validateTimingReceipt;
const validateFailureReceipt = (body, ref, candidateTupleKeys, candidateAttemptRef) => {
    const decision = body.decision;
    const base = isRecord(body) &&
        exactKeys(body, [
            "schemaVersion",
            "failureReceiptId",
            "attemptRef",
            "probeRef",
            "claimedAssignmentRef",
            "claimedLaunchReceiptRef",
            "decision",
            "rejectedAtServer",
        ]) &&
        body.schemaVersion === "v2-delayed-probe-failure-receipt.v1" &&
        isNonEmpty(body.failureReceiptId) &&
        validAttemptRef(body.attemptRef) &&
        isRef(body.probeRef, ["probeId", "contentHash"]) &&
        isRef(body.claimedAssignmentRef, ["assignmentId", "contentHash"]) &&
        isRef(body.claimedLaunchReceiptRef, ["launchId", "contentHash"]) &&
        isNonEmpty(body.rejectedAtServer) &&
        validAttemptRef(candidateAttemptRef) &&
        sameAttempt(body.attemptRef, candidateAttemptRef) &&
        validExpectedKeys(candidateTupleKeys) &&
        isRecord(decision);
    const decisionOk = base && decision.kind === "protocol_rejection"
        ? exactKeys(decision, ["kind", "reasonCode"]) &&
            [
                "account_generation_mismatch",
                "probe_ref_mismatch",
                "activity_or_template_mismatch",
                "declaration_or_provenance_mismatch",
                "attempt_hash_mismatch",
            ].includes(String(decision.reasonCode))
        : base && decision.kind === "system_non_assessment"
            ? exactKeys(decision, [
                "kind",
                "reasonCode",
                "terminalTupleResolutions",
            ]) &&
                [
                    "assignment_missing",
                    "assignment_stale",
                    "launch_missing",
                    "launch_expired",
                    "server_timing_unavailable",
                ].includes(String(decision.reasonCode)) &&
                validResolutions(decision.terminalTupleResolutions) &&
                decision.terminalTupleResolutions.every((resolution) => validResolutionSemantics(resolution, "system")) &&
                decision.terminalTupleResolutions.length ===
                    candidateTupleKeys.length &&
                candidateTupleKeys.every((key) => decision.terminalTupleResolutions.some((resolution) => resolution.tupleKey === key))
            : false;
    return {
        ok: !!decisionOk &&
            isRef(ref, ["failureReceiptId", "contentHash"]) &&
            ref.failureReceiptId === body.failureReceiptId &&
            ref.contentHash === (0, decision_registry_1.hashCanonicalBody)(body),
    };
};
exports.validateFailureReceipt = validateFailureReceipt;
//# sourceMappingURL=delayed_receipts.js.map