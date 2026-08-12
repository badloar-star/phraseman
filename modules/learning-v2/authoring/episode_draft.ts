import { hashCanonicalBody } from "../policies/decision_registry";
import {
  addEpisodeGraphNode as addNode,
  connectEpisodeGraphNodes as connect,
  createEmptyEpisodeGraph,
  removeEpisodeGraphNode as removeNode,
  type ActivityInstance,
  type EpisodeGraph,
  type EpisodeGraphEdge,
  type EpisodeGraphNode,
  validateEpisodeGraph,
} from "./episode_graph";

export { validateEpisodeGraph } from "./episode_graph";

export interface EpisodeDraftBody {
  readonly schemaVersion: "episode-draft-body.v1";
  readonly draftId: string;
  readonly episodeId: string;
  readonly seasonId: string;
  readonly ordinal: number;
  readonly chapterId: string;
  readonly activities: readonly ActivityInstance[];
  readonly graph: EpisodeGraph;
  readonly title?: unknown;
  readonly canDoOutcome?: unknown;
  readonly scenario?: unknown;
  readonly objectiveIds?: readonly string[];
  readonly skillIds?: readonly string[];
  readonly phraseFrames?: readonly unknown[];
  readonly semanticSlots?: readonly unknown[];
  readonly criticalConstraints?: readonly unknown[];
  readonly starSlots?: readonly {
    readonly starSlotId: string;
    readonly acceptedNodeIds: readonly string[];
    readonly maxStars: number;
  }[];
  readonly requiredLoops?: {
    readonly encounterBuildNodeIds?: readonly string[];
    readonly nearTransferNodeIds?: readonly string[];
  };
  readonly assessmentNodes?: {
    readonly independentProbeNodeIds?: readonly string[];
    readonly optionalReviewNodeIds?: readonly string[];
  };
  readonly capstoneContract?: unknown;
  readonly learningDesign?: unknown;
  readonly masteryContract?: unknown;
  readonly delayedProbeDefinitions?: readonly {
    readonly body?: { readonly probeNodeId?: string };
  }[];
  readonly reviewLinks?: readonly unknown[];
  readonly checkpointContract?: unknown;
  readonly sessionSetRef?: {
    readonly episodeId: string;
    readonly version: number;
    readonly contentHash: string;
  };
  readonly voiceGovernance?: unknown;
  readonly assetIds?: readonly string[];
  readonly contentUnitIds?: readonly string[];
  readonly studyTarget?: unknown;
  readonly provenance?: { readonly basedOn?: string };
  readonly [key: string]: unknown;
}

export interface EpisodeDraftRecord {
  readonly schemaVersion: "episode-draft-record.v1";
  readonly draftId: string;
  readonly episodeId: string;
  readonly revision: number;
  readonly contentHash: string;
  readonly fingerprint: string;
  readonly status: "draft" | "approved" | "released";
}

export interface EpisodeDraft {
  readonly body: EpisodeDraftBody;
  readonly record: EpisodeDraftRecord;
}

const fingerprint = (body: EpisodeDraftBody, revision: number): string =>
  hashCanonicalBody({
    draftId: body.draftId,
    revision,
    contentHash: hashCanonicalBody(body),
  });
const jsonSafe = <T>(value: T): T => {
  if (Array.isArray(value))
    return value
      .map((item) => jsonSafe(item))
      .filter((item) => item !== undefined) as T;
  if (value && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>))
      if (item !== undefined) result[key] = jsonSafe(item);
    return result as T;
  }
  return value;
};
const persist = (
  body: EpisodeDraftBody,
  revision: number,
  status: EpisodeDraftRecord["status"] = "draft",
): EpisodeDraft => {
  const safeBody = jsonSafe(body);
  return {
    body: safeBody,
    record: {
      schemaVersion: "episode-draft-record.v1",
      draftId: body.draftId,
      episodeId: body.episodeId,
      revision,
      contentHash: hashCanonicalBody(safeBody),
      fingerprint: fingerprint(safeBody, revision),
      status,
    },
  };
};

export function createEpisodeDraft(
  input: Pick<
    EpisodeDraftBody,
    "draftId" | "episodeId" | "seasonId" | "ordinal" | "chapterId"
  >,
): EpisodeDraft {
  const body: EpisodeDraftBody = {
    ...input,
    schemaVersion: "episode-draft-body.v1",
    activities: [],
    graph: createEmptyEpisodeGraph(),
  };
  return persist(body, 1);
}

export function addActivityInstance(
  draft: EpisodeDraft,
  activity: ActivityInstance,
): EpisodeDraft {
  if (
    draft.body.activities.some(
      (item) => item.activityId === activity.activityId,
    )
  )
    throw new Error("episode_activity_id_duplicate");
  return persist(
    { ...draft.body, activities: [...draft.body.activities, activity] },
    draft.record.revision + 1,
  );
}

