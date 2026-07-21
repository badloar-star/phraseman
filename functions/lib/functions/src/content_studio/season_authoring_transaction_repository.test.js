"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const season_draft_1 = require("../../../modules/learning-v2/authoring/season_draft");
const decision_registry_1 = require("../../../modules/learning-v2/policies/decision_registry");
const season_authoring_transaction_repository_1 = require("./season_authoring_transaction_repository");
const episode_revision_resolver_1 = require("./episode_revision_resolver");
const episodeBody = {
    draftId: "draft-1",
    episodeId: "ep-01",
    seasonId: "season-2",
    revision: 1,
    ordinal: 1,
    chapterId: "chapter-1",
};
const ref = {
    draftId: "draft-1",
    episodeId: "ep-01",
    revision: 1,
    revisionFingerprint: (0, episode_revision_resolver_1.episodeRevisionFingerprint)("draft-1", 1, (0, decision_registry_1.hashCanonicalBody)(episodeBody)),
    contentHash: (0, decision_registry_1.hashCanonicalBody)(episodeBody),
    ordinal: 1,
    chapterId: "chapter-1",
    approvalStatus: "approved",
};
class FakeSeasonStore {
    constructor() {
        this.records = new Map();
    }
    async runTransaction(work) {
        return work(this);
    }
    async read(id) {
        return this.records.get(id);
    }
    async compareAndSet(id, expectedRevision, expectedFingerprint, value) {
        const current = this.records.get(id);
        if (!current ||
            current.draft.record.revision !== expectedRevision ||
            current.draft.record.fingerprint !== expectedFingerprint)
            throw new Error("authoring_revision_stale");
        this.records.set(id, value);
    }
}
describe("season authoring transaction repository", () => {
    it("rejects a missing immutable episode artifact before compare-and-set", async () => {
        const store = new FakeSeasonStore();
        const draft = (0, season_draft_1.createSeasonDraft)({
            draftId: "season-draft-1",
            seasonId: "season-1",
            scope: "vertical_slice",
        });
        store.records.set("season-draft-1", { ownerId: "owner-1", draft });
        const candidate = (0, season_draft_1.pinApprovedEpisodeRevisions)(draft, [ref], {
            version: "v2-gates-1",
        });
        const repository = new season_authoring_transaction_repository_1.FirestoreSeasonDraftRepository(store, { ownerId: "owner-1" }, { resolve: async () => undefined });
        await expect(repository.save("season-draft-1", candidate, {
            expectedRevision: 1,
            expectedFingerprint: draft.record.fingerprint,
        })).rejects.toThrow("season_episode_revision_not_approved_or_stale");
    });
    it("accepts only an exact immutable artifact and recomputes the record", async () => {
        const store = new FakeSeasonStore();
        const draft = (0, season_draft_1.createSeasonDraft)({
            draftId: "season-draft-2",
            seasonId: "season-2",
            scope: "vertical_slice",
        });
        store.records.set("season-draft-2", { ownerId: "owner-1", draft });
        const candidate = (0, season_draft_1.pinApprovedEpisodeRevisions)(draft, [ref], {
            version: "v2-gates-1",
        });
        const repository = new season_authoring_transaction_repository_1.FirestoreSeasonDraftRepository(store, { ownerId: "owner-1" }, {
            resolve: async (requested) => ({
                ...requested,
                record: {
                    schemaVersion: "episode-authoring-record.v1",
                    draftId: requested.draftId,
                    episodeId: requested.episodeId,
                    revision: requested.revision,
                    contentHash: requested.contentHash,
                    revisionFingerprint: requested.revisionFingerprint,
                    object: {
                        objectPath: (0, episode_revision_resolver_1.episodeRevisionObjectPath)(requested.draftId, requested.revision, requested.contentHash),
                        contentHash: requested.contentHash,
                        objectGeneration: "generation-1",
                        byteSize: 2,
                    },
                    provenance: {
                        createdBy: "owner-1",
                        createdAt: "2026-07-16T00:00:00.000Z",
                    },
                    createdAt: "2026-07-16T00:00:00.000Z",
                },
                lifecycle: {
                    schemaVersion: "episode-lifecycle.v1",
                    draftId: requested.draftId,
                    episodeId: requested.episodeId,
                    revision: requested.revision,
                    revisionFingerprint: requested.revisionFingerprint,
                    status: "approved",
                    changedBy: "owner-1",
                    changedAt: "2026-07-16T00:00:00.000Z",
                    lifecycleRevision: 1,
                },
                body: episodeBody,
                bodyHash: requested.contentHash,
                objectPath: (0, episode_revision_resolver_1.episodeRevisionObjectPath)(requested.draftId, requested.revision, requested.contentHash),
                objectGeneration: "generation-1",
            }),
        });
        const poisoned = {
            ...candidate,
            record: {
                ...candidate.record,
                contentHash: "tampered",
                fingerprint: "tampered",
            },
        };
        const saved = await repository.save("season-draft-2", poisoned, {
            expectedRevision: 1,
            expectedFingerprint: draft.record.fingerprint,
        });
        expect(saved.record.revision).toBe(2);
        expect(store.records.get("season-draft-2")?.draft.record.contentHash).toBe(candidate.record.contentHash);
        expect(store.records.get("season-draft-2")?.draft.record.fingerprint).toBe(candidate.record.fingerprint);
    });
});
//# sourceMappingURL=season_authoring_transaction_repository.test.js.map