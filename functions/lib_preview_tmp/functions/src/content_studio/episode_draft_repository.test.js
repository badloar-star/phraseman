"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const episode_draft_repository_1 = require("./episode_draft_repository");
describe("episode draft repository", () => {
    it("rejects stale mutable heads", () => {
        const repository = new episode_draft_repository_1.InMemoryEpisodeDraftRepository();
        const first = repository.create({
            draftId: "draft-1",
            episodeId: "ep-1",
            seasonId: "season-1",
            ordinal: 1,
            chapterId: "chapter-1",
        });
        expect(() => repository.save(first, {
            expectedRevision: 99,
            expectedFingerprint: first.record.fingerprint,
        })).toThrow("authoring_revision_stale");
        expect(repository.get("draft-1")).toEqual(first);
    });
});
//# sourceMappingURL=episode_draft_repository.test.js.map