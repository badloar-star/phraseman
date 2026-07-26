"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adjudicateDelayedCandidate = void 0;
const delayed_receipts_1 = require("./delayed_receipts");
const delayed_probe_1 = require("./delayed_probe");
const nonEmpty = (value) => value.length > 0;
const makeSystemResolutions = (candidate, expectedTupleKeys) => {
    const resolved = (0, delayed_probe_1.resolveDelayedTerminal)(candidate, "system_failure", expectedTupleKeys);
    if (!resolved.ok)
        throw new Error("delayed_candidate_invalid");
    return resolved.resolutions.filter((resolution) => resolution.terminalDisposition !== "no_record");
};
const adjudicateDelayedCandidate = (context, decision) => {
    if (!nonEmpty(context.timingReceiptId) ||
        !nonEmpty(context.failureReceiptId) ||
        !nonEmpty(context.acceptedAtServer) ||
        !Number.isFinite(context.observedDelayMs) ||
        context.observedDelayMs < 0 ||
        !nonEmpty(context.windowPolicyId) ||
        !(0, delayed_probe_1.validateDelayedAttemptCandidate)(context.candidate, context.expectedTupleKeys).ok)
        throw new Error("delayed_runtime_context_invalid");
    const parsedAttemptRef = context.candidate.attemptRef;
    if (typeof parsedAttemptRef !== "object" || parsedAttemptRef === null)
        throw new Error("delayed_candidate_attempt_ref_missing");
    if (decision.kind === "timed") {
        const resolved = (0, delayed_probe_1.resolveDelayedTerminal)(context.candidate, decision.window, context.expectedTupleKeys);
        if (!resolved.ok)
            throw new Error("delayed_candidate_invalid");
        const body = {
            schemaVersion: "v2-delayed-probe-timing-receipt.v1",
            timingReceiptId: context.timingReceiptId,
            assignmentRef: context.assignmentRef,
            launchReceiptRef: context.launchReceiptRef,
            attemptRef: parsedAttemptRef,
            acceptedAtServer: context.acceptedAtServer,
            observedDelayMs: context.observedDelayMs,
            assessmentTiming: decision.window === "inside_pinned_window"
                ? "inside_pinned_window"
                : "outside_pinned_window",
            windowPolicyId: context.windowPolicyId,
            terminalTupleResolutions: resolved.resolutions.filter((resolution) => resolution.terminalDisposition !== "no_record"),
        };
        const ref = (0, delayed_receipts_1.buildTimingReceiptRef)(body);
        const materializedKeys = body.terminalTupleResolutions.map((resolution) => resolution.tupleKey);
        if (!(0, delayed_receipts_1.validateTimingReceipt)(body, ref, materializedKeys, body.attemptRef))
            throw new Error("delayed_timing_receipt_invalid");
        return { kind: "timing", body, ref };
    }
    const body = {
        schemaVersion: "v2-delayed-probe-failure-receipt.v1",
        failureReceiptId: context.failureReceiptId,
        attemptRef: parsedAttemptRef,
        probeRef: context.probeRef,
        claimedAssignmentRef: context.assignmentRef,
        claimedLaunchReceiptRef: context.launchReceiptRef,
        decision: decision.kind === "protocol_rejection"
            ? { kind: "protocol_rejection", reasonCode: decision.reasonCode }
            : {
                kind: "system_non_assessment",
                reasonCode: decision.reasonCode,
                terminalTupleResolutions: makeSystemResolutions(context.candidate, context.expectedTupleKeys),
            },
        rejectedAtServer: context.acceptedAtServer,
    };
    const ref = (0, delayed_receipts_1.buildFailureReceiptRef)(body);
    const nonSkippedKeys = decision.kind === "protocol_rejection"
        ? []
        : makeSystemResolutions(context.candidate, context.expectedTupleKeys).map((resolution) => resolution.tupleKey);
    if (!(0, delayed_receipts_1.validateFailureReceipt)(body, ref, nonSkippedKeys, body.attemptRef))
        throw new Error("delayed_failure_receipt_invalid");
    return { kind: "failure", body, ref };
};
exports.adjudicateDelayedCandidate = adjudicateDelayedCandidate;
//# sourceMappingURL=delayed_runtime.js.map