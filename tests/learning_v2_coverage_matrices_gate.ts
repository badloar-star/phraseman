import assert from "node:assert/strict";

import {
  LEARNING_V2_ENGLISH_CAN_DO_COVERAGE_MATRIX_V1,
  LEARNING_V2_ENGLISH_GRAMMAR_COVERAGE_MATRIX_V1,
  LEARNING_V2_ENGLISH_LEXICAL_COVERAGE_MATRIX_V1,
} from "../modules/learning-v2/curriculum/en/coverage_matrices_en_v1";

assert.equal(LEARNING_V2_ENGLISH_GRAMMAR_COVERAGE_MATRIX_V1.length, 136);
for (const row of LEARNING_V2_ENGLISH_GRAMMAR_COVERAGE_MATRIX_V1) {
  assert.ok(row.introductionSessionId, `${row.grammarOperationId} needs one introduction session`);
  assert.ok(row.reviewSessionIds.length >= 7, `${row.grammarOperationId} needs repeated use after introduction`);
}

assert.equal(LEARNING_V2_ENGLISH_LEXICAL_COVERAGE_MATRIX_V1.length, 280);
for (const row of LEARNING_V2_ENGLISH_LEXICAL_COVERAGE_MATRIX_V1) {
  assert.ok(row.introductionSessionId, `${row.lexicalSenseId} needs one introduction session`);
  assert.ok(row.retrievalSessionIds.length > 0, `${row.lexicalSenseId} needs later retrieval`);
  assert.ok(
    row.retrievalSessionIds.some((sessionId) => sessionId !== row.introductionSessionId),
    `${row.lexicalSenseId} needs retrieval outside its introduction packet`,
  );
}

assert.equal(LEARNING_V2_ENGLISH_CAN_DO_COVERAGE_MATRIX_V1.length, 224);
for (const row of LEARNING_V2_ENGLISH_CAN_DO_COVERAGE_MATRIX_V1) {
  assert.equal(row.sessionIds.length, 8, `${row.chapterId} needs eight session links`);
  assert.ok(row.independentProbeSessionId, `${row.chapterId} needs an independent probe`);
}

console.log("learning_v2_coverage_matrices_gate: PASS");
