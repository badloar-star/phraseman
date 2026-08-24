import assert from 'node:assert/strict';
import { AUTHORED_EPISODE_01_SESSIONS } from '../modules/learning-v2/content/source/authored_sessions_v1';
import { EPISODE_01_SESSION_08_SOURCE } from '../modules/learning-v2/content/source/episode_01_session_08_v1';
import { buildSessionShardFromSource } from '../modules/learning-v2/content/source/session_shard_from_source_v1';
import { buildSessionChildBodiesFromShard } from '../modules/learning-v2/content/source/session_package_from_shard_v1';
import { validateLearningV2GeneratedSessionShardV1 } from '../modules/learning-v2/content/generator_session_shard';
import { evaluateLearningV2SessionContentQuality } from '../modules/learning-v2/content/source/learning_content_quality_gate_v1';

const locales = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
const phrases = [
  'I am here', 'I am ready', 'I am not sad',
  "I'm not happy", 'I am not tired', "I'm not fine", 'I am not busy', "I'm not here", "I'm not ready",
  'I am a teacher', "I'm an artist", 'I am happy', "I'm tired", 'I am fine', "I'm busy",
] as const;

assert.equal(EPISODE_01_SESSION_08_SOURCE.requiredSessionOrdinal, 8);
assert.equal(EPISODE_01_SESSION_08_SOURCE.sessionKindOverride, 'checkpoint');
assert.equal(EPISODE_01_SESSION_08_SOURCE.distractorAuthorship, 'manual');
assert.equal(EPISODE_01_SESSION_08_SOURCE.newVocabulary, undefined);
assert.deepEqual(EPISODE_01_SESSION_08_SOURCE.phrases.map((phrase) => phrase.english), phrases);
assert.deepEqual(EPISODE_01_SESSION_08_SOURCE.introPages.map((page) => page.kind), ['concept', 'formula', 'trap']);

const priorPhrases = new Set(
  AUTHORED_EPISODE_01_SESSIONS.slice(0, 7).flatMap((source) => source.phrases.map((phrase) => phrase.english)),
);
for (const target of phrases.slice(3, 9)) assert.ok(!priorPhrases.has(target), `${target} must be an unseen recombination`);

for (const page of EPISODE_01_SESSION_08_SOURCE.introPages) {
  for (const locale of locales) {
    assert.ok(page.body[locale]?.trim());
    assert.equal(page.bodyRuns?.[locale]?.map((run) => run.text).join(''), page.body[locale]);
    assert.ok(page.bodyRuns?.[locale]?.some((run) => run.semantic === 'targetCorrect'));
  }
}

for (const phrase of EPISODE_01_SESSION_08_SOURCE.phrases) {
  for (const word of phrase.words) assert.equal(word.distractors.length, 2);
  for (const locale of locales) {
    const detail = phrase.localizedDetails?.[locale];
    assert.ok(detail?.meaning.trim());
    assert.ok(detail?.explanation.trim());
    assert.equal(detail?.words.length, phrase.words.length);
    assert.ok(detail?.words.every((word) => word.distractors.length === 2));
  }
}

const shard = buildSessionShardFromSource(EPISODE_01_SESSION_08_SOURCE);
assert.equal(shard.cards.length, 15);
assert.deepEqual(shard.cards.slice(3).map((card) => card.contentItem.target.text), phrases.slice(3));
assert.doesNotThrow(() => validateLearningV2GeneratedSessionShardV1(shard, {
  packageId: shard.packageId,
  targetLanguage: shard.targetLanguage,
  episodeOrdinal: shard.episodeOrdinal,
  requiredSessionOrdinal: shard.requiredSessionOrdinal,
  generationInputFingerprint: shard.generationInputFingerprint,
}));

for (const locale of locales) {
  const learner = buildSessionChildBodiesFromShard(shard, locale, 'lesson-01:session:08').learner;
  assert.equal(learner.interactions.length, 12);
  assert.deepEqual(learner.interactions.map((entry) => entry.family), [
    'speed_match', 'listen_build_dictation', 'context_gap_grammar', 'phrase_builder',
    'listen_build_dictation', 'context_gap_grammar', 'phrase_builder', 'speed_match',
    'listen_build_dictation', 'context_gap_grammar', 'phrase_builder', 'speed_match',
  ]);
}
assert.ok(shard.cards.slice(3).every((card) => card.support === 'none'));

const report = evaluateLearningV2SessionContentQuality(EPISODE_01_SESSION_08_SOURCE);
const reviewOnly = new Set([
  'quality_review_missing', 'quality_review_stale', 'quality_review_rejected',
  'quality_review_not_independent', 'locale_review_missing',
]);
assert.deepEqual(report.issues.filter((issue) => !reviewOnly.has(issue.code)), []);

process.stdout.write('LEARNING V2 SESSION 8 CHECKPOINT GATE: PASS\n');
