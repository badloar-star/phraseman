import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { validateLearningV2GeneratedSessionShardV1 } from "../modules/learning-v2/content/generator_session_shard";
import { evaluateLearningV2LearnerProjectionIntegrityV1 } from "../modules/learning-v2/content/source/learning_v2_learner_projection_integrity_v1";
import { learningV2NewWordCardEditorialV1 } from "../modules/learning-v2/content/source/learning_v2_new_word_card_editorial_v1";
import { evaluateLearningV2SessionContentQuality } from "../modules/learning-v2/content/source/learning_content_quality_gate_v1";
import { buildSessionChildBodiesFromShard } from "../modules/learning-v2/content/source/session_package_from_shard_v1";
import { buildSessionShardFromSource, type SessionSource } from "../modules/learning-v2/content/source/session_shard_from_source_v1";
import { LEARNING_V2_ENGLISH_EXACT_SESSION_PACKETS_V2 } from "../modules/learning-v2/curriculum/en/exact_session_packets_en_v2";
import { LEARNING_V2_ENGLISH_SESSION_LEXICAL_ASSIGNMENTS_V2 } from "../modules/learning-v2/curriculum/en/session_lexical_assignments_en_v2";

const locales = ["ru", "uk", "es", "pt-BR", "vi", "id", "tr", "pl"] as const;
const negation = "en.grammar.present_be_questions_negatives.negation";
const contractions = "en.grammar.present_be_affirmative.contractions";
const words = ["confident", "relaxed", "satisfied"] as const;
const examples = ["He is not confident.", "They are not relaxed.", "I am not satisfied."] as const;
const families = [
  "phrase_builder", "listen_choose", "context_gap_grammar", "speed_match",
  "listen_build_dictation", "phrase_builder", "scripted_repeat_compare",
  "context_gap_grammar", "listen_choose", "speed_match", "listen_build_dictation",
  "phrase_builder", "scripted_repeat_compare", "context_gap_grammar",
  "listen_choose", "speed_match", "scripted_repeat_compare",
] as const;

const packet = LEARNING_V2_ENGLISH_EXACT_SESSION_PACKETS_V2.find(
  (entry) => entry.sessionId === "lesson-02:session:02",
);
assert.ok(packet);
assert.equal(packet.absoluteSessionOrdinal, 58);
assert.equal(packet.role, "introduce_or_guided_extension");
assert.deepEqual(packet.grammarOperationIds, []);
assert.deepEqual(packet.reviewOperationIds, [contractions, negation]);
assert.deepEqual(packet.prerequisiteSessionIds, ["lesson-01:session:25", "lesson-01:session:33"]);
assert.deepEqual(packet.activityPlan.map((entry) => entry.modeFamily), families);
assert.deepEqual(packet.activityPlan.slice(-2).map((entry) => entry.independentEvidence), [true, true]);

const assignment = LEARNING_V2_ENGLISH_SESSION_LEXICAL_ASSIGNMENTS_V2.find(
  (entry) => entry.absoluteSessionOrdinal === 58,
);
assert.ok(assignment);
assert.deepEqual(assignment.newSenses.map((entry) => entry.english), words);
assert.deepEqual(assignment.retrievalSenseIds, [
  "en.sure.adjective.01", "en.interested.adjective.01", "en.comfortable.adjective.01",
]);
assert.deepEqual(assignment.canonicalExamples, examples);

const sourcePath = resolve(process.cwd(), "modules/learning-v2/content/source/episode_02_session_02_v1.ts");
assert.equal(existsSync(sourcePath), true, "lesson2_session02_source_missing");
const source = (createRequire(import.meta.url)(sourcePath) as Readonly<{
  EPISODE_02_SESSION_02_SOURCE: SessionSource;
}>).EPISODE_02_SESSION_02_SOURCE;

assert.equal(source.episodeOrdinal, 2);
assert.equal(source.requiredSessionOrdinal, 2);
assert.equal(source.distractorAuthorship, "manual");
assert.equal(source.modeNativePlanId, "lesson2-session02-full-b1-exact-mode-native-v1");
assert.deepEqual(source.newVocabulary?.map((entry) => entry.target), words);
assert.deepEqual(source.phrases.slice(0, 3).map((entry) => entry.english), examples);
assert.deepEqual(source.introPages.map((page) => page.kind), ["concept", "formula", "trap"]);
assert.ok(source.introPages.every((page) => [contractions, negation].includes(page.question.grammarFeatureId)));
assert.equal(new Set(source.introPages.map((page) => page.question.testedDimension)).size, 3);

