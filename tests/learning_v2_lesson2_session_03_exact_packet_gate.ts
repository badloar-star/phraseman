import assert from "node:assert/strict";

import { validateLearningV2GeneratedSessionShardV1 } from "../modules/learning-v2/content/generator_session_shard";
import { evaluateLearningV2LearnerProjectionIntegrityV1 } from "../modules/learning-v2/content/source/learning_v2_learner_projection_integrity_v1";
import { learningV2NewWordCardEditorialV1 } from "../modules/learning-v2/content/source/learning_v2_new_word_card_editorial_v1";
import { buildSessionChildBodiesFromShard } from "../modules/learning-v2/content/source/session_package_from_shard_v1";
import { buildSessionShardFromSource } from "../modules/learning-v2/content/source/session_shard_from_source_v1";
import { EPISODE_02_SESSION_03_SOURCE } from "../modules/learning-v2/content/source/episode_02_session_03_v1";
import { LEARNING_V2_ENGLISH_EXACT_SESSION_PACKETS_V2 } from "../modules/learning-v2/curriculum/en/exact_session_packets_en_v2";
import { LEARNING_V2_ENGLISH_SESSION_LEXICAL_ASSIGNMENTS_V2 } from "../modules/learning-v2/curriculum/en/session_lexical_assignments_en_v2";

const locales = ["ru", "uk", "es", "pt-BR", "vi", "id", "tr", "pl"] as const;
const words = ["aware", "convinced", "concerned"] as const;
const examples = ["I am not aware.", "She is not convinced.", "We are not concerned."] as const;
const requiredFamilies = new Set([
  "phrase_builder", "listen_choose", "listen_build_dictation",
  "context_gap_grammar", "speed_match", "scripted_repeat_compare",
]);

const packet = LEARNING_V2_ENGLISH_EXACT_SESSION_PACKETS_V2.find(
  (entry) => entry.sessionId === "lesson-02:session:03",
);
assert.ok(packet);
assert.equal(packet.absoluteSessionOrdinal, 59);
assert.equal(packet.role, "introduce_or_diagnostic_contrast");
assert.deepEqual(packet.canonicalExamples, examples);

const assignment = LEARNING_V2_ENGLISH_SESSION_LEXICAL_ASSIGNMENTS_V2.find(
  (entry) => entry.absoluteSessionOrdinal === 59,
);
assert.ok(assignment);
assert.deepEqual(assignment.newSenses.map((entry) => entry.english), words);
assert.deepEqual(assignment.canonicalExamples, examples);

const source = EPISODE_02_SESSION_03_SOURCE;
assert.equal(source.episodeOrdinal, 2);
assert.equal(source.requiredSessionOrdinal, 3);
assert.equal(source.distractorAuthorship, "manual");
assert.equal(source.modeNativePlanId, "lesson2-session03-full-b1-exact-mode-native-v1");
assert.deepEqual(source.newVocabulary?.map((entry) => entry.target), words);
assert.deepEqual(source.phrases.slice(0, 3).map((entry) => entry.english), examples);
assert.deepEqual(source.introPages.map((page) => page.kind), ["concept", "formula", "trap"]);
assert.equal(new Set(source.introPages.map((page) => page.question.testedDimension)).size, 3);

for (const page of source.introPages) {
  for (const locale of locales) {
    assert.ok(page.title[locale]?.trim());
    assert.ok(page.body[locale]?.trim());
    assert.ok(page.question.prompt[locale]?.trim());
    assert.ok(page.question.explanation[locale]?.trim());
  }
}
for (const word of source.newVocabulary ?? []) {
  const editorial = learningV2NewWordCardEditorialV1({
    targetLanguage: "en", lexicalItemId: word.id, targetText: word.target,
  });
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
assert.deepEqual(new Set(practice.map((step) => step.family)), requiredFamilies);
assert.deepEqual(practice.slice(-2).map((step) => step.purpose), ["independent_check", "independent_check"]);
for (const step of practice) {
  const payload = step.modePayload;
  if (payload.family === "phrase_builder" || payload.family === "listen_build_dictation") {
    const target = payload.family === "phrase_builder" ? payload.targetPhrase : payload.hiddenTargetPhrase;
    const wordsOnly = target.match(/[A-Za-z]+(?:['’][A-Za-z]+)?/gu) ?? [];
    assert.ok(payload.orderedTokens.every((token) => wordsOnly.includes(token)), `letter_assembly_forbidden:${target}`);
  }
  if (payload.family === "listen_choose" || payload.family === "context_gap_grammar") {
    assert.equal(payload.choiceFeedback.filter((entry) => entry.correct).length, 1);
    assert.equal(payload.choiceFeedback.filter((entry) => !entry.correct).length, 3);
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
  const children = buildSessionChildBodiesFromShard(shard, locale, "lesson-02:session:03");
  assert.deepEqual(evaluateLearningV2LearnerProjectionIntegrityV1({
    learnerChild: children.learner,
    evaluatorCapsuleChild: children.evaluatorCapsule,
    auxiliaryChild: children.auxiliary,
  }).issues, []);
}
process.stdout.write("LEARNING V2 LESSON 2 SESSION 3 EXACT PACKET GATE: PASS\n");
