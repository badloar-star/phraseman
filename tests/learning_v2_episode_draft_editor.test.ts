import {
  addActivityInstance,
  addEpisodeGraphNode,
  cloneEpisodeDraft,
  connectEpisodeGraphNodes,
  createEpisodeDraft,
  removeActivityInstance,
  removeEpisodeGraphNode,
  validateEpisodeDraft,
  validateEpisodeGraph,
  type EpisodeDraft,
} from "../modules/learning-v2/authoring/episode_draft";

const activity = (activityId: string) =>
  ({ activityId, family: "phrase_builder" }) as never;
const node = (nodeId: string, activityId: string) =>
  ({
    nodeId,
    activityId,
    position: 0,
    visible: true,
    requiredForCore: true,
    voiceEvidenceOptional: false,
    phase: "encounter_build",
    evidenceDeclarations: [],
    pedagogicalContextContract: undefined,
    gateEligible: true,
    starSlotId: `slot-${nodeId}`,
    maxStars: 3,
  }) as never;

const emptyDraft = (): EpisodeDraft =>
  createEpisodeDraft({
    draftId: "draft-ep-01",
    episodeId: "ep-01",
    seasonId: "season-01",
    ordinal: 1,
    chapterId: "chapter-01",
  });

describe("V2 episode authoring graph", () => {
  it("keeps activity content separate from graph-owned route and reward fields", () => {
    const withActivity = addActivityInstance(
      emptyDraft(),
      activity("activity-1"),
    );
    const withPrimary = addEpisodeGraphNode(
      withActivity,
      node("node-1", "activity-1"),
    );
    const withAlternate = addEpisodeGraphNode(
      withPrimary,
      node("node-2", "activity-1"),
    );
    const branched = connectEpisodeGraphNodes(withAlternate, {
      edgeId: "edge-1",
      fromNodeId: "node-1",
      toNodeId: "node-2",
      condition: "fallback_selected",
    });
    expect(validateEpisodeGraph(branched)).toEqual([]);
    expect(() => removeEpisodeGraphNode(branched, "node-2")).toThrow(
      "episode_node_has_edges",
    );
    expect(() => removeActivityInstance(branched, "activity-1")).toThrow(
      "episode_activity_has_nodes",
    );
  });

  it("clones all graph-owned identifiers and remaps edges", () => {
    const source = connectEpisodeGraphNodes(
      addEpisodeGraphNode(
        addEpisodeGraphNode(
          addActivityInstance(emptyDraft(), activity("activity-1")),
          node("node-1", "activity-1"),
        ),
        node("node-2", "activity-1"),
      ),
      {
        edgeId: "edge-1",
        fromNodeId: "node-1",
        toNodeId: "node-2",
        condition: "completed",
      },
    );
    const clone = cloneEpisodeDraft(source, {
      draftId: "draft-ep-02",
      episodeId: "ep-02",
      ordinal: 2,
    });
    expect(clone.record.revision).toBe(1);
    expect(clone.body.episodeId).toBe("ep-02");
    expect(clone.body.activities[0]?.activityId).not.toBe("activity-1");
    expect(clone.body.graph.nodes.map((item) => item.nodeId)).not.toEqual([
      "node-1",
      "node-2",
    ]);
    expect(clone.body.graph.edges[0]?.fromNodeId).toBe(
      clone.body.graph.nodes[0]?.nodeId,
    );
  });

  it("preserves a valid source session pin but requires a clone to compile its own", () => {
    const source = {
      ...emptyDraft(),
      body: {
        ...emptyDraft().body,
        sessionSetRef: {
          episodeId: "ep-01",
          version: 1,
          contentHash: "a".repeat(64),
        },
      },
    } as EpisodeDraft;
    expect(validateEpisodeDraft(source)).not.toContain("episode_session_set_ref_invalid");
    expect(validateEpisodeDraft({
      ...source,
      body: {
        ...source.body,
        sessionSetRef: { ...source.body.sessionSetRef!, episodeId: "another-episode" },
      },
    })).toContain("episode_session_set_ref_invalid");

    const clone = cloneEpisodeDraft(source, {
      draftId: "draft-ep-02",
      episodeId: "ep-02",
      ordinal: 2,
    });
    expect(clone.body.sessionSetRef).toBeUndefined();
  });
});
