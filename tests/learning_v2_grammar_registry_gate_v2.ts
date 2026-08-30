import assert from "node:assert/strict";

import { LEARNING_V2_ENGLISH_FULL_B1_SCOPE_V2 } from "../modules/learning-v2/curriculum/en/full_b1_scope_en_v2";
import { LEARNING_V2_ENGLISH_GRAMMAR_OPERATIONS_V2 } from "../modules/learning-v2/curriculum/en/grammar_operations_en_v2";

const operations = LEARNING_V2_ENGLISH_GRAMMAR_OPERATIONS_V2;
const operationById = new Map(operations.map((operation) => [operation.id, operation]));

assert.equal(operationById.size, operations.length, "grammar_operation_ids_must_be_unique");

for (const lesson of LEARNING_V2_ENGLISH_FULL_B1_SCOPE_V2.lessons) {
  const owned = operations.filter((operation) => operation.lessonOrdinal === lesson.lessonOrdinal);
  assert.ok(
    owned.length >= lesson.includedSubsystems.length,
    `lesson_major_system_under_decomposed:${lesson.lessonOrdinal}:${owned.length}:${lesson.includedSubsystems.length}`,
  );
  assert.equal(
    owned.every((operation) => operation.majorSystemId === lesson.majorSystemId),
    true,
    `grammar_operation_major_system_mismatch:${lesson.lessonOrdinal}`,
  );
}

let futureGrammarExamples = 0;

for (const operation of operations) {
  assert.match(operation.id, /^en\.grammar\.[a-z0-9_.]+$/, `invalid_operation_id:${operation.id}`);
  assert.ok(operation.communicativeFunctionRu.trim().length > 0, `missing_communicative_function:${operation.id}`);
  assert.ok(operation.decisionRuleRu.trim().length > 0, `missing_decision_rule:${operation.id}`);
  assert.ok(operation.formBoundary.length > 0, `missing_form_boundary:${operation.id}`);
  assert.equal(
    operation.formBoundary.some((form) => form.includes(" / ")),
    false,
    `non_atomic_form_boundary:${operation.id}`,
  );
  assert.equal(operation.positiveExamples.length, 2, `positive_examples_count:${operation.id}`);
  assert.equal(new Set(operation.positiveExamples).size, 2, `positive_examples_must_differ:${operation.id}`);
  assert.ok(operation.diagnosticErrorIds.length > 0, `diagnostic_errors_missing:${operation.id}`);
  assert.ok(operation.prohibitedExtensionIds.length > 0, `prohibited_extensions_missing:${operation.id}`);
  assert.equal(operation.fullSessionBeforeUse, true, `full_session_before_use_required:${operation.id}`);
  assert.ok(operation.sourceEvidenceRefs.some((ref) => ref.startsWith("EV-")), `external_evidence_missing:${operation.id}`);
  assert.ok(operation.sourceEvidenceRefs.some((ref) => ref.startsWith("OC-")), `owner_evidence_missing:${operation.id}`);

  for (const prerequisiteId of operation.prerequisiteOperationIds) {
    const prerequisite = operationById.get(prerequisiteId);
    assert.ok(prerequisite, `unknown_prerequisite:${operation.id}:${prerequisiteId}`);
    if (prerequisite.lessonOrdinal > operation.lessonOrdinal) {
      futureGrammarExamples += 1;
    }
  }
}

assert.equal(futureGrammarExamples, 0, "future_grammar_prerequisite_reference");

process.stdout.write(
  `LEARNING V2 GRAMMAR REGISTRY V2 GATE: PASS lesson_systems=${LEARNING_V2_ENGLISH_FULL_B1_SCOPE_V2.lessons.length} operations=${operations.length} future_grammar_examples=${futureGrammarExamples}\n`,
);
