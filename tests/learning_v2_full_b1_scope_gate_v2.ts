import assert from "node:assert/strict";

import { LEARNING_V2_ENGLISH_FULL_B1_SCOPE_V2 } from "../modules/learning-v2/curriculum/en/full_b1_scope_en_v2";

const EXPECTED_MAJOR_SYSTEM_IDS = Object.freeze([
  "present_be_affirmative",
  "present_be_questions_negatives",
  "nouns_core_determiners",
  "existence_place",
  "possession",
  "present_simple_affirmative",
  "present_simple_questions_negatives",
  "ability_requests_instructions",
  "present_continuous",
  "present_simple_vs_continuous",
  "past_be_existence",
  "past_simple_affirmative",
  "past_simple_questions_negatives",
  "past_continuous",
  "planned_future",
  "will_future",
  "countability_quantification",
  "comparison_degree",
  "ability_permission",
  "obligation_prohibition_advice",
  "verb_complement_patterns",
  "pronoun_reference",
  "present_perfect_experience_result",
  "present_perfect_duration_contrast",
  "past_habits_narrative_ordering",
  "zero_first_conditional",
  "second_conditional_wishes",
  "passive_voice",
  "defining_relative_clauses",
  "reported_speech",
  "complex_questions_clause_linking",
  "probability_deduction",
] as const);

const scope = LEARNING_V2_ENGLISH_FULL_B1_SCOPE_V2;

assert.equal(scope.targetLanguage, "en");
assert.equal(scope.exitBoundary, "FUNCTIONAL_B1");
assert.equal(scope.lessons.length, 32, "full_b1_scope_must_have_32_lessons");
assert.deepEqual(
  scope.lessons.map((row) => row.majorSystemId),
  EXPECTED_MAJOR_SYSTEM_IDS,
  "full_b1_scope_major_system_order_drift",
);
assert.deepEqual(
  scope.lessons.map((row) => row.lessonOrdinal),
  Array.from({ length: 32 }, (_, index) => index + 1),
  "full_b1_scope_lesson_ordinals_must_be_contiguous",
);
assert.equal(
  scope.lessons.every((row) => row.introducesNewMajorSystem),
  true,
  "every_lesson_must_introduce_a_new_major_grammar_system",
);
assert.equal(
  scope.lessons.some((row) => row.checkpointOnly),
  false,
  "checkpoint_only_lessons_are_forbidden",
);

for (const row of scope.lessons) {
  assert.ok(row.titleRu.trim().length > 0, `lesson_title_missing:${row.lessonOrdinal}`);
  assert.ok(row.includedSubsystems.length > 0, `included_subsystems_missing:${row.lessonOrdinal}`);
  assert.ok(row.excludedExtensions.length > 0, `excluded_extensions_missing:${row.lessonOrdinal}`);
  assert.ok(row.terminalCanDoRu.trim().length > 0, `terminal_can_do_missing:${row.lessonOrdinal}`);
  assert.ok(
    row.sourceEvidenceRefs.some((ref) => ref.startsWith("EV-")),
    `external_scope_evidence_missing:${row.lessonOrdinal}`,
  );
  assert.ok(
    row.sourceEvidenceRefs.some((ref) => ref.startsWith("OC-")),
    `owner_contract_evidence_missing:${row.lessonOrdinal}`,
  );
}

const lessonLevelText = scope.lessons
  .flatMap((row) => [row.majorSystemId, row.titleRu])
  .join(" ")
  .toLocaleLowerCase("ru");

assert.equal(/\bhello\b|\bname\b/.test(lessonLevelText), false, "lexical_item_used_as_lesson_system");

process.stdout.write(
  `LEARNING V2 FULL B1 SCOPE V2 GATE: PASS lessons=${scope.lessons.length} checkpoint_only=${scope.lessons.filter((row) => row.checkpointOnly).length}\n`,
);
