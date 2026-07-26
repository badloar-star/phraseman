"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertAcyclicStageGraph = assertAcyclicStageGraph;
exports.stageReadiness = stageReadiness;
function assertAcyclicStageGraph(nodes) {
    const byId = new Map();
    for (const node of nodes) {
        if (byId.has(node.stageId))
            throw new Error('generation_stage_duplicate');
        byId.set(node.stageId, node);
    }
    for (const node of nodes) {
        if (node.prerequisiteStageIds.some((id) => !byId.has(id)))
            throw new Error('generation_stage_dependency_missing');
    }
    const visiting = new Set();
    const visited = new Set();
    const visit = (stageId) => {
        if (visiting.has(stageId))
            throw new Error('generation_stage_cycle');
        if (visited.has(stageId))
            return;
        visiting.add(stageId);
        for (const dependencyId of byId.get(stageId)?.prerequisiteStageIds ?? [])
            visit(dependencyId);
        visiting.delete(stageId);
        visited.add(stageId);
    };
    for (const node of nodes)
        visit(node.stageId);
}
function stageReadiness(nodes, stageId) {
    assertAcyclicStageGraph(nodes);
    const byId = new Map(nodes.map((node) => [node.stageId, node]));
    const node = byId.get(stageId);
    if (!node)
        throw new Error('generation_stage_not_found');
    const blockedBy = node.prerequisiteStageIds.filter((id) => byId.get(id)?.state !== 'approved');
    return { ready: blockedBy.length === 0, blockedBy };
}
//# sourceMappingURL=dependency_graph.js.map