export function removeActivityInstance(
  draft: EpisodeDraft,
  activityId: string,
): EpisodeDraft {
  if (draft.body.graph.nodes.some((node) => node.activityId === activityId))
    throw new Error("episode_activity_has_nodes");
  return persist(
    {
      ...draft.body,
      activities: draft.body.activities.filter(
        (item) => item.activityId !== activityId,
      ),
    },
    draft.record.revision + 1,
  );
}

export function addEpisodeGraphNode(
  draft: EpisodeDraft,
  node: EpisodeGraphNode,
): EpisodeDraft {
  if (
    !draft.body.activities.some(
      (activity) => activity.activityId === node.activityId,
    )
  )
    throw new Error("episode_node_activity_missing");
  return persist(
    { ...draft.body, graph: addNode(draft.body, node).graph },
    draft.record.revision + 1,
  );
}

export function removeEpisodeGraphNode(
  draft: EpisodeDraft,
  nodeId: string,
): EpisodeDraft {
  return persist(
    { ...draft.body, graph: removeNode(draft.body, nodeId).graph },
    draft.record.revision + 1,
  );
}

export function connectEpisodeGraphNodes(
  draft: EpisodeDraft,
  edge: EpisodeGraphEdge,
): EpisodeDraft {
  return persist(
    { ...draft.body, graph: connect(draft.body, edge).graph },
    draft.record.revision + 1,
  );
}

export function validateEpisodeDraft(draft: EpisodeDraft): string[] {
  const issues = validateEpisodeGraph(draft);
  const body = draft.body;
  const allowedBodyKeys = new Set([
    "schemaVersion",
    "draftId",
    "episodeId",
    "seasonId",
    "ordinal",
    "chapterId",
    "activities",
    "graph",
    "title",
    "canDoOutcome",
    "scenario",
    "objectiveIds",
    "skillIds",
    "phraseFrames",
    "semanticSlots",
    "criticalConstraints",
    "starSlots",
    "requiredLoops",
    "assessmentNodes",
    "capstoneContract",
    "learningDesign",
    "masteryContract",
    "delayedProbeDefinitions",
    "reviewLinks",
    "checkpointContract",
    "sessionSetRef",
    "voiceGovernance",
    "assetIds",
    "contentUnitIds",
    "studyTarget",
    "provenance",
  ]);
  if (
    Object.keys(body as unknown as Record<string, unknown>).some(
      (key) => !allowedBodyKeys.has(key),
    )
  )
    issues.push("episode_body_unknown_field");
  if (body.sessionSetRef) {
    const ref = body.sessionSetRef;
    if (
      ref.episodeId !== body.episodeId ||
      !Number.isSafeInteger(ref.version) ||
      ref.version < 1 ||
      !/^[a-f0-9]{64}$/.test(ref.contentHash)
    )
      issues.push("episode_session_set_ref_invalid");
  }
  if (body.starSlots) {
    if (
      body.starSlots.length !== 8 ||
      body.starSlots.some(
        (slot) => slot.maxStars !== 3 || slot.acceptedNodeIds.length === 0,
      )
    )
      issues.push("episode_star_slot_contract_invalid");
    const nodeIds = new Set(body.graph.nodes.map((node) => node.nodeId));
    if (
      body.starSlots.some((slot) =>
        slot.acceptedNodeIds.some((nodeId) => !nodeIds.has(nodeId)),
      )
    )
      issues.push("episode_star_slot_node_missing");
  }
  const nodeMap = new Map(body.graph.nodes.map((node) => [node.nodeId, node]));
  for (const nodeId of [
    ...(body.requiredLoops?.encounterBuildNodeIds ?? []),
    ...(body.requiredLoops?.nearTransferNodeIds ?? []),
  ])
    if (!nodeMap.has(nodeId)) issues.push("episode_required_loop_node_missing");
  for (const nodeId of body.requiredLoops?.encounterBuildNodeIds ?? [])
    if (nodeMap.get(nodeId)?.phase !== "encounter_build")
      issues.push("episode_required_loop_phase_mismatch");
  for (const nodeId of body.requiredLoops?.nearTransferNodeIds ?? [])
    if (nodeMap.get(nodeId)?.phase !== "near_transfer")
      issues.push("episode_required_loop_phase_mismatch");
  const loopIds = new Set([
    ...(body.requiredLoops?.encounterBuildNodeIds ?? []),
    ...(body.requiredLoops?.nearTransferNodeIds ?? []),
  ]);
  for (const nodeId of body.assessmentNodes?.independentProbeNodeIds ?? []) {
    if (nodeMap.get(nodeId)?.phase !== "independent_probe")
      issues.push("episode_assessment_phase_mismatch");
    if (loopIds.has(nodeId)) issues.push("episode_independent_probe_in_loop");
  }
  for (const delayed of body.delayedProbeDefinitions ?? [])
    if (delayed.body?.probeNodeId && nodeMap.has(delayed.body.probeNodeId))
      issues.push("episode_delayed_probe_in_graph");
  return [...new Set(issues)];
}

