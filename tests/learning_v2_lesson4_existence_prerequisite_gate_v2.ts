import assert from "node:assert/strict";

import { LEARNING_V2_ENGLISH_GRAMMAR_OPERATIONS_V2 } from "../modules/learning-v2/curriculum/en/grammar_operations_en_v2";

const operationById = new Map(
  LEARNING_V2_ENGLISH_GRAMMAR_OPERATIONS_V2.map((operation) => [operation.id, operation]),
);
const existenceId = "en.grammar.existence_place.there_is_are";
const questionsId = "en.grammar.existence_place.existential_questions";
const someAnyId = "en.grammar.existence_place.existential_some_any";
const existence = operationById.get(existenceId);
const questions = operationById.get(questionsId);
const someAny = operationById.get(someAnyId);

assert.ok(existence, "lesson4_there_is_are_operation_missing");
assert.ok(questions, "lesson4_existential_questions_operation_missing");
assert.ok(someAny, "lesson4_some_any_operation_missing");
assert.equal(
  /\b(?:some|any)\b/i.test(questions.positiveExamples.join(" ")),
  false,
  "lesson4_existential_questions_must_not_use_future_some_any",
);
assert.equal(
  /\b\d+\b|\b(?:one|two|three|four|five)\b/i.test(existence.positiveExamples.join(" ")),
  false,
  "lesson4_there_is_are_examples_must_not_use_unintroduced_numbers",
);
assert.equal(
  someAny.prerequisiteOperationIds.includes(questionsId),
  true,
  "lesson4_some_any_must_follow_existential_questions",
);

process.stdout.write("LEARNING V2 LESSON 4 EXISTENCE PREREQUISITE GATE V2: PASS\n");
