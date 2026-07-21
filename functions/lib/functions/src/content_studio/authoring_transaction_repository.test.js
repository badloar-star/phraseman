"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const episode_draft_1 = require("../../../modules/learning-v2/authoring/episode_draft");
const authoring_transaction_repository_1 = require("./authoring_transaction_repository");
class FakeStore {
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
describe("authoring transaction repository", () => {
    it("enforces owner and recomputes immutable body identity inside the transaction", async () => {
        const store = new FakeStore();
        const initial = (0, episode_draft_1.createEpisodeDraft)({
            draftId: "draft-1",
            episodeId: "ep-1",
            seasonId: "season-1",
            ordinal: 1,
            chapterId: "chapter-1",
        });
        store.records.set("draft-1", { ownerId: "owner-1", draft: initial });
        const repository = new authoring_transaction_repository_1.FirestoreEpisodeDraftRepository(store, {
            ownerId: "owner-1",
        });
        await expect(repository.save("draft-1", initial, {
            expectedRevision: 1,
            expectedFingerprint: initial.record.fingerprint,
        })).rejects.toThrow("episode_authoring_invalid");
        await expect(new authoring_transaction_repository_1.FirestoreEpisodeDraftRepository(store, { ownerId: "owner-2" }).save("draft-1", initial, {
            expectedRevision: 1,
            expectedFingerprint: initial.record.fingerprint,
        })).rejects.toThrow("authoring_owner_forbidden");
    });
});
//# sourceMappingURL=authoring_transaction_repository.test.js.map