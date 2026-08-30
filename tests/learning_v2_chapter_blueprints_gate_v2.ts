import assert from "node:assert/strict";

import { LEARNING_V2_ENGLISH_CHAPTER_BLUEPRINTS_V2 } from "../modules/learning-v2/curriculum/en/chapter_blueprints_en_v2";
import { LEARNING_V2_ENGLISH_GRAMMAR_OPERATIONS_V2 } from "../modules/learning-v2/curriculum/en/grammar_operations_en_v2";
import { LEARNING_V2_ENGLISH_LESSON_BLUEPRINTS_V2 } from "../modules/learning-v2/curriculum/en/lesson_blueprints_en_v2";

const chapters = LEARNING_V2_ENGLISH_CHAPTER_BLUEPRINTS_V2;
const operationById = new Map(LEARNING_V2_ENGLISH_GRAMMAR_OPERATIONS_V2.map((operation) => [operation.id, operation]));
let unknownOperations = 0;
let futureOperations = 0;

assert.equal(chapters.length, 224, "chapter_blueprints_must_have_224_chapters");
assert.equal(new Set(chapters.map((chapter) => chapter.chapterId)).size, 224, "chapter_ids_must_be_unique");

for (const lesson of LEARNING_V2_ENGLISH_LESSON_BLUEPRINTS_V2) {
  const lessonChapters = chapters.filter((chapter) => chapter.lessonOrdinal === lesson.lessonOrdinal);
  assert.deepEqual(
    lessonChapters.map((chapter) => chapter.chapterOrdinal),
    [1, 2, 3, 4, 5, 6, 7],
    `chapter_ordinals_invalid:${lesson.lessonOrdinal}`,
  );
  assert.equal(
    lessonChapters.every((chapter) => chapter.majorSystemId === lesson.majorSystemId),
    true,
    `chapter_major_system_mismatch:${lesson.lessonOrdinal}`,
  );
  assert.equal(
    lessonChapters.every((chapter) => chapter.newOperationIds.length + chapter.reviewOperationIds.length > 0),
    true,
    `empty_chapter_learning_step:${lesson.lessonOrdinal}`,
  );
  assert.deepEqual(
    lessonChapters.flatMap((chapter) => chapter.newOperationIds),
    lesson.ownedGrammarOperationIds,
    `lesson_operations_not_distributed_once:${lesson.lessonOrdinal}`,
  );
}

for (const chapter of chapters) {
  for (const operationId of [...chapter.newOperationIds, ...chapter.reviewOperationIds, ...chapter.prohibitedOperationIds]) {
    const operation = operationById.get(operationId);
    if (!operation) {
      unknownOperations += 1;
      continue;
    }
    if (chapter.newOperationIds.includes(operationId) && operation.lessonOrdinal !== chapter.lessonOrdinal) {
      futureOperations += 1;
    }
    if (chapter.reviewOperationIds.includes(operationId) && operation.lessonOrdinal > chapter.lessonOrdinal) {
      futureOperations += 1;
    }
  }
}

assert.equal(unknownOperations, 0, "chapter_blueprint_unknown_operations");
assert.equal(futureOperations, 0, "chapter_blueprint_future_operations");

process.stdout.write(
  `LEARNING V2 CHAPTER BLUEPRINTS V2 GATE: PASS chapters=${chapters.length} unknown_operations=${unknownOperations} future_operations=${futureOperations}\n`,
);
