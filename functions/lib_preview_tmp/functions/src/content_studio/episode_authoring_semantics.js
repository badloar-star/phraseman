"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeAuthoringEpisodeForSemantics = void 0;
const validation_1 = require("../../../modules/learning-v2/contracts/validation");
const requiredProjectionKeys = [
    "episodeKind",
    "estimatedMinutes",
    "objectiveIds",
    "skillIds",
    "grammarDistinctionIds",
    "soundFocusIds",
    "assetIds",
    "accessibilityRoutes",
];
/**
 * Converts the authoring-body envelope into the canonical Episode contract.
 * The conversion is deliberately loss-intolerant: fields that the canonical
 * validator needs must be explicitly present in the authoring body, rather
 * than being silently guessed or dropped.
 */
const normalizeAuthoringEpisodeForSemantics = (input) => {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
        return (0, validation_1.validateV2EpisodeContract)(input);
    }
    const authoring = input;
    const missing = requiredProjectionKeys.filter((key) => !Object.prototype.hasOwnProperty.call(authoring, key));
    if (missing.length > 0) {
        const issues = missing.map((key) => ({
            code: "authoring_semantic_projection_missing",
            path: `$.episode.${key}`,
            severity: "blocking",
            waivable: false,
        }));
        return {
            ok: false,
            issues,
        };
    }
    const canonical = {
        schemaVersion: "v2-episode-contract.v1",
        episodeId: authoring.episodeId,
        seasonId: authoring.seasonId,
        episodeKind: authoring.episodeKind,
        ordinal: authoring.ordinal,
        chapterId: authoring.chapterId,
        estimatedMinutes: authoring.estimatedMinutes,
        title: authoring.title,
        canDoOutcome: authoring.canDoOutcome,
        scenario: authoring.scenario,
        objectiveIds: authoring.objectiveIds,
        skillIds: authoring.skillIds,
        phraseFrames: authoring.phraseFrames,
        semanticSlots: authoring.semanticSlots,
        criticalConstraints: authoring.criticalConstraints,
        grammarDistinctionIds: authoring.grammarDistinctionIds,
        soundFocusIds: authoring.soundFocusIds,
        assetIds: authoring.assetIds,
        activities: authoring.activityInstances,
        graph: authoring.graph,
        starSlots: authoring.starSlots,
        requiredLoops: authoring.requiredLoops,
        assessmentNodes: authoring.assessmentNodes,
        capstoneContract: authoring.capstoneContract,
        learningDesign: authoring.learningDesign,
        masteryContract: authoring.masteryContract,
        delayedProbeDefinitions: authoring.delayedProbeDefinitions,
        reviewLinks: authoring.reviewLinks,
        accessibilityRoutes: authoring.accessibilityRoutes,
    };
    if (Object.prototype.hasOwnProperty.call(authoring, "checkpointContract"))
        canonical.checkpointContract = authoring.checkpointContract;
    return (0, validation_1.validateV2EpisodeContract)(canonical);
};
exports.normalizeAuthoringEpisodeForSemantics = normalizeAuthoringEpisodeForSemantics;
//# sourceMappingURL=episode_authoring_semantics.js.map