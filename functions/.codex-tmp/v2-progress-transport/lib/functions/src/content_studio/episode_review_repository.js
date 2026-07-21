"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EpisodeReviewRepository = void 0;
const decision_registry_1 = require("../../../modules/learning-v2/policies/decision_registry");
const episode_revision_resolver_1 = require("./episode_revision_resolver");
const subjectFor = (ref) => ({
    entityType: "episode",
    entityId: ref.episodeId,
    entityRevision: ref.revision,
    entityFingerprint: ref.contentHash,
});
class EpisodeReviewRepository {
    constructor(store, actor) {
        this.store = store;
        this.actor = actor;
    }
    async review(ref, status, reason, idempotencyKey) {
        return this.store.runTransaction(async (tx) => {
            const requestFingerprint = (0, decision_registry_1.hashCanonicalBody)({ action: "episode_review", actorId: this.actor.actorId, ref, status, reason });
            const replay = await tx.readOperation(idempotencyKey);
            if (replay) {
                if (replay.requestFingerprint !== requestFingerprint)
                    throw new Error("idempotency_key_reused");
                return replay.receipt;
            }
            const artifact = await tx.readArtifact(ref);
            if (!artifact)
                throw new Error("episode_review_artifact_missing");
            const semantic = (0, episode_revision_resolver_1.validateEpisodeRevisionArtifactSemantics)(artifact.body);
            if (!semantic.ok)
                throw new Error(`episode_review_semantics_invalid:${semantic.issues[0]?.code ?? "unknown"}`);
            const subject = subjectFor(ref);
            const receipt = {
                receiptHash: (0, decision_registry_1.hashCanonicalBody)({ subject, status, reason, reviewerId: this.actor.actorId }),
                subject,
                status,
                reviewerId: this.actor.actorId,
            };
            const receiptId = `review__${ref.episodeId}__r${ref.revision}__${ref.contentHash}__${idempotencyKey}`;
            await tx.writeReceipt(receiptId, receipt);
            await tx.createOperation(idempotencyKey, { requestFingerprint, receipt });
            return receipt;
        });
    }
}
exports.EpisodeReviewRepository = EpisodeReviewRepository;
