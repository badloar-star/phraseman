"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EpisodeVoiceGovernanceRepository = void 0;
const validation_1 = require("../../../modules/learning-v2/contracts/validation");
const decision_registry_1 = require("../../../modules/learning-v2/policies/decision_registry");
const voice_dependency_resolver_1 = require("./voice_dependency_resolver");
class EpisodeVoiceGovernanceRepository {
    constructor(store, actor, dependencies) {
        this.store = store;
        this.actor = actor;
        this.dependencies = dependencies;
    }
    async approve(ref, reason, idempotencyKey) {
        return this.store.runTransaction(async (tx) => {
            const subject = { entityType: "episode", entityId: ref.episodeId, entityRevision: ref.revision, entityFingerprint: ref.contentHash };
            const requestFingerprint = (0, decision_registry_1.hashCanonicalBody)({ action: "episode_voice_governance", actorId: this.actor.actorId, ref, reason });
            const replay = await tx.readOperation(idempotencyKey);
            if (replay) {
                if (replay.requestFingerprint !== requestFingerprint)
                    throw new Error("idempotency_key_reused");
                return replay.receipt;
            }
            const artifact = await tx.readArtifact(ref);
            if (!artifact || typeof artifact.body !== "object" || artifact.body === null)
                throw new Error("episode_voice_artifact_missing");
            const governance = artifact.body.voiceGovernance;
            if (!governance || typeof governance !== "object" || !Array.isArray(governance.requirementsByTemplate))
                throw new Error("episode_voice_governance_invalid");
            for (const entry of governance.requirementsByTemplate) {
                if (!entry || typeof entry !== "object")
                    throw new Error("episode_voice_governance_invalid");
                const requirement = entry.requirements;
                const issue = (0, validation_1.validateVoiceReleaseRequirementsShape)(requirement, "$.episode.voiceGovernance.requirementsByTemplate");
                if (issue)
                    throw new Error(`episode_voice_governance_invalid:${issue.code}`);
                if (this.dependencies && typeof requirement === "object" && requirement !== null) {
                    const value = requirement;
                    if (value.processingMode !== "on_device_only") {
                        await (0, voice_dependency_resolver_1.resolveVoiceDependencies)(this.dependencies.reader, {
                            calibration: value.calibrationReceiptRef,
                            policy: value.voiceDataPolicyRef,
                            egress: value.networkEgressRef,
                            activePolicyRegistryKey: value.activePolicyRegistryKey,
                            requiredNetworkPurposes: value.requiredNetworkPurposes,
                            environment: this.dependencies.environment,
                        });
                    }
                }
            }
            const receipt = { receiptHash: (0, decision_registry_1.hashCanonicalBody)({ subject, reason, voiceReviewerId: this.actor.actorId }), subject, status: "approved" };
            const receiptId = `voice__${ref.episodeId}__r${ref.revision}__${ref.contentHash}__${idempotencyKey}`;
            await tx.writeReceipt(receiptId, receipt);
            await tx.createOperation(idempotencyKey, { requestFingerprint, receipt });
            return receipt;
        });
    }
}
exports.EpisodeVoiceGovernanceRepository = EpisodeVoiceGovernanceRepository;
