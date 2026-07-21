"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const firestore_authoring_store_1 = require("./firestore_authoring_store");
describe("Firestore V2 authoring storage paths", () => {
    it("pins draft and immutable revision namespaces", () => {
        expect((0, firestore_authoring_store_1.episodeDraftDocumentPath)("draft-1")).toBe("content_episode_drafts/draft-1");
        expect((0, firestore_authoring_store_1.seasonDraftDocumentPath)("season-draft-1")).toBe("content_season_drafts/season-draft-1");
        expect((0, firestore_authoring_store_1.episodeRevisionDocumentPath)("ep-01", 3)).toBe("content_episode_revisions/ep-01__r3");
        expect((0, firestore_authoring_store_1.decisionRegistryDocumentPath)("registry", 2)).toBe("content_decision_registries/registry__v2");
    });
});
//# sourceMappingURL=firestore_authoring_store.test.js.map