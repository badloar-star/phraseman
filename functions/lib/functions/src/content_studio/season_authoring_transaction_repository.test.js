"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const season_draft_1 = require("../../../modules/learning-v2/authoring/season_draft");
const decision_registry_1 = require("../../../modules/learning-v2/policies/decision_registry");
const season_authoring_transaction_repository_1 = require("./season_authoring_transaction_repository");
const episodeBody = {};
const ref = {
    draftId: "draft-1",
    episodeId: "ep-01",
    revision: 1,
    revisionFingerprint: "fingerprint-1",
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
                body: episodeBody,
                bodyHash: requested.contentHash,
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