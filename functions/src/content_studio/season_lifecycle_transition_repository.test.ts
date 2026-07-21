import { SeasonLifecycleTransitionRepository, type SeasonLifecycleTransitionStore, validateSeasonLifecycleOperationEnvelope } from "./season_lifecycle_transition_repository";
import type { SeasonRevisionEnvelope } from "../../../modules/learning-v2/authoring/season_revision";

const ref = { draftId: "e-d", episodeId: "e1", revision: 1, revisionFingerprint: "a".repeat(64), contentHash: "b".repeat(64), ordinal: 1, chapterId: "c1", approvalStatus: "approved" as const };
const envelope = (): SeasonRevisionEnvelope => ({ body: { schemaVersion: "season-authoring-body.v1", episodeRevisionRefs: [ref] }, record: { schemaVersion: "season-authoring-record.v1", draftId: "s-d", seasonId: "s1", revision: 1, contentHash: "c".repeat(64), revisionFingerprint: "d".repeat(64), object: { objectPath: "p", contentHash: "c".repeat(64), objectGeneration: "1", byteSize: 1 }, provenance: {}, createdAt: "2026-07-17T00:00:00.000Z" }, lifecycle: { schemaVersion: "season-lifecycle.v1", draftId: "s-d", seasonId: "s1", revision: 1, revisionFingerprint: "d".repeat(64), status: "needs_review", changedBy: "author", changedAt: "2026-07-17T00:00:00.000Z", lifecycleRevision: 1 } });

function fakeStore(): SeasonLifecycleTransitionStore & { lifecycle: any; writes: any[] } {
  const state: any = { lifecycle: envelope().lifecycle, writes: [], operations: new Map() };
  const store: any = { ...state, runTransaction: async (work: any) => work(store), readLifecycle: async () => store.lifecycle, compareAndSetLifecycle: async (_id: string, expected: number, next: any) => { if (store.lifecycle.lifecycleRevision !== expected) throw new Error("race"); store.lifecycle = next; }, writePinIndex: async (_id: string, entries: any[]) => store.writes.push(entries), clearPinIndex: async (_id: string) => store.writes.push(["cleared"]), clearPinIndexForSeason: async (seasonId: string, keep?: string) => store.writes.push(["cleared-season", seasonId, keep]), writePinCleanupAudit: async (entry: any) => store.writes.push(entry), writeApprovalReceipt: async (receipt: any) => store.writes.push(receipt), readOperation: async (id: string) => store.operations.get(id), createOperation: async (id: string, value: any) => store.operations.set(id, value), readRevision: async () => envelope() };
  return store;
}

describe("Season lifecycle and pin-index transaction", () => {
  it("accepts only exact hashed operation envelopes", () => {
    expect(validateSeasonLifecycleOperationEnvelope({ requestFingerprint: "a".repeat(64), lifecycle: envelope().lifecycle })).toBe(true);
    expect(validateSeasonLifecycleOperationEnvelope({ requestFingerprint: "a".repeat(64), lifecycle: envelope().lifecycle, extra: true })).toBe(false);
    expect(validateSeasonLifecycleOperationEnvelope({ requestFingerprint: "bad", lifecycle: envelope().lifecycle })).toBe(false);
  });
  it("writes approved pin entries in the same transition", async () => {
    const store = fakeStore();
    await expect(new SeasonLifecycleTransitionRepository(store, "reviewer").approve("s1", 1, "approved after review", "season-op-001")).resolves.toMatchObject({ status: "approved", lifecycleRevision: 2 });
    expect(store.writes).toContainEqual(expect.objectContaining({ schemaVersion: "season-approval-receipt.v1", reviewerId: "reviewer" })); expect(store.writes).toContainEqual(expect.arrayContaining([expect.objectContaining({ status: "approved" })]));
  });
  it("removes entries on archive", async () => {
    const store = fakeStore(); store.lifecycle = { ...store.lifecycle, status: "approved", lifecycleRevision: 2 }; store.readRevision = async () => ({ ...envelope(), lifecycle: store.lifecycle });
    await new SeasonLifecycleTransitionRepository(store, "reviewer").archive("s1", 2, "archived replacement", "season-op-002");
    expect(store.lifecycle.status).toBe("archived"); expect(store.writes).toContainEqual(["cleared-season", "s1", undefined]);
  });
  it("rejects stale lifecycle revision", async () => {
    const store = fakeStore(); await expect(new SeasonLifecycleTransitionRepository(store, "reviewer").approve("s1", 2, "approved after review", "season-op-003")).rejects.toThrow("season_lifecycle_stale");
  });
  it("rejects a canonical Season whose lifecycle identity diverges before any writes", async () => {
    const store = fakeStore();
    store.readRevision = async () => ({ ...envelope(), lifecycle: { ...envelope().lifecycle, revisionFingerprint: "e".repeat(64) } });
    await expect(new SeasonLifecycleTransitionRepository(store, "reviewer").approve("s1", 1, "approved after review", "season-op-005")).rejects.toThrow("season_lifecycle_identity_mismatch");
    expect(store.writes).toEqual([]);
  });
  it("replays an identical operation and rejects a reused key with changed input", async () => {
    const store = fakeStore();
    const repository = new SeasonLifecycleTransitionRepository(store, "reviewer");
    const first = await repository.approve("s1", 1, "approved after review", "season-op-004");
    await expect(repository.approve("s1", 1, "approved after review", "season-op-004")).resolves.toEqual(first);
    await expect(repository.approve("s1", 1, "different reason", "season-op-004")).rejects.toThrow("idempotency_key_reused");
  });
});
