"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FirestoreEpisodeDraftRepository = void 0;
const episode_draft_1 = require("../../../modules/learning-v2/authoring/episode_draft");
const decision_registry_1 = require("../../../modules/learning-v2/policies/decision_registry");
class FirestoreEpisodeDraftRepository {
    constructor(store, actor) {
        this.store = store;
        this.actor = actor;
    }
    async save(id, candidate, expected) {
        return this.store.runTransaction(async (tx) => {
            const current = await tx.read(id);
            if (!current) {
                if (expected.expectedRevision !== 0 ||
                    expected.expectedFingerprint !== "")
                    throw new Error("authoring_head_missing");
                if (candidate.body.draftId !== id)
                    throw new Error("authoring_draft_id_mismatch");
                const issues = (0, episode_draft_1.validateEpisodeDraft)(candidate);
                if (issues.length)
                    throw new Error(`episode_authoring_invalid:${issues[0]}`);
                const contentHash = (0, decision_registry_1.hashCanonicalBody)(candidate.body);
                const next = {
                    body: candidate.body,
                    record: {
                        schemaVersion: "episode-draft-record.v1",
                        draftId: candidate.body.draftId,
                        episodeId: candidate.body.episodeId,
                        revision: 1,
                        contentHash,
                        fingerprint: (0, decision_registry_1.hashCanonicalBody)({
                            draftId: candidate.body.draftId,
                            revision: 1,
                            contentHash,
                        }),
                        status: "draft",
                    },
                };
                if (!tx.createIfAbsent)
                    throw new Error("authoring_create_not_supported");
                await tx.createIfAbsent(id, {
                    ownerId: this.actor.ownerId,
                    draft: next,
                });
                return next;
            }
            if (current.ownerId !== this.actor.ownerId)
                throw new Error("authoring_owner_forbidden");
            if (candidate.body.draftId !== id)
                throw new Error("authoring_draft_id_mismatch");
            if (candidate.body.episodeId !== current.draft.body.episodeId ||
                candidate.body.seasonId !== current.draft.body.seasonId ||
                candidate.body.ordinal !== current.draft.body.ordinal ||
                candidate.body.chapterId !== current.draft.body.chapterId)
                throw new Error("authoring_identity_mismatch");
            if (current.draft.record.revision !== expected.expectedRevision ||
                current.draft.record.fingerprint !== expected.expectedFingerprint)
                throw new Error("authoring_revision_stale");
            const issues = (0, episode_draft_1.validateEpisodeDraft)(candidate);
            if (issues.length)
                throw new Error(`episode_authoring_invalid:${issues[0]}`);
            const contentHash = (0, decision_registry_1.hashCanonicalBody)(candidate.body);
            const revision = current.draft.record.revision + 1;
            const next = {
                body: candidate.body,
                record: {
                    schemaVersion: "episode-draft-record.v1",
                    draftId: candidate.body.draftId,
                    episodeId: candidate.body.episodeId,
                    revision,
                    contentHash,
                    fingerprint: (0, decision_registry_1.hashCanonicalBody)({
                        draftId: candidate.body.draftId,
                        revision,
                        contentHash,
                    }),
                    status: "draft",
                },
            };
            await tx.compareAndSet(id, expected.expectedRevision, expected.expectedFingerprint, { ownerId: current.ownerId, draft: next });
            return next;
        });
    }
}
exports.FirestoreEpisodeDraftRepository = FirestoreEpisodeDraftRepository;
