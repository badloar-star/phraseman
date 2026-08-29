import assert from 'node:assert/strict';
import { EPISODE_01_SESSION_04_SOURCE } from '../modules/learning-v2/content/source/episode_01_session_04_v1';
import { buildSessionShardFromSource } from '../modules/learning-v2/content/source/session_shard_from_source_v1';
import { validateLearningV2GeneratedSessionShardV1 } from '../modules/learning-v2/content/generator_session_shard';
import { evaluateLearningV2SessionContentQuality } from '../modules/learning-v2/content/source/learning_content_quality_gate_v1';
import { buildSessionChildBodiesFromShard } from '../modules/learning-v2/content/source/session_package_from_shard_v1';

const locales = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
const phrases = ['You are set', 'You are done', 'You are free', 'You are here', 'You are ready', 'You are happy'] as const;
const activeFamilies = new Set([
  'phrase_builder', 'listen_choose', 'listen_build_dictation',
  'context_gap_grammar', 'speed_match', 'scripted_repeat_compare',
]);

assert.equal(EPISODE_01_SESSION_04_SOURCE.distractorAuthorship, 'manual');
assert.equal(EPISODE_01_SESSION_04_SOURCE.sessionKindOverride, 'words_then_phrases');
assert.deepEqual(
  EPISODE_01_SESSION_04_SOURCE.newVocabulary?.map((entry) => entry.target),
  ['set', 'done', 'free'],
  'Session 4 must add fresh readiness vocabulary without reissuing ready as new',
);
assert.deepEqual(EPISODE_01_SESSION_04_SOURCE.phrases.map((phrase) => phrase.english), phrases);
assert.deepEqual(EPISODE_01_SESSION_04_SOURCE.introPages.map((page) => page.kind), ['concept', 'formula', 'trap']);
assert.ok(EPISODE_01_SESSION_04_SOURCE.phrases.every((phrase) => phrase.features.includes('second_person')));
assert.ok(EPISODE_01_SESSION_04_SOURCE.introPages.every((page) => page.question.grammarFeatureId === 'second_person'));
assert.equal(new Set(EPISODE_01_SESSION_04_SOURCE.introPages.map((page) => page.question.testedDimension)).size, 3);
for (const page of EPISODE_01_SESSION_04_SOURCE.introPages) {
  assert.match(page.question.choices[page.question.correctChoiceIndex].ru, /[A-Za-z]/u);
  for (const locale of locales) {
    assert.ok(page.body[locale]?.trim());
    assert.ok(page.bodyRuns?.[locale]?.length);
    assert.equal(page.bodyRuns?.[locale]?.map((run) => run.text).join(''), page.body[locale]);
  }
}

const practice = EPISODE_01_SESSION_04_SOURCE.modeNativePractice ?? [];
assert.equal(practice.length, 17);
assert.ok([...activeFamilies].every((family) => practice.some((step) => step.family === family)));
assert.ok(practice.every((step, index) => index === 0 || step.family !== practice[index - 1]?.family));
const targetFamilyKeys = practice
  .filter((step) => step.target.kind === 'phrase')
  .map((step) => `${step.target.sourceIndex}\0${step.family}`);
assert.equal(new Set(targetFamilyKeys).size, targetFamilyKeys.length);
const speed = practice.find((step) => step.family === 'speed_match');
assert.equal(speed?.modePayload.family, 'speed_match');
if (speed?.modePayload.family === 'speed_match') assert.equal(speed.modePayload.pairGrid.length, 4);
for (const step of practice) {
  const payload = step.modePayload;
  if (payload.family !== 'phrase_builder' && payload.family !== 'listen_build_dictation') continue;
  const target = payload.family === 'phrase_builder' ? payload.targetPhrase : payload.hiddenTargetPhrase;
  const completeWords = target.match(/[A-Za-z]+(?:'[A-Za-z]+)?/gu) ?? [];
  assert.ok(
    payload.orderedTokens.every((token) => completeWords.includes(token)),
    `Letter fragments are forbidden in ${target}: ${payload.orderedTokens.join('|')}`,
  );
}

const shard = buildSessionShardFromSource(EPISODE_01_SESSION_04_SOURCE);
assert.equal(shard.cards.length, 20);
assert.deepEqual(shard.cards.slice(0, 3).map((card) => card.family), ['phrase_builder', 'phrase_builder', 'phrase_builder']);
assert.deepEqual(shard.cards.slice(3).map((card) => card.family), practice.map((step) => step.family));
assert.deepEqual(
  shard.cards.slice(3, 12).map((card) => card.contentItem.target.text),
  ['set', 'done', 'free', 'set', 'done', 'free', 'set', 'done', 'free'],
);
assert.ok(
  shard.cards.slice(12).every((card) =>
    card.family === 'speed_match' || phrases.includes(card.contentItem.target.text as never)),
);
assert.doesNotThrow(() => validateLearningV2GeneratedSessionShardV1(shard, {
  packageId: shard.packageId,
  targetLanguage: shard.targetLanguage,
  episodeOrdinal: shard.episodeOrdinal,
  requiredSessionOrdinal: shard.requiredSessionOrdinal,
  generationInputFingerprint: shard.generationInputFingerprint,
}));
for (const locale of locales) {
  const children = buildSessionChildBodiesFromShard(shard, locale, 'lesson-01:session:04');
  assert.equal(children.learner.interactions.length, 17);
}

const report = evaluateLearningV2SessionContentQuality(EPISODE_01_SESSION_04_SOURCE);
const reviewOnly = new Set([
  'quality_review_missing', 'quality_review_stale', 'quality_review_rejected',
  'quality_review_not_independent', 'locale_review_missing',
]);
assert.deepEqual(report.issues.filter((issue) => !reviewOnly.has(issue.code)), []);

process.stdout.write('LEARNING V2 SESSION 4 READINESS GATE: PASS\n');
