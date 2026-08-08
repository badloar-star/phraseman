"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const episode_localization_repository_1 = require("./episode_localization_repository");
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
describe("Episode localization receipt repository", () => {
    it("fails closed before issuing an approved localization receipt", async () => {
        const store = new Store();
        await expect(new episode_localization_repository_1.EpisodeLocalizationRepository(store, { actorId: "localizer-1" }).approve(ref, "localize", "l-1")).rejects.toThrow("episode_localization_failed");
        expect(store.operation).toBeUndefined();
    });
});
//# sourceMappingURL=episode_localization_repository.test.js.map