import { assertAcyclicStageGraph, stageReadiness, type StageDependencyNode } from './dependency_graph';

describe('content generation dependency graph', () => {
  const nodes: StageDependencyNode[] = [
    { stageId: 'outline', prerequisiteStageIds: [], state: 'approved' },
    { stageId: 'phrases', prerequisiteStageIds: ['outline'], state: 'approved' },
    { stageId: 'vocabulary', prerequisiteStageIds: ['phrases'], state: 'queued' },
  ];

  it('allows a downstream stage only after every prerequisite is approved', () => {
    expect(assertAcyclicStageGraph(nodes)).toBeUndefined();
    expect(stageReadiness(nodes, 'vocabulary')).toEqual({ ready: true, blockedBy: [] });
    expect(stageReadiness(nodes.map((node) => node.stageId === 'phrases' ? { ...node, state: 'needs_review' as const } : node), 'vocabulary')).toEqual({ ready: false, blockedBy: ['phrases'] });
  });

  it('rejects cycles, missing dependencies and duplicate stage IDs', () => {
    expect(() => assertAcyclicStageGraph([{ stageId: 'a', prerequisiteStageIds: ['b'], state: 'queued' }, { stageId: 'b', prerequisiteStageIds: ['a'], state: 'queued' }])).toThrow('generation_stage_cycle');
    expect(() => assertAcyclicStageGraph([{ stageId: 'a', prerequisiteStageIds: ['missing'], state: 'queued' }])).toThrow('generation_stage_dependency_missing');
    expect(() => assertAcyclicStageGraph([{ stageId: 'a', prerequisiteStageIds: [], state: 'queued' }, { stageId: 'a', prerequisiteStageIds: [], state: 'queued' }])).toThrow('generation_stage_duplicate');
  });
});
