import assert from "node:assert/strict";

import {
  LEARNING_V2_ENGLISH_GRAMMAR_COVERAGE_MATRIX_V2,
  LEARNING_V2_ENGLISH_LEXICAL_COVERAGE_MATRIX_V2,
} from "../modules/learning-v2/curriculum/en/coverage_matrices_en_v2";
import { LEARNING_V2_ENGLISH_GRAMMAR_OPERATIONS_V2 } from "../modules/learning-v2/curriculum/en/grammar_operations_en_v2";
import { LEARNING_V2_ENGLISH_PLANNED_LEXICAL_SENSES_V2 } from "../modules/learning-v2/curriculum/en/lexical_progression_en_v2";

assert.equal(
  LEARNING_V2_ENGLISH_GRAMMAR_COVERAGE_MATRIX_V2.length,
  LEARNING_V2_ENGLISH_GRAMMAR_OPERATIONS_V2.length,
  "grammar_matrix_row_count",
);
for (const row of LEARNING_V2_ENGLISH_GRAMMAR_COVERAGE_MATRIX_V2) {
  assert.ok(row.introductionSessionId, `${row.operationId}:introduction_session`);
  assert.ok(row.guidedPracticeSessionIds.length > 0, `${row.operationId}:guided_practice`);
  assert.ok(row.productionSessionIds.length > 0, `${row.operationId}:production`);
  assert.ok(row.independentEvidenceSessionIds.length > 0, `${row.operationId}:independent_evidence`);
}

assert.equal(
  LEARNING_V2_ENGLISH_LEXICAL_COVERAGE_MATRIX_V2.length,
  LEARNING_V2_ENGLISH_PLANNED_LEXICAL_SENSES_V2.length,
  "lexical_matrix_row_count",
);
for (const row of LEARNING_V2_ENGLISH_LEXICAL_COVERAGE_MATRIX_V2) {
  assert.ok(row.introductionSessionId, `${row.senseId}:introduction_session`);
  assert.ok(row.groundedContactActivityIds.length >= 3, `${row.senseId}:three_grounded_contacts`);
  assert.ok(row.futureRetrievalSessionIds.length > 0, `${row.senseId}:future_retrieval`);
}

process.stdout.write(
  `LEARNING V2 COVERAGE MATRICES GATE V2: PASS grammar_rows=${LEARNING_V2_ENGLISH_GRAMMAR_COVERAGE_MATRIX_V2.length} lexical_rows=${LEARNING_V2_ENGLISH_LEXICAL_COVERAGE_MATRIX_V2.length}\n`,
);
