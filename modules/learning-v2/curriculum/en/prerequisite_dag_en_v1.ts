import {
  LEARNING_V2_ENGLISH_GRAMMAR_OPERATIONS_V1,
  type LearningV2EnglishGrammarOperationV1,
} from "./grammar_operations_en_v1";

export type LearningV2EnglishGrammarPrerequisiteEdgeV1 = Readonly<{
  prerequisiteOperationId: string;
  dependentOperationId: string;
}>;

export type LearningV2EnglishGrammarPrerequisiteDagInputV1 = Readonly<{
  operations: readonly LearningV2EnglishGrammarOperationV1[];
  edges: readonly LearningV2EnglishGrammarPrerequisiteEdgeV1[];
}>;

export type LearningV2EnglishGrammarPrerequisiteDagFindingV1 = Readonly<{
  severity: "blocker" | "error";
  code: string;
  prerequisiteOperationId: string | null;
  dependentOperationId: string | null;
  message: string;
}>;

export const LEARNING_V2_ENGLISH_GRAMMAR_PREREQUISITE_EDGES_V1 =
  Object.freeze(
    LEARNING_V2_ENGLISH_GRAMMAR_OPERATIONS_V1.flatMap((operation) =>
      operation.prerequisiteOperationIds.map((prerequisiteOperationId) =>
        Object.freeze({
          prerequisiteOperationId,
          dependentOperationId: operation.id,
        }),
      ),
    ),
  );

function finding(
  code: string,
  prerequisiteOperationId: string | null,
  dependentOperationId: string | null,
  message: string,
): LearningV2EnglishGrammarPrerequisiteDagFindingV1 {
  return Object.freeze({
    severity: "blocker" as const,
    code,
    prerequisiteOperationId,
    dependentOperationId,
    message,
  });
}

function edgeKey(edge: LearningV2EnglishGrammarPrerequisiteEdgeV1): string {
  return `${edge.prerequisiteOperationId}\u0000${edge.dependentOperationId}`;
}

export function validateLearningV2EnglishGrammarPrerequisiteDagV1(
  input: LearningV2EnglishGrammarPrerequisiteDagInputV1,
): readonly LearningV2EnglishGrammarPrerequisiteDagFindingV1[] {
  const findings: LearningV2EnglishGrammarPrerequisiteDagFindingV1[] = [];
  const operationsById = new Map(
    input.operations.map((operation) => [operation.id, operation] as const),
  );
  const seenEdges = new Set<string>();
  const validEdges: LearningV2EnglishGrammarPrerequisiteEdgeV1[] = [];

  for (const edge of input.edges) {
    const key = edgeKey(edge);
    if (seenEdges.has(key)) {
      findings.push(
        finding(
          "dag_duplicate_edge",
          edge.prerequisiteOperationId,
          edge.dependentOperationId,
          "Одна prerequisite edge записана более одного раза.",
        ),
      );
      continue;
    }
    seenEdges.add(key);

    if (edge.prerequisiteOperationId === edge.dependentOperationId) {
      findings.push(
        finding(
          "dag_self_edge",
          edge.prerequisiteOperationId,
          edge.dependentOperationId,
          "Grammar operation не может зависеть сама от себя.",
        ),
      );
      continue;
    }

    const prerequisite = operationsById.get(edge.prerequisiteOperationId);
    const dependent = operationsById.get(edge.dependentOperationId);
    if (!prerequisite || !dependent) {
      findings.push(
        finding(
          "dag_edge_operation_missing",
          edge.prerequisiteOperationId,
          edge.dependentOperationId,
          "Одна из операций prerequisite edge отсутствует в реестре.",
        ),
      );
      continue;
    }

    if (prerequisite.lessonOrdinal > dependent.lessonOrdinal) {
      findings.push(
        finding(
          "dag_future_prerequisite",
          edge.prerequisiteOperationId,
          edge.dependentOperationId,
          "Зависимая операция ссылается на prerequisite из будущего урока.",
        ),
      );
    }

    if (
      !dependent.prerequisiteOperationIds.includes(
        edge.prerequisiteOperationId,
      )
    ) {
      findings.push(
        finding(
          "dag_edge_not_declared",
          edge.prerequisiteOperationId,
          edge.dependentOperationId,
          "Edge отсутствует в prerequisiteOperationIds зависимой операции.",
        ),
      );
    }

    validEdges.push(edge);
  }

  for (const operation of input.operations) {
    for (const prerequisiteOperationId of operation.prerequisiteOperationIds) {
      if (
        !seenEdges.has(
          edgeKey({
            prerequisiteOperationId,
            dependentOperationId: operation.id,
          }),
        )
      ) {
        findings.push(
          finding(
            "dag_declared_prerequisite_edge_missing",
            prerequisiteOperationId,
            operation.id,
            "Объявленный prerequisite не материализован как DAG edge.",
          ),
        );
      }
    }
  }

  const adjacency = new Map<string, string[]>(
    input.operations.map((operation) => [operation.id, []]),
  );
  for (const edge of validEdges) {
    adjacency.get(edge.prerequisiteOperationId)!.push(edge.dependentOperationId);
  }
  for (const dependents of adjacency.values()) dependents.sort();

  const colors = new Map<string, "unvisited" | "visiting" | "visited">(
    input.operations.map((operation) => [operation.id, "unvisited"]),
  );
  let cycleReported = false;

  function visit(operationId: string): void {
    if (cycleReported) return;
    colors.set(operationId, "visiting");
    for (const dependentId of adjacency.get(operationId) ?? []) {
      const color = colors.get(dependentId);
      if (color === "visiting") {
        findings.push(
          finding(
            "dag_cycle",
            operationId,
            dependentId,
            "Prerequisite DAG содержит цикл.",
          ),
        );
        cycleReported = true;
        return;
      }
      if (color === "unvisited") visit(dependentId);
    }
    colors.set(operationId, "visited");
  }

  for (const operationId of [...operationsById.keys()].sort()) {
    if (colors.get(operationId) === "unvisited") visit(operationId);
  }

  return Object.freeze(findings);
}

export const LEARNING_V2_ENGLISH_GRAMMAR_PREREQUISITE_DAG_V1 = Object.freeze({
  operations: LEARNING_V2_ENGLISH_GRAMMAR_OPERATIONS_V1,
  edges: LEARNING_V2_ENGLISH_GRAMMAR_PREREQUISITE_EDGES_V1,
});