const learnerText = source.phrases.map((entry) => entry.english).join(" ");
assert.doesNotMatch(learnerText, /\?/u);
assert.doesNotMatch(learnerText, /\b(?:isn't|aren't|won't|will|going\s+to|a|an|the|this|that|these|those)\b/iu);
for (const page of source.introPages) {
  for (const locale of locales) {
    assert.ok(page.title[locale]?.trim());
    assert.ok(page.body[locale]?.trim());
    assert.ok(page.question.prompt[locale]?.trim());
    assert.ok(page.question.explanation[locale]?.trim());
  }
}
for (const word of source.newVocabulary ?? []) {
  const editorial = learningV2NewWordCardEditorialV1({ targetLanguage: "en", lexicalItemId: word.id, targetText: word.target });
  for (const locale of locales) {
    assert.ok(word.meaning[locale]?.trim());
    assert.ok(editorial.playfulMeaningByLocale[locale]?.trim().length >= 45);
    for (const contact of Object.values(word.contacts)) {
      assert.equal(contact.distractors.length, 3);
      assert.ok(contact.guidance[locale]?.trim());
      for (const distractor of contact.distractors) assert.ok(distractor.feedback[locale]?.trim());
    }
  }
}

const practice = source.modeNativePractice ?? [];
assert.equal(practice.length, 17);
assert.deepEqual(practice.map((step) => step.family), families);
assert.equal(new Set(practice.map((step) => `${JSON.stringify(step.target)}\0${step.family}`)).size, 17);
assert.deepEqual(practice.slice(-2).map((step) => step.purpose), ["independent_check", "independent_check"]);
const finalPayload = practice.at(-1)?.modePayload;
assert.equal(finalPayload?.family, "scripted_repeat_compare");
assert.equal(finalPayload?.family === "scripted_repeat_compare" ? finalPayload.targetPhrase : null, "We're not comfortable.");
for (const step of practice) {
  const payload = step.modePayload;
  if (payload.family === "phrase_builder" || payload.family === "listen_build_dictation") {
    const target = payload.family === "phrase_builder" ? payload.targetPhrase : payload.hiddenTargetPhrase;
    const wholeWords = target.match(/[A-Za-z]+(?:['’][A-Za-z]+)?/gu) ?? [];
    assert.ok(payload.orderedTokens.every((token) => wholeWords.includes(token)), `Letter assembly is forbidden in ${target}`);
  }
  if (payload.family === "listen_choose" || payload.family === "context_gap_grammar") {
    assert.equal(payload.choiceFeedback.filter((entry) => entry.correct).length, 1);
    assert.equal(payload.choiceFeedback.filter((entry) => !entry.correct).length, 3);
    if (payload.family === "listen_choose" && payload.referenceAudio.transcript.includes(" ")) {
      assert.ok(payload.localizedMeaningChoices.every((entry) => locales.every((locale) => entry.meaningByLocale[locale]?.trim())));
    }
  }
}

const shard = buildSessionShardFromSource(source);
assert.doesNotThrow(() => validateLearningV2GeneratedSessionShardV1(shard, {
  packageId: shard.packageId,
  targetLanguage: shard.targetLanguage,
  episodeOrdinal: shard.episodeOrdinal,
  requiredSessionOrdinal: shard.requiredSessionOrdinal,
  generationInputFingerprint: shard.generationInputFingerprint,
}));
for (const locale of locales) {
  const children = buildSessionChildBodiesFromShard(shard, locale, "lesson-02:session:02");
  assert.deepEqual(evaluateLearningV2LearnerProjectionIntegrityV1({
    learnerChild: children.learner,
    evaluatorCapsuleChild: children.evaluatorCapsule,
    auxiliaryChild: children.auxiliary,
  }).issues, []);
}
const reviewOnly = new Set(["quality_review_missing", "quality_review_stale", "quality_review_rejected", "quality_review_not_independent", "locale_review_missing"]);
assert.deepEqual(evaluateLearningV2SessionContentQuality(source).issues.filter((issue) => !reviewOnly.has(issue.code)), []);
process.stdout.write("LEARNING V2 LESSON 2 SESSION 2 EXACT PACKET GATE: PASS\n");
