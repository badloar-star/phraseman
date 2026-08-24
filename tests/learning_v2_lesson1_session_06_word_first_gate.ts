import assert from 'node:assert/strict';
import { EPISODE_01_SESSION_06_SOURCE } from '../modules/learning-v2/content/source/episode_01_session_06_v1';
import { buildSessionShardFromSource } from '../modules/learning-v2/content/source/session_shard_from_source_v1';
import { buildSessionChildBodiesFromShard } from '../modules/learning-v2/content/source/session_package_from_shard_v1';
import { validateLearningV2GeneratedSessionShardV1 } from '../modules/learning-v2/content/generator_session_shard';
import { evaluateLearningV2SessionContentQuality } from '../modules/learning-v2/content/source/learning_content_quality_gate_v1';

const locales = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
const vocabulary = ['a', 'an', 'teacher', 'artist'] as const;
const wordContactOrder = [...vocabulary, ...vocabulary, ...vocabulary];
const phrases = ['I am a teacher', "I'm a teacher", 'I am an artist', "I'm an artist"] as const;

assert.equal(EPISODE_01_SESSION_06_SOURCE.distractorAuthorship, 'manual');
assert.equal(EPISODE_01_SESSION_06_SOURCE.sessionKindOverride, 'words_then_phrases');
assert.deepEqual(EPISODE_01_SESSION_06_SOURCE.newVocabulary?.map((entry) => entry.target), vocabulary);
assert.deepEqual(EPISODE_01_SESSION_06_SOURCE.phrases.map((phrase) => phrase.english), phrases);
assert.deepEqual(EPISODE_01_SESSION_06_SOURCE.introPages.map((page) => page.kind), ['concept', 'formula', 'trap']);

for (const page of EPISODE_01_SESSION_06_SOURCE.introPages) {
  assert.doesNotMatch(
    [...Object.values(page.body), ...page.question.choices.flatMap((choice) => Object.values(choice))].join(' '),
    /(?<!\p{L})(?:teacher|artist)(?!\p{L})/iu,
    'Profession nouns must receive standalone contacts before appearing in a phrase or intro question',
  );
  for (const locale of locales) {
    assert.ok(page.body[locale]?.trim());
    assert.equal(page.bodyRuns?.[locale]?.map((run) => run.text).join(''), page.body[locale]);
    assert.ok(page.bodyRuns?.[locale]?.some((run) => run.semantic === 'targetCorrect'));
  }
}

for (const entry of EPISODE_01_SESSION_06_SOURCE.newVocabulary ?? []) {
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

for (const phrase of EPISODE_01_SESSION_06_SOURCE.phrases) {
  for (const word of phrase.words) assert.equal(word.distractors.length, 2);
  for (const locale of locales) {
    const detail = phrase.localizedDetails?.[locale];
    assert.ok(detail?.meaning.trim());
    assert.ok(detail?.explanation.trim());
    assert.equal(detail?.words.length, phrase.words.length);
    assert.ok(detail?.words.every((word) => word.distractors.length === 2));
  }
}

const shard = buildSessionShardFromSource(EPISODE_01_SESSION_06_SOURCE);
assert.equal(shard.cards.length, 20);
assert.deepEqual(shard.cards.slice(3, 15).map((card) => card.contentItem.target.text), wordContactOrder);
assert.deepEqual(shard.cards.slice(15).map((card) => card.contentItem.target.text), [
  'I am a teacher', "I'm a teacher", 'I am an artist', "I'm an artist", 'I am a teacher',
]);
assert.doesNotThrow(() => validateLearningV2GeneratedSessionShardV1(shard, {
  packageId: shard.packageId,
  targetLanguage: shard.targetLanguage,
  episodeOrdinal: shard.episodeOrdinal,
  requiredSessionOrdinal: shard.requiredSessionOrdinal,
  generationInputFingerprint: shard.generationInputFingerprint,
}));

for (const locale of locales) {
  const learner = buildSessionChildBodiesFromShard(shard, locale, 'lesson-01:session:06').learner;
  assert.equal(learner.interactions.length, 17);
  const targets = learner.interactions.map((interaction) =>
    shard.cards.find((card) => card.cardId === interaction.interactionId)?.contentItem.target.text);
  assert.deepEqual(targets.slice(0, 12), wordContactOrder);
  assert.deepEqual(targets.slice(12), [
    'I am a teacher', "I'm a teacher", 'I am an artist', "I'm an artist", 'I am a teacher',
  ]);
}

const report = evaluateLearningV2SessionContentQuality(EPISODE_01_SESSION_06_SOURCE);
const reviewOnly = new Set([
  'quality_review_missing', 'quality_review_stale', 'quality_review_rejected',
  'quality_review_not_independent', 'locale_review_missing',
]);
assert.deepEqual(
  report.issues.filter((issue) => !reviewOnly.has(issue.code)),
  [],
  'Session 6 must have no deterministic quality blocker before autopass',
);

process.stdout.write('LEARNING V2 SESSION 6 WORD-FIRST GATE: PASS\n');
