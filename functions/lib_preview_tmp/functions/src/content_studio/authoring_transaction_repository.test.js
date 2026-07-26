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
    async createIfAbsent(id, value) {
        if (this.records.has(id))
            throw new Error("authoring_create_conflict");
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
    it("creates the first draft exactly once with the zero-head precondition", async () => {
        const store = new FakeStore();
        const base = (0, episode_draft_1.createEpisodeDraft)({
            draftId: "draft-new",
            episodeId: "ep-new",
            seasonId: "season-new",
            ordinal: 1,
            chapterId: "chapter-new",
        });
        const candidate = {
            ...base,
            body: {
                ...base.body,
                activities: [{ activityId: "activity-new" }],
                graph: {
                    ...base.body.graph,
                    startNodeId: "node-new",
                    capstoneNodeId: "node-new",
                    nodes: [
                        {
                            nodeId: "node-new",
                            activityId: "activity-new",
                            position: 1,
                            visible: true,
                            requiredForCore: true,
                            voiceEvidenceOptional: true,
                            phase: "encounter_build",
                            evidenceDeclarations: [],
                            gateEligible: false,
                            maxStars: 0,
                        },
                    ],
                    edges: [],
                },
            },
        };
        const repository = new authoring_transaction_repository_1.FirestoreEpisodeDraftRepository(store, {
            ownerId: "owner-1",
        });
        const saved = await repository.save("draft-new", candidate, {
            expectedRevision: 0,
            expectedFingerprint: "",
        });
        expect(saved.record.revision).toBe(1);
        expect(store.records.get("draft-new")?.ownerId).toBe("owner-1");
        await expect(repository.save("draft-new", candidate, {
            expectedRevision: 0,
            expectedFingerprint: "",
        })).rejects.toThrow("authoring_revision_stale");
    });
});
//# sourceMappingURL=authoring_transaction_repository.test.js.map