import assert from "node:assert/strict";

import { LEARNING_V2_ENGLISH_GRAMMAR_OPERATIONS_V2 } from "../modules/learning-v2/curriculum/en/grammar_operations_en_v2";
import { LEARNING_V2_ENGLISH_LESSON_BLUEPRINTS_V2 } from "../modules/learning-v2/curriculum/en/lesson_blueprints_en_v2";

const lessons = LEARNING_V2_ENGLISH_LESSON_BLUEPRINTS_V2;
const operationById = new Map(LEARNING_V2_ENGLISH_GRAMMAR_OPERATIONS_V2.map((operation) => [operation.id, operation]));

assert.equal(lessons.length, 32, "lesson_blueprints_must_have_32_lessons");
assert.deepEqual(
  lessons.map((lesson) => lesson.lessonOrdinal),
  Array.from({ length: 32 }, (_, index) => index + 1),
  "lesson_blueprint_ordinals_must_be_contiguous",
);
assert.equal(new Set(lessons.map((lesson) => lesson.lessonId)).size, 32, "lesson_blueprint_ids_must_be_unique");

for (const lesson of lessons) {
  assert.equal(lesson.chapterCount, 7, `lesson_chapter_count:${lesson.lessonOrdinal}`);
  assert.equal(lesson.sessionCount, 56, `lesson_session_count:${lesson.lessonOrdinal}`);
  assert.equal(lesson.checkpointOnly, false, `checkpoint_only_lesson_forbidden:${lesson.lessonOrdinal}`);
  assert.ok(lesson.ownedGrammarOperationIds.length > 0, `owned_operations_missing:${lesson.lessonOrdinal}`);
  assert.equal(
    lesson.ownedGrammarOperationIds.every((id) => operationById.get(id)?.lessonOrdinal === lesson.lessonOrdinal),
    true,
    `owned_operation_wrong_lesson:${lesson.lessonOrdinal}`,
  );
  assert.equal(
    lesson.deliberateReviewOperationIds.every((id) => {
      const operation = operationById.get(id);
      return operation !== undefined && operation.lessonOrdinal < lesson.lessonOrdinal;
    }),
    true,
    `review_operation_not_prior:${lesson.lessonOrdinal}`,
  );
}

const objectiveText = lessons
  .flatMap((lesson) => [lesson.titleRu, lesson.majorSystemId, lesson.terminalCanDoRu])
  .join(" ")
  .toLocaleLowerCase("ru");
assert.equal(/\bhello\b|\bname\b/.test(objectiveText), false, "lexical_item_used_as_lesson_objective");

process.stdout.write(
  `LEARNING V2 LESSON BLUEPRINTS V2 GATE: PASS lessons=${lessons.length} review_only_lessons=${lessons.filter((lesson) => lesson.checkpointOnly).length}\n`,
);
