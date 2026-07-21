"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const episode_voice_repository_1 = require("./episode_voice_repository");
const ref = { draftId: "draft-1", episodeId: "episode-1", revision: 1, revisionFingerprint: "a".repeat(64), contentHash: "b".repeat(64), ordinal: 1, chapterId: "chapter-1", approvalStatus: "approved" };
class Store {
    constructor() {
        this.body = { voiceGovernance: { requirementsByTemplate: [{ requirements: { processingMode: "network_allowed" } }] } };
    }
    async runTransaction(work) { return work(this); }
    async readArtifact() { return { body: this.body }; }
    async writeReceipt() { }
    async readOperation() { return this.operation; }
    async createOperation(_id, value) { this.operation = value; }
}
describe("Episode voice governance receipt repository", () => {
    it("fails closed for an incomplete network requirement", async () => {
        const store = new Store();
        await expect(new episode_voice_repository_1.EpisodeVoiceGovernanceRepository(store, { actorId: "voice-reviewer-1" }).approve(ref, "voice", "voice-1")).rejects.toThrow("episode_voice_governance_invalid");
        expect(store.operation).toBeUndefined();
    });
});
//# sourceMappingURL=episode_voice_repository.test.js.map