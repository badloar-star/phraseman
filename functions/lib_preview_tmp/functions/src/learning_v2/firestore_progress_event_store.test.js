"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const attempt_1 = require("../../../modules/learning-v2/contracts/attempt");
const evidence_1 = require("../../../modules/learning-v2/contracts/evidence");
const delayed_receipts_1 = require("../../../modules/learning-v2/contracts/delayed_receipts");
const decision_registry_1 = require("../../../modules/learning-v2/policies/decision_registry");
const progress_event_1 = require("./progress_event");
const firestore_progress_event_store_1 = require("./firestore_progress_event_store");
const delayed_probe_ingestion_1 = require("./delayed_probe_ingestion");
const createFakeFirestore = (documents) => {
    const reads = [];
    const transaction = {
        get: jest.fn(async (ref) => {
            reads.push(ref.path);
            const document = documents[ref.path] ?? { exists: false };
            return {
                exists: document.exists,
                data: () => document.data,
            };
        }),
        create: jest.fn(),
        set: jest.fn(),
    };
    const db = {
        doc: (path) => ({ path }),
        runTransaction: async (work) => work(transaction),
    };
    return { db: db, reads, transaction };
};
const bindingOptions = (db) => ({
    db,
    authUid: "auth-a",
    stableUid: "account-a",
    accountGeneration: 3,
    accountScopeHash: (0, progress_event_1.deriveProgressAccountScopeHash)("account-a", 3),
});
const liveBindingDocuments = () => ({
    "auth_links/auth-a": { exists: true, data: { stable_id: "account-a" } },
    "users/account-a": { exists: true, data: { accountGeneration: 3 } },
    "account_deletion_tombstones/account-a": { exists: false },
});
const delayedBinding = { nodeId: "n1", objectiveId: "o1", skillId: "s1", construct: "semantic", phase: "delayed_probe", targetKind: "objective", targetId: "o1" };
const buildDelayedBody = (opId = "delayed-store-attempt") => (0, attempt_1.sanitizeAttemptBody)({ schemaVersion: "v2-attempt-body.v1", opId, attemptSurface: { kind: "scheduled_delayed_probe" }, outcome: { resultCode: "CORRECT" }, evidence: { hintsUsed: 0 }, provenance: { phase: "delayed_probe" }, inputBinding: { source: "keyboard" }, delayedCandidates: [{ candidateId: "c1", binding: delayedBinding, candidateOutcome: { resultCode: "CORRECT" }, candidateEvidence: { hintsUsed: 0 } }] });
const delayedMutationId = "delayed-store-terminal";
const makeTerminal = async (attemptBody = buildDelayedBody(), mutationId = delayedMutationId) => {
    const attemptRef = (0, attempt_1.buildCanonicalAttemptRef)(attemptBody);
    const candidate = { schemaVersion: "v2-delayed-attempt-candidate.v1", attemptBody, attemptRef };
    const records = new Map();
    const result = await (0, delayed_probe_ingestion_1.ingestDelayedProbeTerminal)({ read: async (id) => records.get(id), create: async (record) => { records.set(record.mutationId, record); } }, {
        stableUid: "account-a",
        accountGeneration: 3,
        accountScopeHash: (0, progress_event_1.deriveProgressAccountScopeHash)("account-a", 3),
        mutationId,
        candidate,
        context: { candidate, expectedTupleKeys: [(0, evidence_1.buildLearningEvidenceTupleKey)(delayedBinding)], assignmentRef: { assignmentId: "a1", contentHash: "a".repeat(64) }, launchReceiptRef: { launchId: "l1", contentHash: "b".repeat(64) }, probeRef: { probeId: "p1", contentHash: "c".repeat(64) }, timingReceiptId: `timing-${mutationId}`, failureReceiptId: `failure-${mutationId}`, acceptedAtServer: "2026-07-17T00:00:00.000Z", observedDelayMs: 20, windowPolicyId: "w1" },
    }, { resolveDecision: () => ({ kind: "timed", window: "inside_pinned_window" }) });
    return result.record;
};
const delayedStoreRequest = (attemptBody = buildDelayedBody(), mutationId = delayedMutationId) => ({
    accountScopeHash: (0, progress_event_1.deriveProgressAccountScopeHash)("account-a", 3),
    attemptBody,
    attemptRef: (0, attempt_1.buildCanonicalAttemptRef)(attemptBody),
    terminalRef: { schemaVersion: "v2-delayed-terminal-ref.v1", mutationId },
});
describe("Firestore progress-event store boundary", () => {
    it("fails closed when mutation methods are called outside a transaction", async () => {
        const db = { runTransaction: jest.fn() };
        const store = (0, firestore_progress_event_store_1.createFirestoreProgressEventStore)(bindingOptions(db));
        await expect(store.validatePinnedScope({})).rejects.toThrow("progress_transaction_required");
        await expect(store.reconcileReplay({}, { refs: [], componentFingerprint: "a".repeat(64) }, {})).rejects.toThrow("progress_transaction_required");
        await expect(store.prepareTransactionPlan({}, { refs: [], componentFingerprint: "a".repeat(64) }, {})).rejects.toThrow("progress_transaction_required");
        await expect(store.writeEvidenceMaterialization({}, { refs: [], componentFingerprint: "a".repeat(64) })).rejects.toThrow("progress_transaction_required");
        await expect(store.writeProgressProjection({}, {})).rejects.toThrow("progress_transaction_required");
        await expect(store.readOperation("op-0001")).rejects.toThrow("progress_transaction_required");
        await expect(store.createOperation("op-0001", {})).rejects.toThrow("progress_transaction_required");
        await expect(store.readAttempt("a".repeat(64), "attempt-1")).rejects.toThrow("progress_transaction_required");
        await expect(store.writeAttempt("a".repeat(64), "attempt-1", {})).rejects.toThrow("progress_transaction_required");
        await expect(store.resolveDelayedEvidence(delayedStoreRequest())).rejects.toThrow("progress_transaction_required");
    });
    it("rejects a missing live auth anchor before transaction work begins", async () => {
        const fake = createFakeFirestore({
            ...liveBindingDocuments(),
            "auth_links/auth-a": { exists: false },
        });
        const work = jest.fn(async () => "replay");
        await expect((0, firestore_progress_event_store_1.createFirestoreProgressEventStore)(bindingOptions(fake.db)).runTransaction(work))
            .rejects.toThrow("progress_identity_anchor_missing");
        expect(work).not.toHaveBeenCalled();
    });
    it("rejects a changed live auth anchor before transaction work begins", async () => {
        const fake = createFakeFirestore({
            ...liveBindingDocuments(),
            "auth_links/auth-a": { exists: true, data: { stable_id: "account-b" } },
        });
        const work = jest.fn(async () => "replay");
        await expect((0, firestore_progress_event_store_1.createFirestoreProgressEventStore)(bindingOptions(fake.db)).runTransaction(work))
            .rejects.toThrow("stable_id_mismatch");
        expect(work).not.toHaveBeenCalled();
    });
    it("rejects a live account-generation mismatch before transaction work begins", async () => {
        const fake = createFakeFirestore({
            ...liveBindingDocuments(),
            "users/account-a": { exists: true, data: { accountGeneration: 4 } },
        });
        const work = jest.fn(async () => "replay");
        await expect((0, firestore_progress_event_store_1.createFirestoreProgressEventStore)(bindingOptions(fake.db)).runTransaction(work))
            .rejects.toThrow("account_generation_mismatch");
        expect(work).not.toHaveBeenCalled();
    });
    it("recomputes and rejects a stale account scope before transaction work begins", async () => {
        const fake = createFakeFirestore(liveBindingDocuments());
        const work = jest.fn(async () => "replay");
        const options = {
            ...bindingOptions(fake.db),
            accountScopeHash: (0, progress_event_1.deriveProgressAccountScopeHash)("account-a", 2),
        };
        await expect((0, firestore_progress_event_store_1.createFirestoreProgressEventStore)(options).runTransaction(work))
            .rejects.toThrow("account_generation_mismatch");
        expect(work).not.toHaveBeenCalled();
    });
    it("rejects a deletion tombstone before transaction work begins", async () => {
        const fake = createFakeFirestore({
            ...liveBindingDocuments(),
            "account_deletion_tombstones/account-a": { exists: true, data: { status: "pending" } },
        });
        const work = jest.fn(async () => "replay");
        await expect((0, firestore_progress_event_store_1.createFirestoreProgressEventStore)(bindingOptions(fake.db)).runTransaction(work))
            .rejects.toThrow("account_delete_pending");
        expect(work).not.toHaveBeenCalled();
    });
    it("blocks an existing replay after account deletion", async () => {
        const fake = createFakeFirestore({
            ...liveBindingDocuments(),
            "account_deletion_tombstones/account-a": { exists: true, data: { status: "complete" } },
            [`users/account-a/v2_progress_ops/${(0, firestore_progress_event_store_1.progressOperationDocumentId)((0, progress_event_1.deriveProgressAccountScopeHash)("account-a", 3), "season-1-r1", "event-0001")}`]: { exists: true, data: { result: "stale" } },
        });
        const work = jest.fn(async (tx) => tx.readOperation("event-0001", "season-1-r1"));
        await expect((0, firestore_progress_event_store_1.createFirestoreProgressEventStore)(bindingOptions(fake.db)).runTransaction(work))
            .rejects.toThrow("account_delete_pending");
        expect(work).not.toHaveBeenCalled();
        expect(fake.reads).toEqual([
            "auth_links/auth-a",
            "users/account-a",
            "account_deletion_tombstones/account-a",
        ]);
    });
    it("allows replay lookup only after the complete live binding is validated", async () => {
        const operation = { schemaVersion: "v2-progress-event-operation.v1", result: { accepted: true } };
        const operationPath = `users/account-a/v2_progress_ops/${(0, firestore_progress_event_store_1.progressOperationDocumentId)((0, progress_event_1.deriveProgressAccountScopeHash)("account-a", 3), "season-1-r1", "event-0001")}`;
        const fake = createFakeFirestore({
            ...liveBindingDocuments(),
            [operationPath]: { exists: true, data: operation },
        });
        const store = (0, firestore_progress_event_store_1.createFirestoreProgressEventStore)(bindingOptions(fake.db));
        await store.runTransaction(async (tx) => {
            await tx.readOperation("event-0001", "season-1-r1");
        });
        expect(fake.reads.slice(0, 3)).toEqual([
            "auth_links/auth-a",
            "users/account-a",
            "account_deletion_tombstones/account-a",
        ]);
        expect(fake.reads).toHaveLength(4);
        expect(fake.reads[3]).toBe(operationPath);
    });
    it("accepts the legacy server generation field when the complete binding is current", async () => {
        const fake = createFakeFirestore({
            ...liveBindingDocuments(),
            "users/account-a": { exists: true, data: { generation: 3 } },
        });
        const work = jest.fn(async () => "valid-binding");
        await expect((0, firestore_progress_event_store_1.createFirestoreProgressEventStore)(bindingOptions(fake.db)).runTransaction(work))
            .resolves.toBe("valid-binding");
        expect(work).toHaveBeenCalledTimes(1);
    });
    it("reads and validates the trusted delayed terminal after the live identity barrier", async () => {
        const terminal = await makeTerminal();
        const terminalPath = `users/account-a/v2_delayed_attempts/${bindingOptions({}).accountScopeHash}__${delayedMutationId}`;
        const fake = createFakeFirestore({ ...liveBindingDocuments(), [terminalPath]: { exists: true, data: terminal } });
        const bundle = await (0, firestore_progress_event_store_1.createFirestoreProgressEventStore)(bindingOptions(fake.db)).runTransaction(async (tx) => tx.resolveDelayedEvidence(delayedStoreRequest()));
        expect(bundle).toMatchObject({ schemaVersion: "v2-progress-evidence-bundle.v1", attemptRef: delayedStoreRequest().attemptRef });
        expect(bundle.evidenceBodies).toHaveLength(1);
        expect(fake.reads).toEqual(["auth_links/auth-a", "users/account-a", "account_deletion_tombstones/account-a", terminalPath]);
    });
    it("fails closed when the referenced delayed terminal is missing", async () => {
        const fake = createFakeFirestore(liveBindingDocuments());
        await expect((0, firestore_progress_event_store_1.createFirestoreProgressEventStore)(bindingOptions(fake.db)).runTransaction(async (tx) => tx.resolveDelayedEvidence(delayedStoreRequest()))).rejects.toThrow("delayed_terminal_missing");
    });
    it.each([
        ["foreign account scope", (record) => ({ ...record, accountScopeHash: "f".repeat(64) }), "delayed_terminal_account_mismatch"],
        ["foreign account generation", (record) => ({ ...record, accountGeneration: 4 }), "delayed_terminal_account_mismatch"],
        ["mutation substitution", (record) => ({ ...record, mutationId: "different-mutation-id" }), "delayed_terminal_mutation_mismatch"],
        ["tampered receipt hash", (record) => ({ ...record, receiptHash: "f".repeat(64) }), "delayed_terminal_record_invalid"],
        ["invalid terminal status", (record) => ({ ...record, terminalStatus: "pending" }), "delayed_terminal_record_invalid"],
    ])("rejects %s in the trusted delayed terminal", async (_label, mutate, expectedError) => {
        const terminal = await makeTerminal();
        const terminalPath = `users/account-a/v2_delayed_attempts/${bindingOptions({}).accountScopeHash}__${delayedMutationId}`;
        const fake = createFakeFirestore({ ...liveBindingDocuments(), [terminalPath]: { exists: true, data: mutate(terminal) } });
        await expect((0, firestore_progress_event_store_1.createFirestoreProgressEventStore)(bindingOptions(fake.db)).runTransaction(async (tx) => tx.resolveDelayedEvidence(delayedStoreRequest()))).rejects.toThrow(expectedError);
    });
    it("rejects a valid terminal receipt replaced with a different attempt", async () => {
        const replacement = await makeTerminal(buildDelayedBody("delayed-store-replacement"));
        const terminalPath = `users/account-a/v2_delayed_attempts/${bindingOptions({}).accountScopeHash}__${delayedMutationId}`;
        const fake = createFakeFirestore({ ...liveBindingDocuments(), [terminalPath]: { exists: true, data: replacement } });
        await expect((0, firestore_progress_event_store_1.createFirestoreProgressEventStore)(bindingOptions(fake.db)).runTransaction(async (tx) => tx.resolveDelayedEvidence(delayedStoreRequest()))).rejects.toThrow("delayed_terminal_attempt_mismatch");
    });
    it("rejects a self-consistent receipt whose terminal evidence was re-derived differently", async () => {
        const terminal = await makeTerminal();
        if (terminal.receipt.kind !== "timing")
            throw new Error("expected_timing_terminal");
        const terminalTupleResolutions = terminal.receipt.body.terminalTupleResolutions.map((resolution) => ({
            ...resolution,
            sourceCandidateDisposition: "non_assessment_candidate",
            terminalDisposition: "non_assessment",
        }));
        const body = { ...terminal.receipt.body, terminalTupleResolutions };
        const receipt = { kind: "timing", body, ref: (0, delayed_receipts_1.buildTimingReceiptRef)(body) };
        const tampered = { ...terminal, receipt, receiptHash: (0, decision_registry_1.hashCanonicalBody)(receipt) };
        const terminalPath = `users/account-a/v2_delayed_attempts/${bindingOptions({}).accountScopeHash}__${delayedMutationId}`;
        const fake = createFakeFirestore({ ...liveBindingDocuments(), [terminalPath]: { exists: true, data: tampered } });
        await expect((0, firestore_progress_event_store_1.createFirestoreProgressEventStore)(bindingOptions(fake.db)).runTransaction(async (tx) => tx.resolveDelayedEvidence(delayedStoreRequest()))).rejects.toThrow("delayed_terminal_evidence_mismatch");
    });
});
//# sourceMappingURL=firestore_progress_event_store.test.js.map