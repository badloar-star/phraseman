import {
  decisionRegistryDocumentPath,
  episodeDraftDocumentPath,
  episodeRevisionDocumentPath,
  seasonDraftDocumentPath,
} from "./firestore_authoring_store";

describe("Firestore V2 authoring storage paths", () => {
  it("pins draft and immutable revision namespaces", () => {
    expect(episodeDraftDocumentPath("draft-1")).toBe(
      "content_episode_drafts/draft-1",
    );
    expect(seasonDraftDocumentPath("season-draft-1")).toBe(
      "content_season_drafts/season-draft-1",
    );
    expect(episodeRevisionDocumentPath("ep-01", 3)).toBe(
      "content_episode_revisions/ep-01__r3",
    );
    expect(decisionRegistryDocumentPath("registry", 2)).toBe(
      "content_decision_registries/registry__v2",
    );
  });
});
