import assert from 'node:assert/strict';
import { EPISODE_01_SESSION_03_SOURCE } from '../modules/learning-v2/content/source/episode_01_session_03_v1';
import { buildSessionShardFromSource } from '../modules/learning-v2/content/source/session_shard_from_source_v1';
import { validateLearningV2GeneratedSessionShardV1 } from '../modules/learning-v2/content/generator_session_shard';
import { evaluateLearningV2SessionContentQuality } from '../modules/learning-v2/content/source/learning_content_quality_gate_v1';
import { buildSessionChildBodiesFromShard } from '../modules/learning-v2/content/source/session_package_from_shard_v1';
import { evaluateLearningV2LearnerProjectionIntegrityV1 } from '../modules/learning-v2/content/source/learning_v2_learner_projection_integrity_v1';

const locales = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
const expectedVocabulary = ['busy', 'free', 'late'];
const expectedPhrases = ['I am busy', 'I am free', 'I am late'];
const expectedFamilies = [
  'scripted_repeat_compare', 'listen_choose', 'scripted_repeat_compare', 'speed_match',
  'phrase_builder', 'listen_build_dictation', 'context_gap_grammar',
] as const;

assert.equal(EPISODE_01_SESSION_03_SOURCE.requiredSessionOrdinal, 3);
assert.equal(EPISODE_01_SESSION_03_SOURCE.sessionKindOverride, 'phrases');
assert.equal(EPISODE_01_SESSION_03_SOURCE.distractorAuthorship, 'manual');
assert.equal(EPISODE_01_SESSION_03_SOURCE.generationInputFingerprint, 'owner-full-b1-e01-s03-v2');
assert.deepEqual(EPISODE_01_SESSION_03_SOURCE.newVocabulary?.map((word) => word.target), expectedVocabulary);
assert.deepEqual(EPISODE_01_SESSION_03_SOURCE.phrases.map((phrase) => phrase.english), expectedPhrases);
assert.doesNotMatch(
  [
    ...EPISODE_01_SESSION_03_SOURCE.phrases.map((phrase) => phrase.english),
    ...EPISODE_01_SESSION_03_SOURCE.introPages.flatMap((page) => page.question.choices.map((choice) => choice.ru)),
  ].join('\n'),
  /\bnot\b|\bI['’]m\b|\b(?:am[ \t]+I|are[ \t]+you)\b|\b(?:a|an|the)\b/iu,
  'Session 3 must not leak negation, contractions, questions, or articles',
);
assert.deepEqual(EPISODE_01_SESSION_03_SOURCE.introPages.map((page) => page.kind), ['concept', 'formula', 'trap']);

const practice = EPISODE_01_SESSION_03_SOURCE.modeNativePractice ?? [];
assert.deepEqual(practice.map((entry) => entry.family), expectedFamilies);
assert.equal(practice.filter((entry) => entry.family === 'speed_match').length, 1, 'Only one Speed Match is allowed');
for (let index = 1; index < practice.length; index += 1) {
  assert.notEqual(practice[index]?.family, practice[index - 1]?.family);
  assert.equal(practice[index]?.modePayload.family, practice[index]?.family);
}
const speed = practice.find((entry) => entry.family === 'speed_match')?.modePayload;
assert.ok(speed?.family === 'speed_match');
if (speed?.family === 'speed_match') {
  assert.equal(speed.pairGrid.length, 4);
  assert.equal(new Set(speed.pairGrid.map((pair) => pair.target)).size, 4, 'Each retrieval pair must be unique');
}

const shard = buildSessionShardFromSource(EPISODE_01_SESSION_03_SOURCE);
assert.equal(shard.cards.length, 10);
assert.deepEqual(shard.cards.slice(3).map((card) => card.family), expectedFamilies);
assert.doesNotThrow(() => validateLearningV2GeneratedSessionShardV1(shard, {
  packageId: shard.packageId,
  targetLanguage: shard.targetLanguage,
  episodeOrdinal: shard.episodeOrdinal,
  requiredSessionOrdinal: shard.requiredSessionOrdinal,
  generationInputFingerprint: shard.generationInputFingerprint,
}));

for (const locale of locales) {
  const children = buildSessionChildBodiesFromShard(shard, locale, 'lesson-01:session:03');
  assert.deepEqual(children.learner.interactions.map((interaction) => interaction.family), expectedFamilies);
  assert.deepEqual(
    evaluateLearningV2LearnerProjectionIntegrityV1({
      learnerChild: children.learner,
      evaluatorCapsuleChild: children.evaluatorCapsule,
      auxiliaryChild: children.auxiliary,
    }).issues,
    [],
    `Learner projection must preserve the exact package for ${locale}`,
  );
}

const report = evaluateLearningV2SessionContentQuality(EPISODE_01_SESSION_03_SOURCE);
const reviewOnly = new Set([
  'quality_review_missing', 'quality_review_stale', 'quality_review_rejected',
  'quality_review_not_independent', 'locale_review_missing',
]);
assert.deepEqual(report.issues.filter((issue) => !reviewOnly.has(issue.code)), []);

process.stdout.write('LEARNING V2 SESSION 3 FULL B1 EXACT-PACKET GATE: PASS\n');
