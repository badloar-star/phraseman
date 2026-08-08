"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.finalizeDelayedCandidate = finalizeDelayedCandidate;
const delayed_runtime_1 = require("../../modules/learning-v2/contracts/delayed_runtime");
const decision_registry_1 = require("../../modules/learning-v2/policies/decision_registry");
const progress_event_1 = require("./learning_v2/progress_event");
const sameRef = (left, right) => (left.assignmentId ?? left.launchId) ===
    (right.assignmentId ?? right.launchId) &&
    left.contentHash === right.contentHash;
const sameProbe = (left, right) => left.probeId === right.probeId && left.contentHash === right.contentHash;
const operationKey = (input) => `learning-v2:delayed:${input.stableId}:${input.operationId}`;
const authLinkKey = (authUid) => `auth_links:${authUid}`;
const accountKey = (stableId) => `users:${stableId}`;
const tombstoneKey = (stableId) => `account_deletion_tombstones:${stableId}`;
const receiptKey = (stableId, receipt) => receipt.kind === "timing"
    ? `learning_v2_timing_receipts:${stableId}:${receipt.ref.timingReceiptId}`
    : `learning_v2_failure_receipts:${stableId}:${receipt.ref.failureReceiptId}`;
const terminalKey = (stableId, accountScopeHash, operationId) => `learning_v2_delayed_terminals:${stableId}:${accountScopeHash}__${operationId}`;
const terminalStatusFor = (receipt) => receipt.kind === "timing"
    ? "timed_finalized"
    : receipt.body.decision.kind === "system_non_assessment"
        ? "system_non_assessment_finalized"
        : "protocol_rejected";
const buildTerminalRecord = (input, receipt) => {
    const receiptHash = (0, decision_registry_1.hashCanonicalBody)(receipt);
    return {
        schemaVersion: "v2-delayed-probe-terminal.v1",
        mutationId: input.operationId,
        accountScopeHash: (0, progress_event_1.deriveProgressAccountScopeHash)(input.stableId, input.accountGeneration),
        accountGeneration: input.accountGeneration,
        receipt,
        receiptHash,
        terminalStatus: terminalStatusFor(receipt),
    };
};
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
        typeof input.authUid !== "string" ||
        input.authUid.trim().length === 0 ||
        input.authUid.length > 128 ||
        input.authUid.includes("/") ||
        input.stableId.length === 0 ||
        !Number.isSafeInteger(input.accountGeneration) ||
        input.accountGeneration < 1)
        throw new Error("delayed_operation_identity_invalid");
    return repository.runTransaction(async (transaction) => {
        const [authLinkDocument, accountDocument, tombstoneDocument] = await Promise.all([
            transaction.get(authLinkKey(input.authUid)),
            transaction.get(accountKey(input.stableId)),
            transaction.get(tombstoneKey(input.stableId)),
        ]);
        await repository.testHooks?.afterBindingReads?.();
        if (!authLinkDocument.exists) {
            throw new Error("delayed_identity_anchor_missing");
        }
        if (typeof authLinkDocument.data?.stable_id !== "string" ||
            authLinkDocument.data.stable_id.trim() !== input.stableId) {
            throw new Error("delayed_stable_identity_mismatch");
        }
        if (tombstoneDocument.exists) {
            throw new Error("delayed_account_delete_pending");
        }
        const liveGeneration = Number(accountDocument.data?.accountGeneration ??
            accountDocument.data?.generation);
        if (!accountDocument.exists ||
            !Number.isSafeInteger(liveGeneration) ||
            liveGeneration < 1 ||
            liveGeneration !== input.accountGeneration) {
            throw new Error("delayed_account_generation_mismatch");
        }
        const operationDocument = await transaction.get(operationKey(input));
        if (operationDocument.exists) {
            if (operationDocument.data?.fingerprint !== input.fingerprint)
                throw new Error("delayed_operation_replay_mismatch");
            const operation = operationDocument.data;
            if (!operation?.receipt ||
                operation.accountGeneration !== input.accountGeneration ||
                operation.receiptHash !== (0, decision_registry_1.hashCanonicalBody)(operation.receipt) ||
                operation.terminalStatus !== terminalStatusFor(operation.receipt))
                throw new Error("delayed_operation_record_invalid");
            const terminal = buildTerminalRecord(input, operation.receipt);
            if (terminal.receiptHash !== operation.receiptHash ||
                terminal.terminalStatus !== operation.terminalStatus)
                throw new Error("delayed_operation_record_invalid");
            const [receiptDocument, terminalDocument] = await Promise.all([
                transaction.get(receiptKey(input.stableId, operation.receipt)),
                transaction.get(terminalKey(input.stableId, terminal.accountScopeHash, input.operationId)),
            ]);
            if (receiptDocument.exists && (0, decision_registry_1.hashCanonicalBody)(receiptDocument.data) !== terminal.receiptHash) {
                throw new Error("delayed_receipt_replay_conflict");
            }
            if (terminalDocument.exists && (0, decision_registry_1.hashCanonicalBody)(terminalDocument.data) !== (0, decision_registry_1.hashCanonicalBody)(terminal)) {
                throw new Error("delayed_terminal_replay_conflict");
            }
            if (!receiptDocument.exists)
                transaction.create(receiptKey(input.stableId, operation.receipt), operation.receipt);
            if (!terminalDocument.exists)
                transaction.create(terminalKey(input.stableId, terminal.accountScopeHash, input.operationId), terminal);
            return { replayed: true, receipt: operation.receipt };
        }
        const assignmentDocument = await transaction.get(`learning_v2_assignments:${input.stableId}:${input.assignmentRef.assignmentId}`);
        const launchDocument = await transaction.get(`learning_v2_launches:${input.stableId}:${input.launchReceiptRef.launchId}`);
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
        const terminal = buildTerminalRecord(input, receipt);
        transaction.create(receiptKey(input.stableId, receipt), receipt);
        transaction.create(terminalKey(input.stableId, terminal.accountScopeHash, input.operationId), terminal);
        transaction.create(operationKey(input), {
            operationId: input.operationId,
            fingerprint: input.fingerprint,
            accountGeneration: input.accountGeneration,
            receiptHash: terminal.receiptHash,
            terminalStatus: terminal.terminalStatus,
            receipt,
        });
        return { replayed: false, receipt };
    });
}
//# sourceMappingURL=learning_v2_delayed_adapter.js.map