"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const progress_event_1 = require("./progress_event");
const firestore_progress_event_store_1 = require("./firestore_progress_event_store");
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
describe("Firestore progress-event store boundary", () => {
    it("fails closed when mutation methods are called outside a transaction", async () => {
        const db = { runTransaction: jest.fn() };
        const store = (0, firestore_progress_event_store_1.createFirestoreProgressEventStore)(bindingOptions(db));
        await expect(store.validatePinnedScope({})).rejects.toThrow("progress_transaction_required");
        await expect(store.prepareTransactionPlan({}, { refs: [], componentFingerprint: "a".repeat(64) }, {})).rejects.toThrow("progress_transaction_required");
        await expect(store.writeEvidenceMaterialization({}, { refs: [], componentFingerprint: "a".repeat(64) })).rejects.toThrow("progress_transaction_required");
        await expect(store.writeProgressProjection({}, {})).rejects.toThrow("progress_transaction_required");
        await expect(store.readOperation("op-0001")).rejects.toThrow("progress_transaction_required");
        await expect(store.createOperation("op-0001", {})).rejects.toThrow("progress_transaction_required");
        await expect(store.readAttempt("a".repeat(64), "attempt-1")).rejects.toThrow("progress_transaction_required");
        await expect(store.writeAttempt("a".repeat(64), "attempt-1", "b".repeat(64))).rejects.toThrow("progress_transaction_required");
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
            "learning_v2_progress_operations/unused": { exists: true, data: { result: "stale" } },
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
        const fake = createFakeFirestore({
            ...liveBindingDocuments(),
            "learning_v2_progress_operations/unused": { exists: true, data: operation },
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
});
//# sourceMappingURL=firestore_progress_event_store.test.js.map