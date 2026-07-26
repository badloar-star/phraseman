"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const node_path_1 = __importDefault(require("node:path"));
const episode_authoring_semantics_1 = require("./episode_authoring_semantics");
const canonicalFixture = JSON.parse((0, node_fs_1.readFileSync)(node_path_1.default.resolve(__dirname, "../../../tests/fixtures/learning-v2/episode-01.valid.json"), "utf8"));
const authoringFixture = () => {
    const episode = canonicalFixture.episode;
    return {
        schemaVersion: "episode-authoring-body.v1",
        draftId: "draft-episode-01",
        episodeId: episode.episodeId,
        revision: 1,
        seasonId: episode.seasonId,
        ordinal: episode.ordinal,
        chapterId: episode.chapterId,
        studyTarget: "en",
        learnerSourceLocale: "ru",
        title: episode.title,
        canDoOutcome: episode.canDoOutcome,
        scenario: episode.scenario,
        phraseFrames: episode.phraseFrames,
        semanticSlots: episode.semanticSlots,
        criticalConstraints: episode.criticalConstraints,
        contentUnits: {},
        activityInstances: episode.activities,
        delayedProbeDefinitions: episode.delayedProbeDefinitions,
        graph: episode.graph,
        starSlots: episode.starSlots,
        requiredLoops: episode.requiredLoops,
        assessmentNodes: episode.assessmentNodes,
        capstoneContract: episode.capstoneContract,
        masteryContract: episode.masteryContract,
        learningDesign: episode.learningDesign,
        voiceGovernance: { requirementsByTemplate: [] },
        reviewLinks: episode.reviewLinks,
        minAppVersion: "1.0.0",
        episodeKind: episode.episodeKind,
        estimatedMinutes: episode.estimatedMinutes,
        objectiveIds: episode.objectiveIds,
        skillIds: episode.skillIds,
        grammarDistinctionIds: episode.grammarDistinctionIds,
        soundFocusIds: episode.soundFocusIds,
        assetIds: episode.assetIds,
        accessibilityRoutes: episode.accessibilityRoutes,
        ...(episode.checkpointContract === undefined ? {} : { checkpointContract: episode.checkpointContract }),
    };
};
describe("authoring Episode semantic bridge", () => {
    it("accepts the canonical E1 semantics without silently dropping projection fields", () => {
        expect((0, episode_authoring_semantics_1.normalizeAuthoringEpisodeForSemantics)(authoringFixture()).ok).toBe(true);
    });
    it("rejects an authoring body missing an explicit canonical projection", () => {
        const body = authoringFixture();
        delete body.accessibilityRoutes;
        const result = (0, episode_authoring_semantics_1.normalizeAuthoringEpisodeForSemantics)(body);
        expect(result.ok).toBe(false);
        if (!result.ok)
            expect(result.issues[0]?.code).toBe("authoring_semantic_projection_missing");
    });
    it("forwards delayed-probe mutations to the canonical validator", () => {
        const body = authoringFixture();
        const delayed = body.delayedProbeDefinitions;
        const first = delayed[0];
        const firstBody = first.body;
        first.body = { ...firstBody, contentHash: "f".repeat(64) };
        const result = (0, episode_authoring_semantics_1.normalizeAuthoringEpisodeForSemantics)(body);
        expect(result.ok).toBe(false);
    });
});
//# sourceMappingURL=episode_authoring_semantics.test.js.map