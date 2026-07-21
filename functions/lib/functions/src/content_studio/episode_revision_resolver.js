"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertExactImmutableEpisodeRevision = assertExactImmutableEpisodeRevision;
const decision_registry_1 = require("../../../modules/learning-v2/policies/decision_registry");
async function assertExactImmutableEpisodeRevision(resolver, ref) {
    const artifact = await resolver.resolve(ref);
    if (!artifact ||
        artifact.approvalStatus !== "approved" ||
        artifact.draftId !== ref.draftId ||
        artifact.episodeId !== ref.episodeId ||
        artifact.revision !== ref.revision ||
        artifact.revisionFingerprint !== ref.revisionFingerprint ||
        artifact.contentHash !== ref.contentHash ||
        artifact.ordinal !== ref.ordinal ||
        artifact.chapterId !== ref.chapterId ||
        artifact.bodyHash !== ref.contentHash ||
        (0, decision_registry_1.hashCanonicalBody)(artifact.body) !== ref.contentHash ||
        !artifact.objectGeneration)
        throw new Error("season_episode_revision_not_approved_or_stale");
    const bodyValidation = resolver.validateBody;
    if (!bodyValidation)
        return artifact;
    if (!bodyValidation(artifact.body))
        throw new Error("season_episode_body_contract_invalid");
    return artifact;
}
//# sourceMappingURL=episode_revision_resolver.js.map