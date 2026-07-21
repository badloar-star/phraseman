"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEmptyEpisodeGraph = createEmptyEpisodeGraph;
exports.addEpisodeGraphNode = addEpisodeGraphNode;
exports.removeEpisodeGraphNode = removeEpisodeGraphNode;
exports.connectEpisodeGraphNodes = connectEpisodeGraphNodes;
exports.disconnectEpisodeGraphNodes = disconnectEpisodeGraphNodes;
exports.validateEpisodeGraph = validateEpisodeGraph;
exports.graphFingerprint = graphFingerprint;
const decision_registry_1 = require("../policies/decision_registry");
const copy = (value) => JSON.parse(JSON.stringify(value));
const has = (values, value) => values.includes(value);
function createEmptyEpisodeGraph() {
    return { startNodeId: "", capstoneNodeId: "", nodes: [], edges: [] };
}
function addEpisodeGraphNode(draft, node) {
    if (draft.graph.nodes.some((item) => item.nodeId === node.nodeId))
        throw new Error("episode_node_id_duplicate");
    if (draft.graph.nodes.some((item) => item.activityId === node.activityId)) {
        // One activity may intentionally appear in more than one route only when the
        // author gives it a distinct graph node; this is allowed. The activity
        // identity is checked against the activity collection by the draft layer.
    }
    const graph = {
        ...draft.graph,
        startNodeId: draft.graph.startNodeId || node.nodeId,
        capstoneNodeId: node.nodeId,
        nodes: [...draft.graph.nodes, copy(node)],
    };
    return { ...draft, graph };
}
function removeEpisodeGraphNode(draft, nodeId) {
    if (draft.graph.edges.some((edge) => edge.fromNodeId === nodeId || edge.toNodeId === nodeId)) {
        throw new Error("episode_node_has_edges");
    }
    if (!has(draft.graph.nodes.map((node) => node.nodeId), nodeId))
        throw new Error("episode_node_not_found");
    const nodes = draft.graph.nodes.filter((node) => node.nodeId !== nodeId);
    return {
        ...draft,
        graph: {
            ...draft.graph,
            nodes,
            startNodeId: nodes[0]?.nodeId ?? "",
            capstoneNodeId: nodes.at(-1)?.nodeId ?? "",
        },
    };
}
function connectEpisodeGraphNodes(draft, edge) {
    const ids = draft.graph.nodes.map((node) => node.nodeId);
    if (!has(ids, edge.fromNodeId) || !has(ids, edge.toNodeId))
        throw new Error("episode_edge_endpoint_missing");
    if (edge.fromNodeId === edge.toNodeId)
        throw new Error("episode_graph_cycle");
    if (draft.graph.edges.some((item) => item.edgeId === edge.edgeId))
        throw new Error("episode_edge_id_duplicate");
    const candidate = {
        ...draft.graph,
        edges: [...draft.graph.edges, copy(edge)],
    };
    if (validateEpisodeGraph({ graph: candidate }).includes("episode_graph_cycle"))
        throw new Error("episode_graph_cycle");
    return { ...draft, graph: candidate };
}
function disconnectEpisodeGraphNodes(draft, edgeId) {
    return {
        ...draft,
        graph: {
            ...draft.graph,
            edges: draft.graph.edges.filter((edge) => edge.edgeId !== edgeId),
        },
    };
}
function validateEpisodeGraph(draft) {
    const issues = [];
    const graph = draft.graph ?? draft.body?.graph;
    if (!graph)
        return ["episode_graph_missing"];
    const nodeIds = graph.nodes.map((node) => node.nodeId);
    if (!graph.startNodeId || !has(nodeIds, graph.startNodeId))
        issues.push("episode_graph_start_missing");
    if (!graph.capstoneNodeId || !has(nodeIds, graph.capstoneNodeId))
        issues.push("episode_graph_capstone_missing");
    if (new Set(nodeIds).size !== nodeIds.length)
        issues.push("episode_node_id_duplicate");
    const starSlotIds = graph.nodes
        .filter((node) => node.gateEligible)
        .map((node) => node.starSlotId ?? "");
    if (new Set(starSlotIds).size !== starSlotIds.length ||
        starSlotIds.some((id) => !id))
        issues.push("episode_star_slot_duplicate");
    if (new Set(graph.edges.map((edge) => edge.edgeId)).size !== graph.edges.length)
        issues.push("episode_edge_id_duplicate");
    const valid = new Set(nodeIds);
    for (const edge of graph.edges) {
        if (!valid.has(edge.fromNodeId) || !valid.has(edge.toNodeId))
            issues.push("episode_edge_endpoint_missing");
        if (edge.fromNodeId === edge.toNodeId)
            issues.push("episode_graph_cycle");
    }
    const adjacency = new Map();
    for (const edge of graph.edges)
        adjacency.set(edge.fromNodeId, [
            ...(adjacency.get(edge.fromNodeId) ?? []),
            edge.toNodeId,
        ]);
    const visiting = new Set();
    const visited = new Set();
    const visit = (nodeId) => {
        if (visiting.has(nodeId)) {
            issues.push("episode_graph_cycle");
            return;
        }
        if (visited.has(nodeId))
            return;
        visiting.add(nodeId);
        for (const next of adjacency.get(nodeId) ?? [])
            visit(next);
        visiting.delete(nodeId);
        visited.add(nodeId);
    };
    if (graph.startNodeId)
        visit(graph.startNodeId);
    if (visited.size !== graph.nodes.length)
        issues.push("episode_graph_unreachable_node");
    if (graph.capstoneNodeId && !visited.has(graph.capstoneNodeId))
        issues.push("episode_graph_capstone_unreachable");
    const activityList = draft.activities ?? draft.body?.activities;
    if (activityList) {
        const activities = new Set(activityList.map((activity) => activity.activityId));
        if (graph.nodes.some((node) => !activities.has(String(node.activityId))))
            issues.push("episode_node_activity_missing");
        const forbidden = [
            "nodeId",
            "phase",
            "requiredForCore",
            "gateEligible",
            "starSlotId",
            "maxStars",
            "fallback",
            "evidenceDeclarations",
        ];
        if (activityList.some((activity) => forbidden.some((key) => Object.prototype.hasOwnProperty.call(activity, key))))
            issues.push("episode_activity_contains_graph_fields");
    }
    for (const node of graph.nodes) {
        const allowedNodeKeys = new Set([
            "nodeId",
            "activityId",
            "position",
            "visible",
            "requiredForCore",
            "voiceEvidenceOptional",
            "phase",
            "evidenceDeclarations",
            "pedagogicalContextContract",
            "gateEligible",
            "starSlotId",
            "maxStars",
            "fallback",
            "transferFromNodeId",
            "variedSemanticSlotIds",
        ]);
        if (Object.keys(node).some((key) => !allowedNodeKeys.has(key)))
            issues.push("episode_graph_node_unknown_field");
        if (node.gateEligible && (!node.starSlotId || node.maxStars !== 3))
            issues.push("episode_star_slot_invalid");
        if (!node.gateEligible && node.maxStars !== 0)
            issues.push("episode_starless_node_invalid");
        if (node.fallback?.policy === "alternate_node" &&
            (!node.fallback.alternateNodeId ||
                !valid.has(node.fallback.alternateNodeId)))
            issues.push("episode_fallback_target_missing");
        if (node.fallback?.policy === "alternate_node" &&
            node.fallback.alternateNodeId === node.nodeId)
            issues.push("episode_fallback_self_reference");
        for (const declaration of node.evidenceDeclarations) {
            if (declaration &&
                typeof declaration === "object" &&
                "phase" in declaration &&
                declaration.phase !== node.phase)
                issues.push("episode_node_evidence_phase_mismatch");
        }
        if (node.phase === "optional_review" &&
            node.evidenceDeclarations.length > 0)
            issues.push("episode_optional_review_evidence_forbidden");
    }
    return [...new Set(issues)];
}
function graphFingerprint(graph) {
    return (0, decision_registry_1.hashCanonicalBody)(graph);
}
//# sourceMappingURL=episode_graph.js.map