export function mutateEpisodeDraft(
  current: EpisodeDraft,
  expectedRevision: number,
  expectedFingerprint: string,
  mutate: (body: EpisodeDraftBody) => EpisodeDraftBody,
): EpisodeDraft {
  if (
    current.record.revision !== expectedRevision ||
    current.record.fingerprint !== expectedFingerprint
  )
    throw new Error("authoring_revision_stale");
  if (current.record.status !== "draft")
    throw new Error("authoring_published_immutable");
  const nextBody = mutate(current.body);
  if (
    nextBody.draftId !== current.body.draftId ||
    nextBody.episodeId !== current.body.episodeId ||
    nextBody.seasonId !== current.body.seasonId ||
    nextBody.schemaVersion !== current.body.schemaVersion
  )
    throw new Error("episode_identity_immutable");
  return persist(nextBody, current.record.revision + 1);
}

export function cloneEpisodeDraft(
  current: EpisodeDraft,
  ids: {
    readonly draftId: string;
    readonly episodeId: string;
    readonly ordinal: number;
  },
): EpisodeDraft {
  const activityIds = new Map<string, string>();
  const activities = current.body.activities.map((activity, index) => {
    const id = `${ids.episodeId}-activity-${index + 1}`;
    activityIds.set(activity.activityId, id);
    return { ...activity, activityId: id };
  });
  const nodeIds = new Map<string, string>();
  current.body.graph.nodes.forEach((node, index) =>
    nodeIds.set(node.nodeId, `${ids.episodeId}-node-${index + 1}`),
  );
  const nodes = current.body.graph.nodes.map((node) => {
    const id = nodeIds.get(node.nodeId) ?? `${ids.episodeId}-node-unknown`;
    return {
      ...node,
      nodeId: id,
      activityId: activityIds.get(node.activityId) ?? node.activityId,
      fallback:
        node.fallback?.policy === "alternate_node"
          ? {
              ...node.fallback,
              alternateNodeId:
                nodeIds.get(node.fallback.alternateNodeId ?? "") ??
                node.fallback.alternateNodeId,
            }
          : node.fallback,
    };
  });
  const graph: EpisodeGraph = {
    ...current.body.graph,
    startNodeId: nodeIds.get(current.body.graph.startNodeId) ?? "",
    capstoneNodeId: nodeIds.get(current.body.graph.capstoneNodeId) ?? "",
    nodes,
    edges: current.body.graph.edges.map((edge, index) => ({
      ...edge,
      edgeId: `${ids.episodeId}-edge-${index + 1}`,
      fromNodeId: nodeIds.get(edge.fromNodeId) ?? edge.fromNodeId,
      toNodeId: nodeIds.get(edge.toNodeId) ?? edge.toNodeId,
    })),
  };
  const remapValue = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(remapValue);
    if (!value || typeof value !== "object") return value;
    const output: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(
      value as Record<string, unknown>,
    )) {
      const shouldRemap =
        /(?:nodeId|activityId|edgeId|starSlotId|probeId|checkpointEpisodeId|targetEpisodeId|sourceEpisodeId|repairNodeId|reassessmentNodeId|primaryNodeId|alternateNodeId|independentProbeRef|delayedProbeRef|acceptedNodeIds|encounterBuildNodeIds|nearTransferNodeIds|independentProbeNodeIds|optionalReviewNodeIds)$/.test(
          key,
        );
      if (shouldRemap && Array.isArray(item))
        output[key] = item.map((entry) =>
          typeof entry === "string"
            ? (nodeIds.get(entry) ?? activityIds.get(entry) ?? entry)
            : remapValue(entry),
        );
      else
        output[key] =
          shouldRemap && typeof item === "string"
            ? (nodeIds.get(item) ??
              activityIds.get(item) ??
              (item === current.body.episodeId ? ids.episodeId : item))
            : remapValue(item);
    }
    return output;
  };
  // A session set is compiled for one exact Episode identity/content revision.
  // A clone must compile and pin its own set instead of inheriting the source
  // Episode's otherwise hash-valid authority coordinate.
  const { sessionSetRef: _sourceSessionSetRef, ...cloneableBody } = current.body;
  const remappedBody = remapValue({
    ...cloneableBody,
    draftId: ids.draftId,
    episodeId: ids.episodeId,
    ordinal: ids.ordinal,
    activities,
    graph,
  }) as EpisodeDraftBody;
  return persist(
    { ...remappedBody, provenance: { basedOn: current.record.fingerprint } },
    1,
  );
}
