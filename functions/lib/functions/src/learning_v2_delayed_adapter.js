"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.finalizeDelayedCandidate = finalizeDelayedCandidate;
const delayed_runtime_1 = require("../../modules/learning-v2/contracts/delayed_runtime");
const sameRef = (left, right) => (left.assignmentId ?? left.launchId) ===
    (right.assignmentId ?? right.launchId) &&
    left.contentHash === right.contentHash;
const sameProbe = (left, right) => left.probeId === right.probeId && left.contentHash === right.contentHash;
const operationKey = (input) => `learning-v2:delayed:${input.stableId}:${input.operationId}`;
const receiptKey = (receipt) => receipt.kind === "timing"
    ? `learning_v2_timing_receipts:${receipt.ref.timingReceiptId}`
    : `learning_v2_failure_receipts:${receipt.ref.failureReceiptId}`;
const deriveWindowDecision = (assignment, launch, nowMs) => {
    if (assignment.status === "stale")
        return { kind: "system_failure", reasonCode: "assignment_stale" };
    if (launch.expiresAtMs !== undefined && nowMs >= launch.expiresAtMs)
        return { kind: "system_failure", reasonCode: "launch_expired" };
    if (assignment.assessableWindowOpensAtMs === undefined ||
        assignment.assessableWindowClosesAtMs === undefined)
        return { kind: "system_failure", reasonCode: "server_timing_unavailable" };
    return {
        kind: "timed",
        window: nowMs >= assignment.assessableWindowOpensAtMs &&
            nowMs <= assignment.assessableWindowClosesAtMs
            ? "inside_pinned_window"
            : "outside_pinned_window",
    };
};
async function finalizeDelayedCandidate(repository, input) {
    if (!/^[A-Za-z0-9._-]{1,160}$/.test(input.operationId) ||
        !/^[a-f0-9]{64}$/.test(input.fingerprint) ||
        input.stableId.length === 0 ||
        !Number.isSafeInteger(input.accountGeneration) ||
        input.accountGeneration < 1)
        throw new Error("delayed_operation_identity_invalid");
    return repository.runTransaction(async (transaction) => {
        const operationDocument = await transaction.get(operationKey(input));
        if (operationDocument.exists) {
            if (operationDocument.data?.fingerprint !== input.fingerprint)
                throw new Error("delayed_operation_replay_mismatch");
            if (!operationDocument.data?.receipt)
                throw new Error("delayed_operation_record_invalid");
            return { replayed: true, receipt: operationDocument.data.receipt };
        }
        const assignmentDocument = await transaction.get(`learning_v2_assignments:${input.assignmentRef.assignmentId}`);
        const launchDocument = await transaction.get(`learning_v2_launches:${input.launchReceiptRef.launchId}`);
        let decision = input.serverDecision;
        const assignment = assignmentDocument.data;
        const launch = launchDocument.data;
        if (!assignmentDocument.exists || !assignment) {
            throw new Error("delayed_assignment_binding_unavailable");
        }
        else if (!launchDocument.exists || !launch) {
            decision = { kind: "system_failure", reasonCode: "launch_missing" };
        }
        else if (assignment.stableId !== input.stableId ||
            assignment.accountGeneration !== input.accountGeneration ||
            !sameRef(assignment.ref, input.assignmentRef) ||
            !sameProbe(assignment.probeRef, input.probeRef) ||
            launch.stableId !== input.stableId ||
            launch.accountGeneration !== input.accountGeneration ||
            !sameRef(launch.ref, input.launchReceiptRef) ||
            !sameProbe(launch.probeRef, input.probeRef)) {
            decision = {
                kind: "protocol_rejection",
                reasonCode: "declaration_or_provenance_mismatch",
            };
        }
        else if (input.nowMs !== undefined) {
            decision = deriveWindowDecision(assignment, launch, input.nowMs);
        }
        const expectedTupleKeys = assignment?.expectedTupleKeys ?? input.expectedTupleKeys;
        const receipt = (0, delayed_runtime_1.adjudicateDelayedCandidate)({
            candidate: input.candidate,
            expectedTupleKeys,
            assignmentRef: input.assignmentRef,
            launchReceiptRef: input.launchReceiptRef,
            probeRef: input.probeRef,
            timingReceiptId: input.timingReceiptId,
            failureReceiptId: input.failureReceiptId,
            acceptedAtServer: input.acceptedAtServer,
            observedDelayMs: input.observedDelayMs,
            windowPolicyId: input.windowPolicyId,
        }, decision);
        transaction.create(receiptKey(receipt), receipt);
        transaction.create(operationKey(input), {
            operationId: input.operationId,
            fingerprint: input.fingerprint,
            receipt,
        });
        return { replayed: false, receipt };
    });
}
//# sourceMappingURL=learning_v2_delayed_adapter.js.map