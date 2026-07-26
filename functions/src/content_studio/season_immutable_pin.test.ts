import {
  createSeasonDraft,
  pinApprovedEpisodeRevisions,
  validateSeasonImmutablePin,
  type ApprovedEpisodeRevision,
  type SeasonDraft,
} from "../../../modules/learning-v2/authoring/season_draft";

const ref: ApprovedEpisodeRevision = {
  draftId: "episode-draft-1",
  episodeId: "episode-1",
  revision: 1,
  revisionFingerprint: "a".repeat(64),
  contentHash: "b".repeat(64),
  ordinal: 1,
  chapterId: "chapter-01",
  approvalStatus: "approved",
};

function validPin(): SeasonDraft {
  const draft = createSeasonDraft({
    draftId: "season-draft-1",
    seasonId: "season-1",
    scope: "vertical_slice",
    decisionRegistryRef: {
      id: "phraseman-v2-product-decisions",
      version: 1,
      contentHash: "c".repeat(64),
    },
  });
  const pinned = pinApprovedEpisodeRevisions(draft, [ref], {
    version: "v2-gates-1",
  });
  return {
    body: pinned.body,
    record: { ...pinned.record, status: "approved" },
  };
}

describe("strict immutable Season pin validator", () => {
  it("accepts a canonical approved body/record pair", () => {
    expect(validateSeasonImmutablePin(validPin())).toBe(true);
  });

  it.each([
    ["body hash", (pin: SeasonDraft) => ({ ...pin, record: { ...pin.record, contentHash: "d".repeat(64) } })],
    ["fingerprint", (pin: SeasonDraft) => ({ ...pin, record: { ...pin.record, fingerprint: "e".repeat(64) } })],
    ["status", (pin: SeasonDraft) => ({ ...pin, record: { ...pin.record, status: "draft" as const } })],
    ["record extra field", (pin: SeasonDraft) => ({ ...pin, record: { ...pin.record, unexpected: true } as SeasonDraft["record"] })],
    ["body extra field", (pin: SeasonDraft) => ({ ...pin, body: { ...pin.body, unexpected: true } as SeasonDraft["body"] })],
  ])("rejects a tampered %s", (_label, mutate) => {
    expect(validateSeasonImmutablePin(mutate(validPin()))).toBe(false);
  });
});
