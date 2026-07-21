"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
jest.mock("../content_studio/season_revision_resolver", () => ({
    resolveImmutableSeasonRevision: jest.fn(async () => ({ record: { seasonId: "season-1" }, lifecycle: { status: "approved" }, body: { episodeRevisionRefs: [{ draftId: "draft-1", episodeId: "episode-1", revision: 1, revisionFingerprint: "b".repeat(64), contentHash: "c".repeat(64), ordinal: 1, chapterId: "chapter-1", approvalStatus: "approved" }] } })),
    createStorageSeasonRevisionObjectReader: jest.fn(),
}));
jest.mock("../content_studio/firestore_authoring_store", () => ({
    createFirestoreEpisodeRevisionResolver: jest.fn(() => ({})),
}));
jest.mock("../content_studio/episode_revision_resolver", () => ({
    assertExactImmutableEpisodeRevision: jest.fn(async (_resolver, ref) => ({ ...ref, approvalStatus: "approved", body: {}, bodyHash: ref.contentHash, objectPath: "object", objectGeneration: "1", record: {}, lifecycle: {} })),
}));
const progress_event_1 = require("./progress_event");
const firestore_progress_event_store_1 = require("./firestore_progress_event_store");
const progress_event_2 = require("./progress_event");
const attempt_1 = require("../../../modules/learning-v2/contracts/attempt");
const season_revision_resolver_1 = require("../content_studio/season_revision_resolver");
const episode_revision_resolver_1 = require("../content_studio/episode_revision_resolver");
const body = { schemaVersion: "v2-attempt-body.v1", opId: "adapter-attempt-1", attemptSurface: { kind: "episode_graph_node" }, outcome: { resultCode: "CORRECT" }, evidence: { hintsUsed: 0 }, provenance: { phase: "near_transfer" }, inputBinding: { source: "keyboard" }, learningTupleDispositions: [] };
const attemptRef = (0, attempt_1.buildCanonicalAttemptRef)(body);
const request = { accountScopeHash: (0, progress_event_2.deriveProgressAccountScopeHash)("stable-a", 1), seasonId: "season-1", studyTarget: "en", learnerSourceLocale: "ru", seasonRevisionId: "season-rev-1", episodeRevisionRef: { draftId: "draft-1", episodeId: "episode-1", revision: 1, revisionFingerprint: "b".repeat(64), contentHash: "c".repeat(64), ordinal: 1, chapterId: "chapter-1", approvalStatus: "approved" }, idempotencyKey: "adapter-op-1", attemptBody: body, attemptRef, evidenceBundle: { schemaVersion: "v2-progress-evidence-bundle.v1", attemptRef, evidenceBodies: [], nonAssessmentBodies: [] }, projection: { starSlotId: "slot-1", previousBestStars: 0, candidateStars: 0, activityId: "activity-1", progressCompatibilityKey: "compat-1" } };
const authUidFor = (stableUid) => `auth-${(0, progress_event_2.deriveProgressAccountScopeHash)(stableUid, 1)}`;
const identitySnapshot = (path) => {
    for (const stableUid of ["stable-a", "a/b", "a_b"]) {
        if (path === `auth_links/${authUidFor(stableUid)}`)
            return { exists: true, data: () => ({ stable_id: stableUid }) };
        if (path === `users/${stableUid}`)
            return { exists: true, data: () => ({ accountGeneration: 1 }) };
        if (path === `account_deletion_tombstones/${stableUid}`)
            return { exists: false, data: () => undefined };
    }
    return undefined;
};
const storeOptions = (db, stableUid) => ({
    db,
    authUid: authUidFor(stableUid),
    stableUid,
    accountGeneration: 1,
    accountScopeHash: (0, progress_event_2.deriveProgressAccountScopeHash)(stableUid, 1),
    episodeResolver: {},
    seasonObjectReader: { read: async () => ({ body: {}, contentHash: "c".repeat(64), objectGeneration: "1", byteSize: 1 }) },
});
describe("Firestore progress adapter transaction ordering", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    afterEach(() => {
        season_revision_resolver_1.resolveImmutableSeasonRevision.mockImplementation(async () => ({ record: { seasonId: "season-1" }, lifecycle: { status: "approved" }, body: { episodeRevisionRefs: [{ draftId: "draft-1", episodeId: "episode-1", revision: 1, revisionFingerprint: "b".repeat(64), contentHash: "c".repeat(64), ordinal: 1, chapterId: "chapter-1", approvalStatus: "approved" }] } }));
        episode_revision_resolver_1.assertExactImmutableEpisodeRevision.mockImplementation(async (_resolver, ref) => ({ ...ref, approvalStatus: "approved", body: {}, bodyHash: ref.contentHash, objectPath: "object", objectGeneration: "1", record: {}, lifecycle: {} }));
    });
    it("reads canonical and projection/index state before issuing writes", async () => {
        const events = [];
        const db = { doc: (path) => ({ path }), runTransaction: async (work) => work({ get: async (ref) => { events.push(`read:${ref.path}`); return identitySnapshot(ref.path) ?? { exists: false, data: () => undefined }; }, create: (ref) => { events.push(`create:${ref.path}`); }, set: (ref) => { events.push(`set:${ref.path}`); } }) };
        const store = (0, firestore_progress_event_store_1.createFirestoreProgressEventStore)(storeOptions(db, "stable-a"));
        await (0, progress_event_1.applyProgressEvent)(store, request);
        const firstWrite = events.findIndex((event) => event.startsWith("create:") || event.startsWith("set:"));
        expect(firstWrite).toBeGreaterThanOrEqual(0);
        expect(events.slice(0, firstWrite).every((event) => event.startsWith("read:"))).toBe(true);
        expect(events.filter((event) => event.startsWith("create:")).length).toBeGreaterThanOrEqual(3);
    });
    it("rejects an applyProgressEvent replay after deletion before returning duplicate", async () => {
        const documents = new Map();
        const reads = [];
        const writes = [];
        const db = {
            doc: (path) => ({ path }),
            runTransaction: async (work) => work({
                get: async (ref) => {
                    reads.push(ref.path);
                    if (documents.has(ref.path))
                        return { exists: true, data: () => documents.get(ref.path) };
                    return identitySnapshot(ref.path) ?? { exists: false, data: () => undefined };
                },
                create: (ref, value) => {
                    writes.push(`create:${ref.path}`);
                    documents.set(ref.path, value);
                },
                set: (ref, value) => {
                    writes.push(`set:${ref.path}`);
                    documents.set(ref.path, value);
                },
            }),
        };
        const scope = (0, progress_event_2.deriveProgressAccountScopeHash)("stable-a", 1);
        const operationPath = `learning_v2_progress_operations/${scope}__season-rev-1__adapter-op-1`;
        const attemptPath = `learning_v2_progress_attempts/${scope}__season-rev-1__episode-1__adapter-attempt-1`;
        const store = (0, firestore_progress_event_store_1.createFirestoreProgressEventStore)(storeOptions(db, "stable-a"));
        await expect((0, progress_event_1.applyProgressEvent)(store, request)).resolves.toMatchObject({ duplicate: false });
        expect(documents.has(operationPath)).toBe(true);
        expect(documents.has(attemptPath)).toBe(true);
        documents.set("account_deletion_tombstones/stable-a", { status: "complete" });
        const readsBeforeReplay = reads.length;
        const writesBeforeReplay = writes.length;
        await expect((0, progress_event_1.applyProgressEvent)(store, request)).rejects.toThrow("account_delete_pending");
        expect(reads.slice(readsBeforeReplay)).toEqual([
            `auth_links/${authUidFor("stable-a")}`,
            "users/stable-a",
            "account_deletion_tombstones/stable-a",
        ]);
        expect(writes).toHaveLength(writesBeforeReplay);
    });
    it("rejects an archived Season before issuing any progress writes", async () => {
        const events = [];
        season_revision_resolver_1.resolveImmutableSeasonRevision.mockResolvedValue({
            record: { seasonId: "season-1" },
            lifecycle: { status: "archived" },
            body: { episodeRevisionRefs: [request.episodeRevisionRef] },
        });
        const db = { doc: (path) => ({ path }), runTransaction: async (work) => work({ get: async (ref) => { events.push(`read:${ref.path}`); return identitySnapshot(ref.path) ?? { exists: false, data: () => undefined }; }, create: () => { events.push("create"); }, set: () => { events.push("set"); } }) };
        const store = (0, firestore_progress_event_store_1.createFirestoreProgressEventStore)(storeOptions(db, "stable-a"));
        await expect((0, progress_event_1.applyProgressEvent)(store, { ...request, idempotencyKey: "archived-op-1" })).rejects.toThrow("v2_progress_season_not_approved_or_stale");
        expect(events.some((event) => event === "create" || event === "set")).toBe(false);
    });
    it("rejects a cross-account scope before resolving canonical pins", async () => {
        const db = { doc: (path) => ({ path }), runTransaction: async (work) => work({ get: async (ref) => identitySnapshot(ref.path) ?? ({ exists: false, data: () => undefined }), create: () => { throw new Error("unexpected_write"); }, set: () => { throw new Error("unexpected_write"); } }) };
        const store = (0, firestore_progress_event_store_1.createFirestoreProgressEventStore)(storeOptions(db, "stable-a"));
        await expect((0, progress_event_1.applyProgressEvent)(store, { ...request, accountScopeHash: (0, progress_event_2.deriveProgressAccountScopeHash)("stable-b", 1), idempotencyKey: "cross-account-op-1" })).rejects.toThrow("v2_progress_account_scope_mismatch");
        expect(season_revision_resolver_1.resolveImmutableSeasonRevision).not.toHaveBeenCalled();
    });
    it("rejects an episode revision that does not match the canonical artifact", async () => {
        const db = { doc: (path) => ({ path }), runTransaction: async (work) => work({ get: async (ref) => identitySnapshot(ref.path) ?? ({ exists: false, data: () => undefined }), create: () => { throw new Error("unexpected_write"); }, set: () => { throw new Error("unexpected_write"); } }) };
        episode_revision_resolver_1.assertExactImmutableEpisodeRevision.mockResolvedValue({ ...request.episodeRevisionRef, approvalStatus: "approved", contentHash: "d".repeat(64), revisionFingerprint: "e".repeat(64) });
        const store = (0, firestore_progress_event_store_1.createFirestoreProgressEventStore)(storeOptions(db, "stable-a"));
        await expect((0, progress_event_1.applyProgressEvent)(store, { ...request, idempotencyKey: "episode-substitution-op-1" })).rejects.toThrow("v2_progress_episode_not_canonical");
    });
    it("keeps account progress paths distinct for sanitization-colliding UIDs", async () => {
        const createdPaths = [];
        const db = { doc: (path) => ({ path }), runTransaction: async (work) => work({ get: async (ref) => identitySnapshot(ref.path) ?? ({ exists: false, data: () => undefined }), create: (ref) => { createdPaths.push(ref.path); }, set: (ref) => { createdPaths.push(ref.path); } }) };
        const first = (0, firestore_progress_event_store_1.createFirestoreProgressEventStore)(storeOptions(db, "a/b"));
        const second = (0, firestore_progress_event_store_1.createFirestoreProgressEventStore)(storeOptions(db, "a_b"));
        await (0, progress_event_1.applyProgressEvent)(first, { ...request, accountScopeHash: (0, progress_event_2.deriveProgressAccountScopeHash)("a/b", 1), idempotencyKey: "path-collision-op-1" });
        await (0, progress_event_1.applyProgressEvent)(second, { ...request, accountScopeHash: (0, progress_event_2.deriveProgressAccountScopeHash)("a_b", 1), idempotencyKey: "path-collision-op-2" });
        const projectionPaths = createdPaths.filter((path) => path.includes("/v2_progress/") && path.includes("/slots/"));
        expect(projectionPaths).toHaveLength(2);
        expect(projectionPaths[0]).not.toBe(projectionPaths[1]);
    });
});
//# sourceMappingURL=firestore_progress_event_store.integration.test.js.map