import assert from "node:assert/strict";

import { LEARNING_V2_ENGLISH_GRAMMAR_OPERATIONS_V2 } from "../modules/learning-v2/curriculum/en/grammar_operations_en_v2";
import {
  LEARNING_V2_ENGLISH_PLANNED_LEXICAL_RETRIEVAL_EDGES_V2,
  LEARNING_V2_ENGLISH_PLANNED_LEXICAL_SENSES_V2,
} from "../modules/learning-v2/curriculum/en/lexical_progression_en_v2";

const senses = LEARNING_V2_ENGLISH_PLANNED_LEXICAL_SENSES_V2;
const edges = LEARNING_V2_ENGLISH_PLANNED_LEXICAL_RETRIEVAL_EDGES_V2;
const normalizedExamples = LEARNING_V2_ENGLISH_GRAMMAR_OPERATIONS_V2.map((operation) => ({
  operation,
  text: ` ${operation.positiveExamples.join(" ").toLowerCase().replace(/[^a-z]+/g, " ")} `,
}));

assert.equal(new Set(senses.map((sense) => sense.id)).size, senses.length, "planned_sense_ids_unique");
assert.equal(senses.some((sense) => ["hello", "name"].includes(sense.english.toLowerCase())), false, "rejected_hello_name_forbidden");

for (const lessonOrdinal of Array.from({ length: 32 }, (_, index) => index + 1)) {
  const lessonStart = ((lessonOrdinal - 1) * 56) + 1;
  const lessonEnd = lessonOrdinal * 56;
  assert.ok(
    senses.some((sense) => sense.lessonOrdinal === lessonOrdinal) ||
      edges.some((edge) =>
        edge.targetAbsoluteSessionOrdinal >= lessonStart &&
        edge.targetAbsoluteSessionOrdinal <= lessonEnd
      ),
    `lesson_${lessonOrdinal}:new_or_retrieval_lexical_progression_required`,
  );
}

for (const sense of senses) {
  assert.equal(sense.localizationStatus, "REQUIRES_MANUAL_AUTHORING", `${sense.id}:honest_localization_status`);
  assert.equal(sense.definitionByLocale, null, `${sense.id}:machine_localization_forbidden`);
  assert.ok(sense.glossRu.trim().length > 0, `${sense.id}:planning_gloss_required`);
  assert.ok(
    normalizedExamples.some(({ operation, text }) =>
      operation.id === sense.groundingOperationId && text.includes(` ${sense.english.toLowerCase()} `),
    ),
    `${sense.id}:must_be_grounded_in_v2_canonical_example`,
  );
  assert.ok(
    edges.some((edge) => edge.senseId === sense.id && edge.targetAbsoluteSessionOrdinal > sense.introductionAbsoluteSessionOrdinal),
    `${sense.id}:future_retrieval_required`,
  );
}

const countsByIntroduction = new Map<number, number>();
for (const sense of senses) {
  countsByIntroduction.set(
    sense.introductionAbsoluteSessionOrdinal,
    (countsByIntroduction.get(sense.introductionAbsoluteSessionOrdinal) ?? 0) + 1,
  );
}
assert.equal(
  [...countsByIntroduction.values()].every((count) => count <= 2),
  true,
  "no_more_than_two_new_senses_in_one_session",
);

process.stdout.write(
  `LEARNING V2 LEXICAL PROGRESSION GATE V2: PASS planned_senses=${senses.length} retrieval_edges=${edges.length} lessons=32\n`,
);
