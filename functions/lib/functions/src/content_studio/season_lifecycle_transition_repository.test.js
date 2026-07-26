"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const season_lifecycle_transition_repository_1 = require("./season_lifecycle_transition_repository");
const ref = { draftId: "e-d", episodeId: "e1", revision: 1, revisionFingerprint: "a".repeat(64), contentHash: "b".repeat(64), ordinal: 1, chapterId: "c1", approvalStatus: "approved" };
const envelope = () => ({ body: { schemaVersion: "season-authoring-body.v1", episodeRevisionRefs: [ref] }, record: { schemaVersion: "season-authoring-record.v1", draftId: "s-d", seasonId: "s1", revision: 1, contentHash: "c".repeat(64), revisionFingerprint: "d".repeat(64), object: { objectPath: "p", contentHash: "c".repeat(64), objectGeneration: "1", byteSize: 1 }, provenance: {}, createdAt: "2026-07-17T00:00:00.000Z" }, lifecycle: { schemaVersion: "season-lifecycle.v1", draftId: "s-d", seasonId: "s1", revision: 1, revisionFingerprint: "d".repeat(64), status: "needs_review", changedBy: "author", changedAt: "2026-07-17T00:00:00.000Z", lifecycleRevision: 1 } });
function fakeStore() {
    const state = { lifecycle: envelope().lifecycle, writes: [], operations: new Map() };
    const store = { ...state, runTransaction: async (work) => work(store), readLifecycle: async () => store.lifecycle, compareAndSetLifecycle: async (_id, expected, next) => { if (store.lifecycle.lifecycleRevision !== expected)
            throw new Error("race"); store.lifecycle = next; }, writePinIndex: async (_id, entries) => store.writes.push(entries), clearPinIndex: async (_id) => store.writes.push(["cleared"]), clearPinIndexForSeason: async (seasonId, keep) => store.writes.push(["cleared-season", seasonId, keep]), writePinCleanupAudit: async (entry) => store.writes.push(entry), writeApprovalReceipt: async (receipt) => store.writes.push(receipt), readOperation: async (id) => store.operations.get(id), createOperation: async (id, value) => store.operations.set(id, value), readRevision: async () => envelope() };
    return store;
}
describe("Season lifecycle and pin-index transaction", () => {
    it("accepts only exact hashed operation envelopes", () => {
        expect((0, season_lifecycle_transition_repository_1.validateSeasonLifecycleOperationEnvelope)({ requestFingerprint: "a".repeat(64), lifecycle: envelope().lifecycle })).toBe(true);
        expect((0, season_lifecycle_transition_repository_1.validateSeasonLifecycleOperationEnvelope)({ requestFingerprint: "a".repeat(64), lifecycle: envelope().lifecycle, extra: true })).toBe(false);
        expect((0, season_lifecycle_transition_repository_1.validateSeasonLifecycleOperationEnvelope)({ requestFingerprint: "bad", lifecycle: envelope().lifecycle })).toBe(false);
    });
    it("writes approved pin entries in the same transition", async () => {
        const store = fakeStore();
        await expect(new season_lifecycle_transition_repository_1.SeasonLifecycleTransitionRepository(store, "reviewer").approve("s1", 1, "approved after review", "season-op-001")).resolves.toMatchObject({ status: "approved", lifecycleRevision: 2 });
        expect(store.writes).toContainEqual(expect.objectContaining({ schemaVersion: "season-approval-receipt.v1", reviewerId: "reviewer" }));
        expect(store.writes).toContainEqual(expect.arrayContaining([expect.objectContaining({ status: "approved" })]));
    });
    it("removes entries on archive", async () => {
        const store = fakeStore();
        store.lifecycle = { ...store.lifecycle, status: "approved", lifecycleRevision: 2 };
        store.readRevision = async () => ({ ...envelope(), lifecycle: store.lifecycle });
        await new season_lifecycle_transition_repository_1.SeasonLifecycleTransitionRepository(store, "reviewer").archive("s1", 2, "archived replacement", "season-op-002");
        expect(store.lifecycle.status).toBe("archived");
        expect(store.writes).toContainEqual(["cleared-season", "s1", undefined]);
    });
    it("rejects stale lifecycle revision", async () => {
        const store = fakeStore();
        await expect(new season_lifecycle_transition_repository_1.SeasonLifecycleTransitionRepository(store, "reviewer").approve("s1", 2, "approved after review", "season-op-003")).rejects.toThrow("season_lifecycle_stale");
    });
    it("rejects a canonical Season whose lifecycle identity diverges before any writes", async () => {
        const store = fakeStore();
        store.readRevision = async () => ({ ...envelope(), lifecycle: { ...envelope().lifecycle, revisionFingerprint: "e".repeat(64) } });
        await expect(new season_lifecycle_transition_repository_1.SeasonLifecycleTransitionRepository(store, "reviewer").approve("s1", 1, "approved after review", "season-op-005")).rejects.toThrow("season_lifecycle_identity_mismatch");
        expect(store.writes).toEqual([]);
    });
    it("replays an identical operation and rejects a reused key with changed input", async () => {
        const store = fakeStore();
        const repository = new season_lifecycle_transition_repository_1.SeasonLifecycleTransitionRepository(store, "reviewer");
        const first = await repository.approve("s1", 1, "approved after review", "season-op-004");
        await expect(repository.approve("s1", 1, "approved after review", "season-op-004")).resolves.toEqual(first);
        await expect(repository.approve("s1", 1, "different reason", "season-op-004")).rejects.toThrow("idempotency_key_reused");
    });
});
//# sourceMappingURL=season_lifecycle_transition_repository.test.js.map