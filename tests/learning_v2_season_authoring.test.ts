import {
  assertSeasonEnvironmentEligible,
  cloneSeasonDraft,
  createSeasonDraft,
  materializeSeasonGates,
  pinApprovedEpisodeRevisions,
  resolveSeasonDecisionSettings,
  type ApprovedEpisodeRevision,
} from "../modules/learning-v2/authoring/season_draft";

const approved = (ordinal: number): ApprovedEpisodeRevision => ({
  draftId: `draft-ep-${ordinal}`,
  episodeId: `ep-${String(ordinal).padStart(2, "0")}`,
  revision: 1,
  revisionFingerprint: `fingerprint-${ordinal}`,
  contentHash: `${String(ordinal).padStart(2, "0")}${"a".repeat(62)}`,
  ordinal,
  chapterId: `chapter-${Math.ceil(ordinal / 8)}`,
  approvalStatus: "approved",
});

const registry = (missing?: string) =>
  ({
    body: {
      schemaVersion: "v2-decision-registry-body.v1",
      registryId: "phraseman-v2-product-decisions",
      version: 1,
      decisions: Object.fromEntries(
        [
          "HYP-V2-001",
          "HYP-V2-002",
          "HYP-V2-003",
          "HYP-V2-004",
          "HYP-V2-005",
          "HYP-V2-006",
          "HYP-V2-007",
          "HYP-V2-008",
        ]
          .filter((id) => id !== missing)
          .map((id) => [id, { decisionId: id, settings: {} }]),
      ),
    },
    record: { ref: { id: "registry", version: 1, contentHash: "" } },
  }) as never;

const policyCatalog = { version: "v2-gates-1" } as never;

describe("V2 season authoring", () => {
  it("validates vertical, chapter and full-season composition", () => {
    const slice = pinApprovedEpisodeRevisions(
      createSeasonDraft({
        draftId: "draft-slice",
        seasonId: "season-slice",
        scope: "vertical_slice",
      }),
      [approved(1)],
      policyCatalog,
    );
    expect(slice.body.releaseScope.kind).toBe("vertical_slice");
    expect(slice.body.gates).toEqual([]);
    expect(() => assertSeasonEnvironmentEligible(slice, "production")).toThrow(
      "season_scope_not_production_eligible",
    );

    const chapter = pinApprovedEpisodeRevisions(
      createSeasonDraft({
        draftId: "draft-chapter",
        seasonId: "season-chapter",
        scope: "chapter_internal",
      }),
      Array.from({ length: 8 }, (_, index) => approved(index + 1)),
      policyCatalog,
    );
    expect(chapter.body.gates).toHaveLength(7);
    expect(chapter.body.chapters[0]?.checkpointEpisodeId).toBe("ep-08");

    const full = pinApprovedEpisodeRevisions(
      createSeasonDraft({
        draftId: "draft-full",
        seasonId: "season-full",
        scope: "full_season",
      }),
      Array.from({ length: 32 }, (_, index) => approved(index + 1)),
      policyCatalog,
    );
    expect(full.body.episodeRevisionRefs).toHaveLength(32);
    expect(
      full.body.chapters.map((chapterItem) => chapterItem.episodeIds.length),
    ).toEqual([8, 8, 8, 8]);
    expect(
      full.body.chapters.map((chapterItem) => chapterItem.checkpointEpisodeId),
    ).toEqual(["ep-08", "ep-16", "ep-24", "ep-32"]);
    expect(full.body.gates).toEqual(
      materializeSeasonGates(
        full.body.episodeRevisionRefs,
        full.body.gatePolicyVersion,
      ),
    );
    expect(() => assertSeasonEnvironmentEligible(full, "production")).toThrow(
      "season_decision_registry_unresolved",
    );
  });

  it("rejects stale/unapproved refs and incomplete decision registries, and clones cleanly", () => {
    const draft = createSeasonDraft({
      draftId: "draft",
      seasonId: "season",
      scope: "vertical_slice",
    });
    expect(() =>
      pinApprovedEpisodeRevisions(
        draft,
        [{ ...approved(1), approvalStatus: "draft" }],
        policyCatalog,
      ),
    ).toThrow("season_episode_revision_not_approved_or_stale");
    const pinned = pinApprovedEpisodeRevisions(
      draft,
      [approved(1)],
      policyCatalog,
    );
    expect(() =>
      pinApprovedEpisodeRevisions(draft, [approved(1)], {
        version: "v2-gates-1",
        resolveEpisodeRevision: () => false,
      }),
    ).toThrow("season_episode_revision_not_approved_or_stale");
    expect(() =>
      resolveSeasonDecisionSettings(pinned.body, registry("HYP-V2-008")),
    ).toThrow("season_decision_registry_incomplete_or_mismatched");
    const clone = cloneSeasonDraft(pinned, {
      draftId: "draft-clone",
      seasonId: "season-clone",
    });
    expect(clone).toMatchObject({
      record: { revision: 1, status: "draft" },
      body: { draftId: "draft-clone", seasonId: "season-clone" },
    });
    expect(clone.record.fingerprint).not.toBe(pinned.record.fingerprint);
  });
});
