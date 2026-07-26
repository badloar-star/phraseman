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
const server_score_resolver_1 = require("./server_score_resolver");
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
        const operationPath = `users/stable-a/v2_progress_ops/${(0, firestore_progress_event_store_1.progressOperationDocumentId)(scope, "season-rev-1", "adapter-op-1")}`;
        const attemptPath = `users/stable-a/v2_progress_attempts/${(0, firestore_progress_event_store_1.progressAttemptDocumentId)(scope, "season-rev-1", "episode-1", "adapter-attempt-1")}`;
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
    it("restores missing normal replay artifacts under the canonical stable owner root", async () => {
        const documents = new Map();
        const db = {
            doc: (path) => ({ path }),
            runTransaction: async (work) => work({
                get: async (ref) => {
                    if (documents.has(ref.path))
                        return { exists: true, data: () => documents.get(ref.path) };
                    return identitySnapshot(ref.path) ?? { exists: false, data: () => undefined };
                },
                create: (ref, value) => {
                    if (documents.has(ref.path))
                        throw new Error("already-exists");
                    documents.set(ref.path, value);
                },
                set: (ref, value) => documents.set(ref.path, value),
            }),
        };
        const scope = (0, progress_event_2.deriveProgressAccountScopeHash)("stable-a", 1);
        const projectionPath = `users/stable-a/v2_progress/${scope}/seasons/season-rev-1/episodes/episode-1/slots/slot-1`;
        const attemptPath = `users/stable-a/v2_progress_attempts/${(0, firestore_progress_event_store_1.progressAttemptDocumentId)(scope, "season-rev-1", "episode-1", "adapter-attempt-1")}`;
        const store = (0, firestore_progress_event_store_1.createFirestoreProgressEventStore)(storeOptions(db, "stable-a"));
        await expect((0, progress_event_1.applyProgressEvent)(store, request)).resolves.toMatchObject({ duplicate: false });
        documents.delete(projectionPath);
        documents.delete(attemptPath);
        await expect((0, progress_event_1.applyProgressEvent)(store, request)).resolves.toMatchObject({ duplicate: true });
        expect(documents.get(projectionPath)).toMatchObject({
            accountStableUid: "stable-a",
            accountScopeHash: scope,
            projection: { starSlotId: "slot-1" },
        });
        expect(documents.get(attemptPath)).toMatchObject({
            attemptBodyHash: request.attemptRef.attemptBodyHash,
            effectiveProjectionFingerprint: expect.stringMatching(/^[a-f0-9]{64}$/),
        });
    });
    it("fails closed on a corrupt normal replay attempt artifact", async () => {
        const documents = new Map();
        const db = {
            doc: (path) => ({ path }),
            runTransaction: async (work) => work({
                get: async (ref) => {
                    if (documents.has(ref.path))
                        return { exists: true, data: () => documents.get(ref.path) };
                    return identitySnapshot(ref.path) ?? { exists: false, data: () => undefined };
                },
                create: (ref, value) => documents.set(ref.path, value),
                set: (ref, value) => documents.set(ref.path, value),
            }),
        };
        const scope = (0, progress_event_2.deriveProgressAccountScopeHash)("stable-a", 1);
        const attemptPath = `users/stable-a/v2_progress_attempts/${(0, firestore_progress_event_store_1.progressAttemptDocumentId)(scope, "season-rev-1", "episode-1", "adapter-attempt-1")}`;
        const store = (0, firestore_progress_event_store_1.createFirestoreProgressEventStore)(storeOptions(db, "stable-a"));
        await (0, progress_event_1.applyProgressEvent)(store, request);
        documents.set(attemptPath, {
            ...documents.get(attemptPath),
            attemptBodyHash: "f".repeat(64),
        });
        await expect((0, progress_event_1.applyProgressEvent)(store, request))
            .rejects.toThrow("v2_progress_replay_attempt_conflict");
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
    it.each(["without a scorer", "with a scorer"])("rejects a foreign existing projection %s before progress writes", async (mode) => {
        const documents = new Map();
        const writes = [];
        const scope = (0, progress_event_2.deriveProgressAccountScopeHash)("stable-a", 1);
        const projectionPath = `users/stable-a/v2_progress/${scope}/seasons/season-rev-1/episodes/episode-1/slots/slot-1`;
        documents.set(projectionPath, {
            schemaVersion: "v2-progress-projection.v1",
            accountStableUid: "foreign-account",
            accountGeneration: 1,
            seasonRevisionId: "season-rev-1",
            episodeId: "episode-1",
            projection: { performanceStars: 0, performanceStarsDelta: 0, accessStarsEarnedDelta: 0, accessStarsPurchasedDelta: 0, starSlotId: "slot-1", activityId: "activity-1", progressCompatibilityKey: "compat-1" },
        });
        const db = {
            doc: (path) => ({ path }),
            runTransaction: async (work) => work({
                get: async (ref) => documents.has(ref.path)
                    ? { exists: true, data: () => documents.get(ref.path) }
                    : identitySnapshot(ref.path) ?? { exists: false, data: () => undefined },
                create: (ref, value) => { writes.push(`create:${ref.path}`); documents.set(ref.path, value); },
                set: (ref, value) => { writes.push(`set:${ref.path}`); documents.set(ref.path, value); },
            }),
        };
        const options = storeOptions(db, "stable-a");
        if (mode === "with a scorer") {
            options.resolveServerScore = ({ request: submitted, attemptRef: submittedAttemptRef, evidence }) => (0, server_score_resolver_1.resolveServerScore)({
                attemptRef: submittedAttemptRef,
                activityId: submitted.projection.activityId,
                starSlotId: submitted.projection.starSlotId,
                progressCompatibilityKey: submitted.projection.progressCompatibilityKey,
                scoringPolicyRef: { kind: "scoring", key: "policy.scoring.core", version: 1, contentHash: "a".repeat(64) },
                resultCode: "CORRECT",
                evidenceComponentFingerprint: evidence.componentFingerprint,
            }, () => 0);
        }
        await expect((0, progress_event_1.applyProgressEvent)((0, firestore_progress_event_store_1.createFirestoreProgressEventStore)(options), { ...request, idempotencyKey: mode === "with a scorer" ? "foreign-projection-scorer" : "foreign-projection-no-scorer" })).rejects.toThrow("v2_progress_projection_state_invalid");
        expect(writes).toEqual([]);
    });
    it("keeps account progress paths under distinct canonical stable owner roots", async () => {
        const createdPaths = [];
        const db = { doc: (path) => ({ path }), runTransaction: async (work) => work({ get: async (ref) => identitySnapshot(ref.path) ?? ({ exists: false, data: () => undefined }), create: (ref) => { createdPaths.push(ref.path); }, set: (ref) => { createdPaths.push(ref.path); } }) };
        const first = (0, firestore_progress_event_store_1.createFirestoreProgressEventStore)(storeOptions(db, "stable-a"));
        const second = (0, firestore_progress_event_store_1.createFirestoreProgressEventStore)(storeOptions(db, "a_b"));
        await (0, progress_event_1.applyProgressEvent)(first, { ...request, accountScopeHash: (0, progress_event_2.deriveProgressAccountScopeHash)("stable-a", 1), idempotencyKey: "path-collision-op-1" });
        await (0, progress_event_1.applyProgressEvent)(second, { ...request, accountScopeHash: (0, progress_event_2.deriveProgressAccountScopeHash)("a_b", 1), idempotencyKey: "path-collision-op-2" });
        const projectionPaths = createdPaths.filter((path) => path.includes("/v2_progress/") && path.includes("/slots/"));
        expect(projectionPaths).toHaveLength(2);
        expect(projectionPaths[0]).toContain("users/stable-a/v2_progress/");
        expect(projectionPaths[1]).toContain("users/a_b/v2_progress/");
        expect(projectionPaths[0]).not.toBe(projectionPaths[1]);
    });
    it("derives distinct versioned document IDs for sanitization-colliding operation and attempt tuples", () => {
        const scope = (0, progress_event_2.deriveProgressAccountScopeHash)("stable-a", 1);
        const firstOperationId = (0, firestore_progress_event_store_1.progressOperationDocumentId)(scope, "season-rev-1", "collision:key-0001");
        const secondOperationId = (0, firestore_progress_event_store_1.progressOperationDocumentId)(scope, "season-rev-1", "collision_key-0001");
        const firstAttemptId = (0, firestore_progress_event_store_1.progressAttemptDocumentId)(scope, "season-rev-1", "episode-1", "collision/attempt-0001");
        const secondAttemptId = (0, firestore_progress_event_store_1.progressAttemptDocumentId)(scope, "season-rev-1", "episode-1", "collision_attempt-0001");
        for (const operationId of [firstOperationId, secondOperationId])
            expect(operationId).toMatch(/^opv1_[a-f0-9]{64}$/);
        for (const attemptId of [firstAttemptId, secondAttemptId])
            expect(attemptId).toMatch(/^atv1_[a-f0-9]{64}$/);
        expect(firstOperationId).not.toBe(secondOperationId);
        expect(firstAttemptId).not.toBe(secondAttemptId);
        expect((0, firestore_progress_event_store_1.progressOperationDocumentId)(scope, "season-rev-1", "collision:key-0001")).toBe(firstOperationId);
        expect((0, firestore_progress_event_store_1.progressAttemptDocumentId)(scope, "season-rev-1", "episode-1", "collision/attempt-0001")).toBe(firstAttemptId);
    });
});
//# sourceMappingURL=firestore_progress_event_store.integration.test.js.map