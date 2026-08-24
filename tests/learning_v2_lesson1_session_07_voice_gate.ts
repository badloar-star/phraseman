import assert from 'node:assert/strict';
import { EPISODE_01_SESSION_07_SOURCE } from '../modules/learning-v2/content/source/episode_01_session_07_v1';
import { buildSessionShardFromSource } from '../modules/learning-v2/content/source/session_shard_from_source_v1';
import { buildSessionChildBodiesFromShard } from '../modules/learning-v2/content/source/session_package_from_shard_v1';
import { validateLearningV2GeneratedSessionShardV1 } from '../modules/learning-v2/content/generator_session_shard';
import { evaluateLearningV2SessionContentQuality } from '../modules/learning-v2/content/source/learning_content_quality_gate_v1';

const locales = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
const phrases = [
  'I am here', 'I am ready', 'I am not here', 'I am happy', "I'm tired",
  'I am not ready', "I'm busy", 'I am a teacher', "I'm an artist",
  'I am fine', "I'm ready", 'I am not sad', "I'm happy", 'I am tired', "I'm not busy",
] as const;

assert.equal(EPISODE_01_SESSION_07_SOURCE.requiredSessionOrdinal, 7);
assert.equal(EPISODE_01_SESSION_07_SOURCE.sessionKindOverride, 'voice');
assert.equal(EPISODE_01_SESSION_07_SOURCE.distractorAuthorship, 'manual');
assert.equal(EPISODE_01_SESSION_07_SOURCE.newVocabulary, undefined);
assert.deepEqual(EPISODE_01_SESSION_07_SOURCE.phrases.map((phrase) => phrase.english), phrases);
assert.deepEqual(EPISODE_01_SESSION_07_SOURCE.introPages.map((page) => page.kind), ['concept', 'formula', 'trap']);

for (const page of EPISODE_01_SESSION_07_SOURCE.introPages) {
  for (const locale of locales) {
    assert.ok(page.body[locale]?.trim());
    assert.equal(page.bodyRuns?.[locale]?.map((run) => run.text).join(''), page.body[locale]);
    assert.ok(page.bodyRuns?.[locale]?.some((run) => run.semantic === 'targetCorrect'));
  }
}

for (const phrase of EPISODE_01_SESSION_07_SOURCE.phrases) {
  for (const word of phrase.words) assert.equal(word.distractors.length, 2);
  for (const locale of locales) {
    const detail = phrase.localizedDetails?.[locale];
    assert.ok(detail?.meaning.trim());
    assert.ok(detail?.explanation.trim());
    assert.equal(detail?.words.length, phrase.words.length);
    assert.ok(detail?.words.every((word) => word.distractors.length === 2));
  }
}

const shard = buildSessionShardFromSource(EPISODE_01_SESSION_07_SOURCE);
assert.equal(shard.cards.length, 12);
assert.deepEqual(shard.cards.slice(3).map((card) => card.contentItem.target.text), phrases.slice(3, 12));
assert.doesNotThrow(() => validateLearningV2GeneratedSessionShardV1(shard, {
  packageId: shard.packageId,
  targetLanguage: shard.targetLanguage,
  episodeOrdinal: shard.episodeOrdinal,
  requiredSessionOrdinal: shard.requiredSessionOrdinal,
  generationInputFingerprint: shard.generationInputFingerprint,
}));

for (const locale of locales) {
  const learner = buildSessionChildBodiesFromShard(shard, locale, 'lesson-01:session:07').learner;
  assert.equal(learner.interactionProfile, 'voice_heavy');
  assert.equal(learner.interactions.length, 9);
  assert.deepEqual(learner.interactions.map((entry) => entry.family), [
    'listen_choose', 'sound_contrast', 'scripted_repeat_compare',
    'scripted_repeat_compare', 'listen_build_dictation', 'scripted_repeat_compare',
    'sound_contrast', 'scripted_repeat_compare', 'listen_choose',
  ]);
  assert.equal(learner.interactions.filter((entry) => entry.inputMode === 'scripted_speech').length, 4);
}

const report = evaluateLearningV2SessionContentQuality(EPISODE_01_SESSION_07_SOURCE);
const reviewOnly = new Set([
  'quality_review_missing', 'quality_review_stale', 'quality_review_rejected',
  'quality_review_not_independent', 'locale_review_missing',
]);
assert.deepEqual(report.issues.filter((issue) => !reviewOnly.has(issue.code)), []);

process.stdout.write('LEARNING V2 SESSION 7 VOICE GATE: PASS\n');
