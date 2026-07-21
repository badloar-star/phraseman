"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EpisodeLocalizationRepository = void 0;
const decision_registry_1 = require("../../../modules/learning-v2/policies/decision_registry");
const episode_revision_resolver_1 = require("./episode_revision_resolver");
class EpisodeLocalizationRepository {
    constructor(store, actor) {
        this.store = store;
        this.actor = actor;
    }
    async approve(ref, reason, idempotencyKey) {
        return this.store.runTransaction(async (tx) => {
            const subject = { entityType: "episode", entityId: ref.episodeId, entityRevision: ref.revision, entityFingerprint: ref.contentHash };
            const requestFingerprint = (0, decision_registry_1.hashCanonicalBody)({ action: "episode_localization", actorId: this.actor.actorId, ref, reason });
            const replay = await tx.readOperation(idempotencyKey);
            if (replay) {
                if (replay.requestFingerprint !== requestFingerprint)
                    throw new Error("idempotency_key_reused");
                return replay.receipt;
            }
            const artifact = await tx.readArtifact(ref);
            if (!artifact)
                throw new Error("episode_localization_artifact_missing");
            const result = (0, episode_revision_resolver_1.validateEpisodeRevisionArtifactSemantics)(artifact.body);
            if (!result.ok)
                throw new Error(`episode_localization_failed:${result.issues[0]?.code ?? "unknown"}`);
            const receipt = { receiptHash: (0, decision_registry_1.hashCanonicalBody)({ subject, reason, localizerId: this.actor.actorId }), subject, status: "approved" };
            const receiptId = `localization__${ref.episodeId}__r${ref.revision}__${ref.contentHash}__${idempotencyKey}`;
            await tx.writeReceipt(receiptId, receipt);
            await tx.createOperation(idempotencyKey, { requestFingerprint, receipt });
            return receipt;
        });
    }
}
exports.EpisodeLocalizationRepository = EpisodeLocalizationRepository;
//# sourceMappingURL=episode_localization_repository.js.map