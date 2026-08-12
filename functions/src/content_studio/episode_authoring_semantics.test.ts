import { readFileSync } from "node:fs";
import path from "node:path";
import { normalizeAuthoringEpisodeForSemantics } from "./episode_authoring_semantics";

const canonicalFixture = JSON.parse(
  readFileSync(
    path.resolve(__dirname, "../../../tests/fixtures/learning-v2/episode-01.valid.json"),
    "utf8",
  ),
) as { episode: Record<string, unknown> };

const authoringFixture = (): Record<string, unknown> => {
  const episode = JSON.parse(JSON.stringify(canonicalFixture.episode)) as Record<string, unknown>;
  return {
    schemaVersion: "episode-authoring-body.v1",
    draftId: "draft-episode-01",
    episodeId: episode.episodeId,
    revision: 1,
    seasonId: episode.seasonId,
    ordinal: episode.ordinal,
    chapterId: episode.chapterId,
    studyTarget: "en",
    learnerSourceLocale: "ru",
    title: episode.title,
    canDoOutcome: episode.canDoOutcome,
    scenario: episode.scenario,
    phraseFrames: episode.phraseFrames,
    semanticSlots: episode.semanticSlots,
    criticalConstraints: episode.criticalConstraints,
    contentUnits: {},
    activityInstances: episode.activities,
    delayedProbeDefinitions: episode.delayedProbeDefinitions,
    graph: episode.graph,
    starSlots: episode.starSlots,
    requiredLoops: episode.requiredLoops,
    assessmentNodes: episode.assessmentNodes,
    capstoneContract: episode.capstoneContract,
    masteryContract: episode.masteryContract,
    learningDesign: episode.learningDesign,
    voiceGovernance: { requirementsByTemplate: [] },
    reviewLinks: episode.reviewLinks,
    minAppVersion: "1.0.0",
    episodeKind: episode.episodeKind,
    estimatedMinutes: episode.estimatedMinutes,
    objectiveIds: episode.objectiveIds,
    skillIds: episode.skillIds,
    grammarDistinctionIds: episode.grammarDistinctionIds,
    soundFocusIds: episode.soundFocusIds,
    assetIds: episode.assetIds,
    accessibilityRoutes: episode.accessibilityRoutes,
    ...(episode.checkpointContract === undefined ? {} : { checkpointContract: episode.checkpointContract }),
  };
};

describe("authoring Episode semantic bridge", () => {
  it("accepts the canonical E1 semantics without silently dropping projection fields", () => {
    const result = normalizeAuthoringEpisodeForSemantics(authoringFixture());
    expect(result.ok).toBe(true);
  });

  it("rejects an authoring body missing an explicit canonical projection", () => {
    const body = authoringFixture();
    delete body.accessibilityRoutes;
    const result = normalizeAuthoringEpisodeForSemantics(body);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues[0]?.code).toBe("authoring_semantic_projection_missing");
  });

  it("forwards delayed-probe mutations to the canonical validator", () => {
    const body = authoringFixture();
    const delayed = body.delayedProbeDefinitions as Array<Record<string, unknown>>;
    const first = delayed[0];
    const firstBody = first.body as Record<string, unknown>;
    first.body = { ...firstBody, contentHash: "f".repeat(64) };
    const result = normalizeAuthoringEpisodeForSemantics(body);
    expect(result.ok).toBe(false);
  });

  it("projects a pinned session set into the strict Episode v2 contract", () => {
    const body = {
      ...authoringFixture(),
      estimatedMinutes: 30,
      sessionSetRef: {
        episodeId: canonicalFixture.episode.episodeId,
        version: 1,
        contentHash: "a".repeat(64),
      },
    };
    const result = normalizeAuthoringEpisodeForSemantics(body);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toMatchObject({
        schemaVersion: "v2-episode-contract.v2",
        sessionSetRef: body.sessionSetRef,
      });
    }
  });

  it("does not silently downgrade an invalid pinned session set to Episode v1", () => {
    const result = normalizeAuthoringEpisodeForSemantics({
      ...authoringFixture(),
      estimatedMinutes: 30,
      sessionSetRef: {
        episodeId: "another-episode",
        version: 1,
        contentHash: "a".repeat(64),
      },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.some((issue) => issue.code === "episode_session_set_ref_invalid")).toBe(true);
    }
  });
});
