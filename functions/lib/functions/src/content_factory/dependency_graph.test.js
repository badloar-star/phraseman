"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dependency_graph_1 = require("./dependency_graph");
describe('content generation dependency graph', () => {
    const nodes = [
        { stageId: 'outline', prerequisiteStageIds: [], state: 'approved' },
        { stageId: 'phrases', prerequisiteStageIds: ['outline'], state: 'approved' },
        { stageId: 'vocabulary', prerequisiteStageIds: ['phrases'], state: 'queued' },
    ];
    it('allows a downstream stage only after every prerequisite is approved', () => {
        expect((0, dependency_graph_1.assertAcyclicStageGraph)(nodes)).toBeUndefined();
        expect((0, dependency_graph_1.stageReadiness)(nodes, 'vocabulary')).toEqual({ ready: true, blockedBy: [] });
        expect((0, dependency_graph_1.stageReadiness)(nodes.map((node) => node.stageId === 'phrases' ? { ...node, state: 'needs_review' } : node), 'vocabulary')).toEqual({ ready: false, blockedBy: ['phrases'] });
    });
    it('rejects cycles, missing dependencies and duplicate stage IDs', () => {
        expect(() => (0, dependency_graph_1.assertAcyclicStageGraph)([{ stageId: 'a', prerequisiteStageIds: ['b'], state: 'queued' }, { stageId: 'b', prerequisiteStageIds: ['a'], state: 'queued' }])).toThrow('generation_stage_cycle');
        expect(() => (0, dependency_graph_1.assertAcyclicStageGraph)([{ stageId: 'a', prerequisiteStageIds: ['missing'], state: 'queued' }])).toThrow('generation_stage_dependency_missing');
        expect(() => (0, dependency_graph_1.assertAcyclicStageGraph)([{ stageId: 'a', prerequisiteStageIds: [], state: 'queued' }, { stageId: 'a', prerequisiteStageIds: [], state: 'queued' }])).toThrow('generation_stage_duplicate');
    });
});
//# sourceMappingURL=dependency_graph.test.js.map