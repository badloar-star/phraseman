"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateEpisodeGraph = void 0;
exports.createEpisodeDraft = createEpisodeDraft;
exports.addActivityInstance = addActivityInstance;
exports.removeActivityInstance = removeActivityInstance;
exports.addEpisodeGraphNode = addEpisodeGraphNode;
exports.removeEpisodeGraphNode = removeEpisodeGraphNode;
exports.connectEpisodeGraphNodes = connectEpisodeGraphNodes;
exports.validateEpisodeDraft = validateEpisodeDraft;
exports.mutateEpisodeDraft = mutateEpisodeDraft;
exports.cloneEpisodeDraft = cloneEpisodeDraft;
const decision_registry_1 = require("../policies/decision_registry");
const episode_graph_1 = require("./episode_graph");
var episode_graph_2 = require("./episode_graph");
Object.defineProperty(exports, "validateEpisodeGraph", { enumerable: true, get: function () { return episode_graph_2.validateEpisodeGraph; } });
const fingerprint = (body, revision) => (0, decision_registry_1.hashCanonicalBody)({
    draftId: body.draftId,
    revision,
    contentHash: (0, decision_registry_1.hashCanonicalBody)(body),
});
const jsonSafe = (value) => {
    if (Array.isArray(value))
        return value
            .map((item) => jsonSafe(item))
            .filter((item) => item !== undefined);
    if (value && typeof value === "object") {
        const result = {};
        for (const [key, item] of Object.entries(value))
            if (item !== undefined)
                result[key] = jsonSafe(item);
        return result;
    }
    return value;
};
const persist = (body, revision, status = "draft") => {
    const safeBody = jsonSafe(body);
    return {
        body: safeBody,
        record: {
            schemaVersion: "episode-draft-record.v1",
            draftId: body.draftId,
            episodeId: body.episodeId,
            revision,
            contentHash: (0, decision_registry_1.hashCanonicalBody)(safeBody),
            fingerprint: fingerprint(safeBody, revision),
            status,
        },
    };
};
function createEpisodeDraft(input) {
    const body = {
        ...input,
        schemaVersion: "episode-draft-body.v1",
        activities: [],
        graph: (0, episode_graph_1.createEmptyEpisodeGraph)(),
    };
    return persist(body, 1);
}
function addActivityInstance(draft, activity) {
    if (draft.body.activities.some((item) => item.activityId === activity.activityId))
        throw new Error("episode_activity_id_duplicate");
    return persist({ ...draft.body, activities: [...draft.body.activities, activity] }, draft.record.revision + 1);
}
function removeActivityInstance(draft, activityId) {
    if (draft.body.graph.nodes.some((node) => node.activityId === activityId))
        throw new Error("episode_activity_has_nodes");
    return persist({
        ...draft.body,
        activities: draft.body.activities.filter((item) => item.activityId !== activityId),
    }, draft.record.revision + 1);
}
function addEpisodeGraphNode(draft, node) {
    if (!draft.body.activities.some((activity) => activity.activityId === node.activityId))
        throw new Error("episode_node_activity_missing");
    return persist({ ...draft.body, graph: (0, episode_graph_1.addEpisodeGraphNode)(draft.body, node).graph }, draft.record.revision + 1);
}
function removeEpisodeGraphNode(draft, nodeId) {
    return persist({ ...draft.body, graph: (0, episode_graph_1.removeEpisodeGraphNode)(draft.body, nodeId).graph }, draft.record.revision + 1);
}
function connectEpisodeGraphNodes(draft, edge) {
    return persist({ ...draft.body, graph: (0, episode_graph_1.connectEpisodeGraphNodes)(draft.body, edge).graph }, draft.record.revision + 1);
}
function validateEpisodeDraft(draft) {
    const issues = (0, episode_graph_1.validateEpisodeGraph)(draft);
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
    if (Object.keys(body).some((key) => !allowedBodyKeys.has(key)))
        issues.push("episode_body_unknown_field");
    if (body.sessionSetRef) {
        const ref = body.sessionSetRef;
        if (ref.episodeId !== body.episodeId ||
            !Number.isSafeInteger(ref.version) ||
            ref.version < 1 ||
            !/^[a-f0-9]{64}$/.test(ref.contentHash))
            issues.push("episode_session_set_ref_invalid");
    }
    if (body.starSlots) {
        if (body.starSlots.length !== 8 ||
            body.starSlots.some((slot) => slot.maxStars !== 3 || slot.acceptedNodeIds.length === 0))
            issues.push("episode_star_slot_contract_invalid");
        const nodeIds = new Set(body.graph.nodes.map((node) => node.nodeId));
        if (body.starSlots.some((slot) => slot.acceptedNodeIds.some((nodeId) => !nodeIds.has(nodeId))))
            issues.push("episode_star_slot_node_missing");
    }
    const nodeMap = new Map(body.graph.nodes.map((node) => [node.nodeId, node]));
    for (const nodeId of [
        ...(body.requiredLoops?.encounterBuildNodeIds ?? []),
        ...(body.requiredLoops?.nearTransferNodeIds ?? []),
    ])
        if (!nodeMap.has(nodeId))
            issues.push("episode_required_loop_node_missing");
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
        if (loopIds.has(nodeId))
            issues.push("episode_independent_probe_in_loop");
    }
    for (const delayed of body.delayedProbeDefinitions ?? [])
        if (delayed.body?.probeNodeId && nodeMap.has(delayed.body.probeNodeId))
            issues.push("episode_delayed_probe_in_graph");
    return [...new Set(issues)];
}
function mutateEpisodeDraft(current, expectedRevision, expectedFingerprint, mutate) {
    if (current.record.revision !== expectedRevision ||
        current.record.fingerprint !== expectedFingerprint)
        throw new Error("authoring_revision_stale");
    if (current.record.status !== "draft")
        throw new Error("authoring_published_immutable");
    const nextBody = mutate(current.body);
    if (nextBody.draftId !== current.body.draftId ||
        nextBody.episodeId !== current.body.episodeId ||
        nextBody.seasonId !== current.body.seasonId ||
        nextBody.schemaVersion !== current.body.schemaVersion)
        throw new Error("episode_identity_immutable");
    return persist(nextBody, current.record.revision + 1);
}
function cloneEpisodeDraft(current, ids) {
    const activityIds = new Map();
    const activities = current.body.activities.map((activity, index) => {
        const id = `${ids.episodeId}-activity-${index + 1}`;
        activityIds.set(activity.activityId, id);
        return { ...activity, activityId: id };
    });
    const nodeIds = new Map();
    current.body.graph.nodes.forEach((node, index) => nodeIds.set(node.nodeId, `${ids.episodeId}-node-${index + 1}`));
    const nodes = current.body.graph.nodes.map((node) => {
        const id = nodeIds.get(node.nodeId) ?? `${ids.episodeId}-node-unknown`;
        return {
            ...node,
            nodeId: id,
            activityId: activityIds.get(node.activityId) ?? node.activityId,
            fallback: node.fallback?.policy === "alternate_node"
                ? {
                    ...node.fallback,
                    alternateNodeId: nodeIds.get(node.fallback.alternateNodeId ?? "") ??
                        node.fallback.alternateNodeId,
                }
                : node.fallback,
        };
    });
    const graph = {
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
    const remapValue = (value) => {
        if (Array.isArray(value))
            return value.map(remapValue);
        if (!value || typeof value !== "object")
            return value;
        const output = {};
        for (const [key, item] of Object.entries(value)) {
            const shouldRemap = /(?:nodeId|activityId|edgeId|starSlotId|probeId|checkpointEpisodeId|targetEpisodeId|sourceEpisodeId|repairNodeId|reassessmentNodeId|primaryNodeId|alternateNodeId|independentProbeRef|delayedProbeRef|acceptedNodeIds|encounterBuildNodeIds|nearTransferNodeIds|independentProbeNodeIds|optionalReviewNodeIds)$/.test(key);
            if (shouldRemap && Array.isArray(item))
                output[key] = item.map((entry) => typeof entry === "string"
                    ? (nodeIds.get(entry) ?? activityIds.get(entry) ?? entry)
                    : remapValue(entry));
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
    });
    return persist({ ...remappedBody, provenance: { basedOn: current.record.fingerprint } }, 1);
}
//# sourceMappingURL=episode_draft.js.map