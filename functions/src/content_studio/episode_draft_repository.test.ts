import { InMemoryEpisodeDraftRepository } from "./episode_draft_repository";

describe("episode draft repository", () => {
  it("rejects stale mutable heads", () => {
    const repository = new InMemoryEpisodeDraftRepository();
    const first = repository.create({
      draftId: "draft-1",
      episodeId: "ep-1",
      seasonId: "season-1",
      ordinal: 1,
      chapterId: "chapter-1",
    });
    expect(() =>
      repository.save(first, {
        expectedRevision: 99,
        expectedFingerprint: first.record.fingerprint,
      }),
    ).toThrow("authoring_revision_stale");
    expect(repository.get("draft-1")).toEqual(first);
  });
});
