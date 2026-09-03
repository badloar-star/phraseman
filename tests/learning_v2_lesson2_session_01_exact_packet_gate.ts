import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { validateLearningV2GeneratedSessionShardV1 } from "../modules/learning-v2/content/generator_session_shard";
import { evaluateLearningV2LearnerProjectionIntegrityV1 } from "../modules/learning-v2/content/source/learning_v2_learner_projection_integrity_v1";
import { learningV2NewWordCardEditorialV1 } from "../modules/learning-v2/content/source/learning_v2_new_word_card_editorial_v1";
import { evaluateLearningV2SessionContentQuality } from "../modules/learning-v2/content/source/learning_content_quality_gate_v1";
import { buildSessionChildBodiesFromShard } from "../modules/learning-v2/content/source/session_package_from_shard_v1";
import {
  buildSessionShardFromSource,
  type SessionSource,
} from "../modules/learning-v2/content/source/session_shard_from_source_v1";
import { LEARNING_V2_ENGLISH_EXACT_SESSION_PACKETS_V2 } from "../modules/learning-v2/curriculum/en/exact_session_packets_en_v2";
import { LEARNING_V2_ENGLISH_SESSION_LEXICAL_ASSIGNMENTS_V2 } from "../modules/learning-v2/curriculum/en/session_lexical_assignments_en_v2";

const locales = ["ru", "uk", "es", "pt-BR", "vi", "id", "tr", "pl"] as const;
const grammarOperationId = "en.grammar.present_be_questions_negatives.negation";
const words = ["sure", "interested", "comfortable"] as const;
const examples = [
  "I am not sure.",
  "She is not interested.",
  "We are not comfortable.",
] as const;
const exactFamilies = [
  "phrase_builder",
  "listen_choose",
  "context_gap_grammar",
  "speed_match",
  "listen_build_dictation",
  "phrase_builder",
  "scripted_repeat_compare",
  "context_gap_grammar",
  "listen_choose",
  "speed_match",
  "listen_build_dictation",
  "phrase_builder",
  "scripted_repeat_compare",
  "context_gap_grammar",
  "listen_choose",
  "speed_match",
  "scripted_repeat_compare",
] as const;

const packet = LEARNING_V2_ENGLISH_EXACT_SESSION_PACKETS_V2.find(
  (entry) => entry.sessionId === "lesson-02:session:01",
);
assert.ok(packet);
assert.equal(packet.absoluteSessionOrdinal, 57);
assert.equal(packet.role, "introduce_grammar");
assert.deepEqual(packet.grammarOperationIds, [grammarOperationId]);
assert.deepEqual(packet.reviewOperationIds, []);
assert.deepEqual(packet.prerequisiteSessionIds, ["lesson-01:session:33"]);
assert.deepEqual(packet.activityPlan.map((entry) => entry.modeFamily), exactFamilies);
assert.deepEqual(packet.activityPlan.slice(-2).map((entry) => entry.independentEvidence), [true, true]);
assert.ok(packet.forbiddenOperationIds.includes("en.grammar.present_be_questions_negatives.yes_no_questions"));
assert.ok(packet.forbiddenOperationIds.includes("en.grammar.present_be_questions_negatives.short_answers"));
assert.ok(packet.forbiddenOperationIds.includes("en.grammar.present_be_questions_negatives.wh_questions"));

const assignment = LEARNING_V2_ENGLISH_SESSION_LEXICAL_ASSIGNMENTS_V2.find(
  (entry) => entry.absoluteSessionOrdinal === 57,
);
assert.ok(assignment);
assert.deepEqual(assignment.newSenses.map((entry) => entry.english), words);
assert.deepEqual(assignment.retrievalSenseIds, [
  "en.responsible.adjective.01",
  "en.independent.adjective.01",
  "en.dependent.adjective.01",
]);
assert.deepEqual(assignment.canonicalExamples, examples);

const sourcePath = resolve(
  process.cwd(),
  "modules/learning-v2/content/source/episode_02_session_01_v1.ts",
);
assert.equal(existsSync(sourcePath), true, "lesson2_session01_source_missing");
const require = createRequire(import.meta.url);
const sourceModule = require(sourcePath) as Readonly<{
  EPISODE_02_SESSION_01_SOURCE: SessionSource;
}>;
const source = sourceModule.EPISODE_02_SESSION_01_SOURCE;

assert.equal(source.episodeOrdinal, 2);
assert.equal(source.requiredSessionOrdinal, 1);
assert.equal(source.sessionKindOverride, "words_then_phrases");
assert.equal(source.distractorAuthorship, "manual");
assert.equal(source.modeNativePlanId, "lesson2-session01-full-b1-exact-mode-native-v1");
assert.deepEqual(source.newVocabulary?.map((entry) => entry.target), words);
assert.deepEqual(source.phrases.slice(0, 3).map((entry) => entry.english), examples);
assert.deepEqual(source.introPages.map((page) => page.kind), ["concept", "formula", "trap"]);
assert.deepEqual(source.introPages.map((page) => page.question.grammarFeatureId), [
  grammarOperationId,
  grammarOperationId,
  grammarOperationId,
]);
assert.equal(new Set(source.introPages.map((page) => page.question.testedDimension)).size, 3);
assert.doesNotMatch(source.phrases.map((entry) => entry.english).join(" "), /\?/u);
assert.doesNotMatch(
  source.phrases.map((entry) => entry.english).join(" "),
  /\b(?:will|going\s+to|a|an|the|this|that|these|those)\b/iu,
);
assert.ok(source.phrases.every((phrase) => phrase.features.includes(grammarOperationId)));

