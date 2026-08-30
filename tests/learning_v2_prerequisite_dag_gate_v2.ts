import assert from "node:assert/strict";

import {
  LEARNING_V2_ENGLISH_GRAMMAR_PREREQUISITE_DAG_V2,
  isLearningV2EnglishGrammarOperationReachableFromCourseStartV2,
  validateLearningV2EnglishGrammarPrerequisiteDagV2,
} from "../modules/learning-v2/curriculum/en/prerequisite_dag_en_v2";

const dag = LEARNING_V2_ENGLISH_GRAMMAR_PREREQUISITE_DAG_V2;
const findings = validateLearningV2EnglishGrammarPrerequisiteDagV2(dag);
const byId = new Map(dag.operations.map((operation) => [operation.id, operation]));

assert.deepEqual(findings, [], `prerequisite_dag_findings:${findings.join(",")}`);
assert.equal(
  dag.operations.every((operation) =>
    isLearningV2EnglishGrammarOperationReachableFromCourseStartV2(operation.id, dag)),
  true,
  "prerequisite_dag_contains_unreachable_operation",
);
assert.equal(
  dag.edges.every((edge) => {
    const prerequisite = byId.get(edge.prerequisiteOperationId);
    const dependent = byId.get(edge.dependentOperationId);
    return prerequisite !== undefined && dependent !== undefined && prerequisite.lessonOrdinal <= dependent.lessonOrdinal;
  }),
  true,
  "prerequisite_dag_contains_future_edge",
);

process.stdout.write(
  `LEARNING V2 PREREQUISITE DAG V2 GATE: PASS operations=${dag.operations.length} edges=${dag.edges.length} cycles=0 unreachable=0 future_edges=0\n`,
);
