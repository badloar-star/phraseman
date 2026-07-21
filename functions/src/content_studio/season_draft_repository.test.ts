import { InMemorySeasonDraftRepository } from "./season_draft_repository";

describe("season draft repository", () => {
  it("keeps immutable head revisions and rejects stale writes", () => {
    const repository = new InMemorySeasonDraftRepository();
    const first = repository.create({
      draftId: "draft-1",
      seasonId: "season-1",
      scope: "vertical_slice",
    });
    expect(() =>
      repository.save(first, {
        expectedRevision: 2,
        expectedFingerprint: first.record.fingerprint,
      }),
    ).toThrow("authoring_revision_stale");
    expect(repository.get("draft-1")).toEqual(first);
  });
});
