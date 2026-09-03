import assert from "node:assert/strict";

import { LEARNING_V2_ENGLISH_CHAPTER_BLUEPRINTS_V2 } from "../modules/learning-v2/curriculum/en/chapter_blueprints_en_v2";
import { LEARNING_V2_ENGLISH_GRAMMAR_OPERATIONS_V2 } from "../modules/learning-v2/curriculum/en/grammar_operations_en_v2";

const pluralNounsId = "en.grammar.nouns_core_determiners.plural_nouns";
const zeroArticleId = "en.grammar.nouns_core_determiners.zero_article";
const demonstrativesId = "en.grammar.nouns_core_determiners.demonstratives";
const operations = LEARNING_V2_ENGLISH_GRAMMAR_OPERATIONS_V2;
const pluralIndex = operations.findIndex((operation) => operation.id === pluralNounsId);
const zeroIndex = operations.findIndex((operation) => operation.id === zeroArticleId);

assert.ok(pluralIndex >= 0, "lesson3_plural_nouns_operation_missing");
assert.ok(zeroIndex >= 0, "lesson3_zero_article_operation_missing");
assert.ok(pluralIndex < zeroIndex, "lesson3_zero_article_requires_prior_plural_nouns");

const lesson3Chapters = LEARNING_V2_ENGLISH_CHAPTER_BLUEPRINTS_V2
  .filter((chapter) => chapter.lessonOrdinal === 3)
  .sort((left, right) => left.chapterOrdinal - right.chapterOrdinal);
const pluralChapter = lesson3Chapters.find((chapter) => chapter.newOperationIds.includes(pluralNounsId));
const zeroArticleChapter = lesson3Chapters.find((chapter) => chapter.newOperationIds.includes(zeroArticleId));

assert.ok(pluralChapter, "lesson3_plural_nouns_chapter_missing");
assert.ok(zeroArticleChapter, "lesson3_zero_article_chapter_missing");
assert.ok(
  pluralChapter.chapterOrdinal < zeroArticleChapter.chapterOrdinal,
  "lesson3_zero_article_chapter_must_follow_plural_nouns",
);

const pluralOperation = operations[pluralIndex];
assert.equal(
  /\b(?:these|those)\b/i.test(pluralOperation.positiveExamples.join(" ")),
  false,
  "lesson3_plural_nouns_examples_must_not_use_future_demonstratives",
);
const demonstrativeChapter = lesson3Chapters.find((chapter) =>
  chapter.newOperationIds.includes(demonstrativesId),
);
assert.ok(demonstrativeChapter, "lesson3_demonstratives_chapter_missing");
assert.ok(
  pluralChapter.chapterOrdinal < demonstrativeChapter.chapterOrdinal,
  "lesson3_plural_nouns_chapter_must_precede_demonstratives",
);

process.stdout.write("LEARNING V2 LESSON 3 NOUN PREREQUISITE GATE V2: PASS\n");
