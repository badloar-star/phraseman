import {
  LEARNING_V2_ENGLISH_GRAMMAR_OPERATIONS_V2,
  type LearningV2EnglishGrammarOperationV2,
} from "./grammar_operations_en_v2";

export type LearningV2EnglishGrammarPrerequisiteEdgeV2 = Readonly<{
  prerequisiteOperationId: string;
  dependentOperationId: string;
}>;

export type LearningV2EnglishGrammarPrerequisiteDagV2 = Readonly<{
  operations: readonly LearningV2EnglishGrammarOperationV2[];
  edges: readonly LearningV2EnglishGrammarPrerequisiteEdgeV2[];
}>;

export const LEARNING_V2_ENGLISH_GRAMMAR_PREREQUISITE_EDGES_V2 = Object.freeze(
  LEARNING_V2_ENGLISH_GRAMMAR_OPERATIONS_V2.flatMap((operation) =>
    operation.prerequisiteOperationIds.map((prerequisiteOperationId) => Object.freeze({
      prerequisiteOperationId,
      dependentOperationId: operation.id,
    }))),
);

export const LEARNING_V2_ENGLISH_GRAMMAR_PREREQUISITE_DAG_V2: LearningV2EnglishGrammarPrerequisiteDagV2 = Object.freeze({
  operations: LEARNING_V2_ENGLISH_GRAMMAR_OPERATIONS_V2,
  edges: LEARNING_V2_ENGLISH_GRAMMAR_PREREQUISITE_EDGES_V2,
});

const reachableOperationIds = (
  dag: LearningV2EnglishGrammarPrerequisiteDagV2,
): ReadonlySet<string> => {
  const courseStartId = dag.operations[0]?.id;
  if (!courseStartId) return new Set<string>();

  const dependents = new Map<string, string[]>();
  for (const edge of dag.edges) {
    const bucket = dependents.get(edge.prerequisiteOperationId) ?? [];
    bucket.push(edge.dependentOperationId);
    dependents.set(edge.prerequisiteOperationId, bucket);
  }

  const reachable = new Set<string>([courseStartId]);
  const queue = [courseStartId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const dependentId of dependents.get(current) ?? []) {
      if (reachable.has(dependentId)) continue;
      reachable.add(dependentId);
      queue.push(dependentId);
    }
  }
  return reachable;
};

export const isLearningV2EnglishGrammarOperationReachableFromCourseStartV2 = (
  operationId: string,
  dag: LearningV2EnglishGrammarPrerequisiteDagV2 = LEARNING_V2_ENGLISH_GRAMMAR_PREREQUISITE_DAG_V2,
): boolean => reachableOperationIds(dag).has(operationId);

export const validateLearningV2EnglishGrammarPrerequisiteDagV2 = (
  dag: LearningV2EnglishGrammarPrerequisiteDagV2,
): readonly string[] => {
  const findings: string[] = [];
  const byId = new Map(dag.operations.map((operation) => [operation.id, operation]));
  const seenEdges = new Set<string>();
  const adjacency = new Map<string, string[]>();

  for (const edge of dag.edges) {
    const edgeKey = `${edge.prerequisiteOperationId}->${edge.dependentOperationId}`;
    if (seenEdges.has(edgeKey)) findings.push(`dag_duplicate_edge:${edgeKey}`);
    seenEdges.add(edgeKey);

    if (edge.prerequisiteOperationId === edge.dependentOperationId) {
      findings.push(`dag_self_edge:${edgeKey}`);
    }

    const prerequisite = byId.get(edge.prerequisiteOperationId);
    const dependent = byId.get(edge.dependentOperationId);
    if (!prerequisite || !dependent) {
      findings.push(`dag_edge_operation_missing:${edgeKey}`);
      continue;
    }
    if (prerequisite.lessonOrdinal > dependent.lessonOrdinal) {
      findings.push(`dag_future_prerequisite:${edgeKey}`);
    }

    const bucket = adjacency.get(edge.prerequisiteOperationId) ?? [];
    bucket.push(edge.dependentOperationId);
    adjacency.set(edge.prerequisiteOperationId, bucket);
  }

  const state = new Map<string, "visiting" | "visited">();
  let cycleFound = false;
  const visit = (operationId: string): void => {
    if (cycleFound || state.get(operationId) === "visited") return;
    if (state.get(operationId) === "visiting") {
      cycleFound = true;
      return;
    }
    state.set(operationId, "visiting");
    for (const dependentId of adjacency.get(operationId) ?? []) visit(dependentId);
    state.set(operationId, "visited");
  };
  for (const operation of dag.operations) visit(operation.id);
  if (cycleFound) findings.push("dag_cycle");

  const reachable = reachableOperationIds(dag);
  for (const operation of dag.operations) {
    if (!reachable.has(operation.id)) findings.push(`dag_unreachable_operation:${operation.id}`);
  }

  return Object.freeze(findings);
};
