import type { GenerationStageState } from './stage_contracts';

export interface StageDependencyNode {
  readonly stageId: string;
  readonly prerequisiteStageIds: readonly string[];
  readonly state: GenerationStageState;
}

export function assertAcyclicStageGraph(nodes: readonly StageDependencyNode[]): void {
  const byId = new Map<string, StageDependencyNode>();
  for (const node of nodes) {
    if (byId.has(node.stageId)) throw new Error('generation_stage_duplicate');
    byId.set(node.stageId, node);
  }
  for (const node of nodes) {
    if (node.prerequisiteStageIds.some((id) => !byId.has(id))) throw new Error('generation_stage_dependency_missing');
  }
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (stageId: string): void => {
    if (visiting.has(stageId)) throw new Error('generation_stage_cycle');
    if (visited.has(stageId)) return;
    visiting.add(stageId);
    for (const dependencyId of byId.get(stageId)?.prerequisiteStageIds ?? []) visit(dependencyId);
    visiting.delete(stageId);
    visited.add(stageId);
  };
  for (const node of nodes) visit(node.stageId);
}

export function stageReadiness(nodes: readonly StageDependencyNode[], stageId: string): { ready: boolean; blockedBy: string[] } {
  assertAcyclicStageGraph(nodes);
  const byId = new Map(nodes.map((node) => [node.stageId, node]));
  const node = byId.get(stageId);
  if (!node) throw new Error('generation_stage_not_found');
  const blockedBy = node.prerequisiteStageIds.filter((id) => byId.get(id)?.state !== 'approved');
  return { ready: blockedBy.length === 0, blockedBy };
}
