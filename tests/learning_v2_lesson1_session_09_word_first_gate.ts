import assert from 'node:assert/strict';
import { EPISODE_01_SESSION_09_SOURCE } from '../modules/learning-v2/content/source/episode_01_session_09_v1';
import { buildSessionShardFromSource } from '../modules/learning-v2/content/source/session_shard_from_source_v1';
import { buildSessionChildBodiesFromShard } from '../modules/learning-v2/content/source/session_package_from_shard_v1';
import { validateLearningV2GeneratedSessionShardV1 } from '../modules/learning-v2/content/generator_session_shard';
import { evaluateLearningV2SessionContentQuality } from '../modules/learning-v2/content/source/learning_content_quality_gate_v1';

const locales = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
const vocabulary = ['you', 'are'] as const;
const phrases = [
  'You are here', 'You are ready', 'You are happy', 'You are sad', 'You are tired',
  'You are fine', 'You are busy', 'You are a teacher', 'You are an artist',
] as const;

assert.equal(EPISODE_01_SESSION_09_SOURCE.requiredSessionOrdinal, 9);
assert.equal(EPISODE_01_SESSION_09_SOURCE.sessionKindOverride, 'phrases');
assert.equal(EPISODE_01_SESSION_09_SOURCE.distractorAuthorship, 'manual');
assert.deepEqual(EPISODE_01_SESSION_09_SOURCE.newVocabulary?.map((entry) => entry.target), vocabulary);
assert.deepEqual(EPISODE_01_SESSION_09_SOURCE.phrases.map((phrase) => phrase.english), phrases);
assert.deepEqual(EPISODE_01_SESSION_09_SOURCE.introPages.map((page) => page.kind), ['concept', 'formula', 'trap']);

for (const page of EPISODE_01_SESSION_09_SOURCE.introPages) {
  for (const locale of locales) {
    assert.ok(page.body[locale]?.trim());
    assert.equal(page.bodyRuns?.[locale]?.map((run) => run.text).join(''), page.body[locale]);
    assert.ok(page.bodyRuns?.[locale]?.some((run) => run.semantic === 'targetCorrect'));
  }
}

for (const entry of EPISODE_01_SESSION_09_SOURCE.newVocabulary ?? []) {
  assert.deepEqual(Object.keys(entry.contacts), ['recognize', 'retrieve_meaning', 'build_form']);
  for (const contact of Object.values(entry.contacts)) {
    assert.equal(contact.distractors.length, 2);
    for (const locale of locales) {
      assert.ok(contact.guidance[locale]?.trim());
      for (const trap of contact.distractors) {
        const feedback = trap.feedback[locale]?.toLocaleLowerCase('en') ?? '';
        assert.ok(feedback.includes(trap.value.toLocaleLowerCase('en')));
        assert.ok(feedback.includes(entry.target));
      }
    }
  }
}

for (const phrase of EPISODE_01_SESSION_09_SOURCE.phrases) {
  assert.doesNotMatch(phrase.english, /\bnot\b|\?/iu);
  for (const word of phrase.words) assert.equal(word.distractors.length, 2);
  for (const locale of locales) {
    const detail = phrase.localizedDetails?.[locale];
    assert.ok(detail?.meaning.trim());
    assert.ok(detail?.explanation.trim());
    assert.equal(detail?.words.length, phrase.words.length);
  }
}

const shard = buildSessionShardFromSource(EPISODE_01_SESSION_09_SOURCE);
assert.equal(shard.cards.length, 20);
assert.deepEqual(shard.cards.slice(3, 9).map((card) => card.contentItem.target.text), ['you', 'are', 'you', 'are', 'you', 'are']);
assert.deepEqual(shard.cards.slice(9).map((card) => card.contentItem.target.text), [
  ...phrases, phrases[0], phrases[1],
]);
assert.doesNotThrow(() => validateLearningV2GeneratedSessionShardV1(shard, {
  packageId: shard.packageId,
  targetLanguage: shard.targetLanguage,
  episodeOrdinal: shard.episodeOrdinal,
  requiredSessionOrdinal: shard.requiredSessionOrdinal,
  generationInputFingerprint: shard.generationInputFingerprint,
}));

for (const locale of locales) {
  const learner = buildSessionChildBodiesFromShard(shard, locale, 'lesson-01:session:09').learner;
  assert.equal(learner.interactionProfile, 'rapid');
  assert.equal(learner.interactions.length, 17);
}

const report = evaluateLearningV2SessionContentQuality(EPISODE_01_SESSION_09_SOURCE);
const reviewOnly = new Set([
  'quality_review_missing', 'quality_review_stale', 'quality_review_rejected',
  'quality_review_not_independent', 'locale_review_missing',
]);
assert.deepEqual(report.issues.filter((issue) => !reviewOnly.has(issue.code)), []);

process.stdout.write('LEARNING V2 SESSION 9 WORD-FIRST GATE: PASS\n');
