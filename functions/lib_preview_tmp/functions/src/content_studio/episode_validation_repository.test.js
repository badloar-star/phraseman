"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const node_path_1 = __importDefault(require("node:path"));
const episode_validation_repository_1 = require("./episode_validation_repository");
const ref = { draftId: "draft-1", episodeId: "episode-1", revision: 1, revisionFingerprint: "a".repeat(64), contentHash: "b".repeat(64), ordinal: 1, chapterId: "chapter-1", approvalStatus: "approved" };
class Store {
    constructor() {
        this.body = { invalid: true };
    }
    async runTransaction(work) { return work(this); }
    async readArtifact() { return { body: this.body }; }
    async writeReceipt() { }
    async readOperation() { return this.operation; }
    async createOperation(_id, value) { this.operation = value; }
}
const validBody = () => {
    const episode = JSON.parse((0, node_fs_1.readFileSync)(node_path_1.default.resolve(__dirname, "../../../tests/fixtures/learning-v2/episode-01.valid.json"), "utf8")).episode;
    return { schemaVersion: "episode-authoring-body.v1", draftId: "draft-1", episodeId: episode.episodeId, revision: 1, seasonId: episode.seasonId, ordinal: episode.ordinal, chapterId: episode.chapterId, studyTarget: "en", learnerSourceLocale: "ru", title: episode.title, canDoOutcome: episode.canDoOutcome, scenario: episode.scenario, phraseFrames: episode.phraseFrames, semanticSlots: episode.semanticSlots, criticalConstraints: episode.criticalConstraints, contentUnits: {}, activityInstances: episode.activities, delayedProbeDefinitions: episode.delayedProbeDefinitions, graph: episode.graph, starSlots: episode.starSlots, requiredLoops: episode.requiredLoops, assessmentNodes: episode.assessmentNodes, capstoneContract: episode.capstoneContract, masteryContract: episode.masteryContract, learningDesign: episode.learningDesign, voiceGovernance: { requirementsByTemplate: [] }, reviewLinks: episode.reviewLinks, minAppVersion: "1.0.0", episodeKind: episode.episodeKind, estimatedMinutes: episode.estimatedMinutes, objectiveIds: episode.objectiveIds, skillIds: episode.skillIds, grammarDistinctionIds: episode.grammarDistinctionIds, soundFocusIds: episode.soundFocusIds, assetIds: episode.assetIds, accessibilityRoutes: episode.accessibilityRoutes };
};
describe("Episode validation receipt repository", () => {
    it("rejects invalid semantics without creating an operation", async () => {
        const store = new Store();
        await expect(new episode_validation_repository_1.EpisodeValidationRepository(store, { actorId: "validator-1" }).validate(ref, "validate", "v-1")).rejects.toThrow("episode_validation_failed");
        expect(store.operation).toBeUndefined();
    });
    it("issues a passed receipt and replays the exact operation", async () => {
        const store = new Store();
        store.body = validBody();
        const repo = new episode_validation_repository_1.EpisodeValidationRepository(store, { actorId: "validator-1" });
        const receipt = await repo.validate(ref, "validate", "v-2");
        expect(receipt.status).toBe("passed");
        await expect(repo.validate(ref, "validate", "v-2")).resolves.toEqual(receipt);
    });
});
//# sourceMappingURL=episode_validation_repository.test.js.map