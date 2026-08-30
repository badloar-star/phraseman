import assert from "node:assert/strict";

import { LEARNING_V2_ENGLISH_EXACT_SESSION_PACKETS_V2 } from "../modules/learning-v2/curriculum/en/exact_session_packets_en_v2";
import { LEARNING_V2_ENGLISH_GRAMMAR_OPERATIONS_V2 } from "../modules/learning-v2/curriculum/en/grammar_operations_en_v2";
import { LEARNING_V2_ENGLISH_LEXICAL_SENSES_V2 } from "../modules/learning-v2/curriculum/en/lexical_senses_en_v2";

const lessonOneOperations = LEARNING_V2_ENGLISH_GRAMMAR_OPERATIONS_V2
  .filter((operation) => operation.lessonOrdinal === 1);
const firstSession = LEARNING_V2_ENGLISH_EXACT_SESSION_PACKETS_V2[0];

const expectedOperationIds = [
  "en.grammar.present_be_affirmative.i_am",
  "en.grammar.present_be_affirmative.he_she_it_is",
  "en.grammar.present_be_affirmative.you_we_they_are",
  "en.grammar.present_be_affirmative.full_form_choice",
  "en.grammar.present_be_affirmative.contractions",
];

assert.deepEqual(
  lessonOneOperations.map((operation) => operation.id),
  expectedOperationIds,
  "lesson_01_must_split_each_new_be_pattern_into_its_own_prerequisite_safe_operation",
);
assert.deepEqual(lessonOneOperations[0]?.prerequisiteOperationIds, [], "i_am_is_the_course_start");
assert.deepEqual(lessonOneOperations[0]?.formBoundary, ["I + am + complement"], "i_am_boundary_is_atomic");
assert.deepEqual(
  lessonOneOperations[0]?.positiveExamples,
  ["I am here.", "I am ready."],
  "course_start_examples_use_only_i_am_and_two_explicitly_introduced_words",
);

assert.equal(firstSession?.sessionId, "lesson-01:session:01", "course_start_packet_id");
assert.deepEqual(firstSession?.grammarOperationIds, [expectedOperationIds[0]], "course_start_owns_only_i_am");
assert.deepEqual(
  [...(firstSession?.newLexicalSenseIds ?? [])].sort(),
  ["en.fine.adjective.01", "en.here.adverb.01", "en.ready.adjective.01"],
  "course_start_explicitly_introduces_here_ready_and_fine",
);
assert.equal(firstSession?.canonicalExamples.includes("They are here."), false, "future_are_example_forbidden");
assert.equal(
  expectedOperationIds.slice(1).every((operationId) => firstSession?.forbiddenOperationIds.includes(operationId)),
  true,
  "all_later_lesson_01_grammar_is_forbidden_in_session_01",
);

for (const senseId of ["here.adverb.01", "ready.adjective.01"]) {
  const sense = LEARNING_V2_ENGLISH_LEXICAL_SENSES_V2.find((candidate) => candidate.id === senseId);
  assert.ok(sense, `localized_lexical_seed_missing:${senseId}`);
  assert.equal(sense.introductionAbsoluteSessionOrdinal, 1, `${senseId}:must_unlock_in_session_01`);
}

process.stdout.write("LEARNING V2 COURSE START PREREQUISITE GATE V2: PASS\n");