for (const page of source.introPages) {
  for (const locale of locales) {
    assert.ok(page.title[locale]?.trim());
    assert.ok(page.body[locale]?.trim());
    assert.ok(page.question.prompt[locale]?.trim());
    assert.ok(page.question.explanation[locale]?.trim());
  }
}
for (const word of source.newVocabulary ?? []) {
  assert.equal(word.contacts.recognize.distractors.length, 3);
  assert.equal(word.contacts.retrieve_meaning.distractors.length, 3);
  assert.equal(word.contacts.build_form.distractors.length, 3);
  const editorial = learningV2NewWordCardEditorialV1({
    targetLanguage: "en",
    lexicalItemId: word.id,
    targetText: word.target,
  });
  for (const locale of locales) {
    assert.ok(word.meaning[locale]?.trim());
    assert.ok(editorial.playfulMeaningByLocale[locale]?.trim().length >= 45);
    for (const contact of Object.values(word.contacts)) {
      assert.ok(contact.guidance[locale]?.trim());
      for (const distractor of contact.distractors) {
        assert.ok(distractor.feedback[locale]?.trim());
      }
    }
  }
}

const practice = source.modeNativePractice ?? [];
assert.equal(practice.length, 17);
assert.deepEqual(practice.map((step) => step.family), exactFamilies);
assert.equal(
  new Set(practice.map((step) => `${JSON.stringify(step.target)}\0${step.family}`)).size,
  17,
);
for (const [wordIndex] of words.entries()) {
  const contacts = practice
    .map((step, index) => ({ step, index }))
    .filter(({ step }) => step.target.kind === "vocabulary" && step.target.sourceIndex === wordIndex);
  assert.deepEqual(contacts.slice(0, 3).map(({ step }) => step.learningStage), [
    "recognize",
    "retrieve_meaning",
    "build_form",
  ]);
  const firstPhraseIndex = practice.findIndex(
    (step) => step.target.kind === "phrase" && step.target.sourceIndex === wordIndex,
  );
  assert.ok(firstPhraseIndex > contacts[2]!.index, `${words[wordIndex]} phrase appeared before grounding`);
}
assert.deepEqual(practice.slice(-2).map((step) => step.purpose), [
  "independent_check",
  "independent_check",
]);
const finalPayload = practice.at(-1)?.modePayload;
assert.equal(finalPayload?.family, "scripted_repeat_compare");
assert.equal(
  finalPayload?.family === "scripted_repeat_compare" ? finalPayload.targetPhrase : null,
  "They are not dependent.",
);
assert.ok(!examples.includes("They are not dependent." as typeof examples[number]));

const speedBoards = practice
  .filter((step) => step.modePayload.family === "speed_match")
  .map((step) =>
    step.modePayload.family === "speed_match"
      ? step.modePayload.pairGrid.map((pair) => pair.target)
      : [],
  );
assert.equal(speedBoards.length, 3);
assert.equal(new Set(speedBoards.map((board) => JSON.stringify(board))).size, 3);
for (const board of speedBoards) assert.equal(board.length, 4);

for (const step of practice) {
  const payload = step.modePayload;
  if (payload.family === "phrase_builder" || payload.family === "listen_build_dictation") {
    const target = payload.family === "phrase_builder" ? payload.targetPhrase : payload.hiddenTargetPhrase;
    const wholeWords = target.match(/[A-Za-z]+(?:['’][A-Za-z]+)?/gu) ?? [];
    assert.ok(
      payload.orderedTokens.every((token) => wholeWords.includes(token)),
      `Letter assembly is forbidden in ${target}`,
    );
  }
  if (payload.family === "listen_choose" || payload.family === "context_gap_grammar") {
    assert.equal(payload.choiceFeedback.filter((entry) => entry.correct).length, 1);
    assert.equal(payload.choiceFeedback.filter((entry) => !entry.correct).length, 3);
    for (const entry of payload.choiceFeedback) {
      for (const locale of locales) assert.ok(entry.feedbackByLocale[locale]?.trim());
    }
  }
}

const shard = buildSessionShardFromSource(source);
assert.doesNotThrow(() =>
  validateLearningV2GeneratedSessionShardV1(shard, {
    packageId: shard.packageId,
    targetLanguage: shard.targetLanguage,
    episodeOrdinal: shard.episodeOrdinal,
    requiredSessionOrdinal: shard.requiredSessionOrdinal,
    generationInputFingerprint: shard.generationInputFingerprint,
  }),
);
for (const locale of locales) {
  const children = buildSessionChildBodiesFromShard(shard, locale, "lesson-02:session:01");
  assert.deepEqual(
    evaluateLearningV2LearnerProjectionIntegrityV1({
      learnerChild: children.learner,
      evaluatorCapsuleChild: children.evaluatorCapsule,
      auxiliaryChild: children.auxiliary,
    }).issues,
    [],
  );
}
const report = evaluateLearningV2SessionContentQuality(source);
const reviewOnly = new Set([
  "quality_review_missing",
  "quality_review_stale",
  "quality_review_rejected",
  "quality_review_not_independent",
  "locale_review_missing",
]);
assert.deepEqual(report.issues.filter((issue) => !reviewOnly.has(issue.code)), []);

process.stdout.write("LEARNING V2 LESSON 2 SESSION 1 EXACT PACKET GATE: PASS\n");
