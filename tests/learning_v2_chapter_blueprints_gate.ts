import assert from "node:assert/strict";

import { LEARNING_V2_ENGLISH_CHAPTER_BLUEPRINTS_V1 } from "../modules/learning-v2/curriculum/en/chapter_blueprints_en_v1";
import { LEARNING_V2_ENGLISH_GRAMMAR_OPERATIONS_V1 } from "../modules/learning-v2/curriculum/en/grammar_operations_en_v1";

const chapters = LEARNING_V2_ENGLISH_CHAPTER_BLUEPRINTS_V1;
const operations = LEARNING_V2_ENGLISH_GRAMMAR_OPERATIONS_V1;
const operationById = new Map(operations.map((operation) => [operation.id, operation]));

assert.equal(chapters.length, 224, "course must contain exactly 224 chapter blueprints");
assert.equal(new Set(chapters.map((chapter) => chapter.chapterId)).size, 224, "chapter ids must be unique");

for (let lessonOrdinal = 1; lessonOrdinal <= 32; lessonOrdinal += 1) {
  const lessonChapters = chapters.filter((chapter) => chapter.lessonOrdinal === lessonOrdinal);
  assert.equal(lessonChapters.length, 7, `lesson ${lessonOrdinal} must contain exactly seven chapters`);
  assert.deepEqual(
    lessonChapters.map((chapter) => chapter.chapterOrdinal),
    [1, 2, 3, 4, 5, 6, 7],
    `lesson ${lessonOrdinal} chapter ordinals must be complete and ordered`,
  );
}

for (const chapter of chapters) {
  assert.match(chapter.chapterId, /^lesson-\d{2}:chapter:\d{2}$/);
  assert.ok(chapter.title.trim().length >= 3, `${chapter.chapterId} needs a concrete title`);
  assert.ok(chapter.primaryCanDoStep.trim().length >= 10, `${chapter.chapterId} needs a concrete can-do step`);
  assert.ok(chapter.lexicalDomain.trim().length >= 3, `${chapter.chapterId} needs a lexical domain`);
  assert.ok(chapter.lexicalMission.trim().length >= 20, `${chapter.chapterId} needs a lexical mission`);
  assert.ok(chapter.independentEvidence.trim().length >= 20, `${chapter.chapterId} needs independent evidence`);
  assert.ok(chapter.sourceEvidenceRefs.length > 0, `${chapter.chapterId} needs evidence refs`);

  const hasNewOperation = chapter.grammarOperationId !== null;
  const hasReview = chapter.reviewConstructIds.length > 0;
  assert.notEqual(hasNewOperation, hasReview, `${chapter.chapterId} must introduce one operation or review known operations`);

  if (chapter.grammarOperationId) {
    const operation = operationById.get(chapter.grammarOperationId);
    assert.ok(operation, `${chapter.chapterId} references an unknown grammar operation`);
    assert.equal(operation.lessonOrdinal, chapter.lessonOrdinal, `${chapter.chapterId} introduces grammar outside its lesson boundary`);
  }

  for (const reviewId of chapter.reviewConstructIds) {
    const operation = operationById.get(reviewId);
    assert.ok(operation, `${chapter.chapterId} reviews an unknown grammar operation`);
    assert.ok(operation.lessonOrdinal <= chapter.lessonOrdinal, `${chapter.chapterId} reviews future grammar`);
  }
}

const introducedOperationIds = chapters
  .map((chapter) => chapter.grammarOperationId)
  .filter((operationId): operationId is string => operationId !== null);
assert.equal(
  new Set(introducedOperationIds).size,
  introducedOperationIds.length,
  "each grammar operation must have one introduction chapter",
);
assert.deepEqual(
  new Set(introducedOperationIds),
  new Set(operations.map((operation) => operation.id)),
  "all grammar operations must be assigned to an introduction chapter",
);

for (const checkpointLesson of [8, 16, 24, 31, 32]) {
  assert.ok(
    chapters
      .filter((chapter) => chapter.lessonOrdinal === checkpointLesson)
      .every((chapter) => chapter.grammarOperationId === null),
    `lesson ${checkpointLesson} must remain review-only`,
  );
}

console.log("learning_v2_chapter_blueprints_gate: PASS");
