import assert from 'node:assert/strict';

import { EPISODE_01_SESSION_08_SOURCE } from '../modules/learning-v2/content/source/episode_01_session_08_v1';
import { buildSessionShardFromSource } from '../modules/learning-v2/content/source/session_shard_from_source_v1';
import { buildSessionChildBodiesFromShard } from '../modules/learning-v2/content/source/session_package_from_shard_v1';
import { validateLearningV2GeneratedSessionShardV1 } from '../modules/learning-v2/content/generator_session_shard';

const locales = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
const expectedPractice = [
  ['context_gap_grammar', 'I am hungry'],
  ['listen_build_dictation', 'I am here'],
  ['speed_match', 'I am sick'],
  ['phrase_builder', 'I am ready'],
  ['listen_choose', 'I am happy'],
  ['scripted_repeat_compare', 'I am fine'],
] as const;

assert.equal(EPISODE_01_SESSION_08_SOURCE.requiredSessionOrdinal, 8);
assert.equal(EPISODE_01_SESSION_08_SOURCE.sessionKindOverride, 'checkpoint');
assert.equal(EPISODE_01_SESSION_08_SOURCE.distractorAuthorship, 'manual');
assert.equal(EPISODE_01_SESSION_08_SOURCE.vocabulary, undefined);
assert.equal(EPISODE_01_SESSION_08_SOURCE.phrases.length, 15);
assert.deepEqual(
  EPISODE_01_SESSION_08_SOURCE.modeNativePractice.map((step) => step.family),
  expectedPractice.map(([family]) => family),
);
assert.equal(
  EPISODE_01_SESSION_08_SOURCE.modeNativePractice.filter((step) => step.family === 'speed_match').length,
  1,
);
for (const page of EPISODE_01_SESSION_08_SOURCE.introPages) {
  for (const locale of locales) assert.ok(page.body[locale]?.trim());
}

const shard = buildSessionShardFromSource(EPISODE_01_SESSION_08_SOURCE);
validateLearningV2GeneratedSessionShardV1(shard, {
  packageId: shard.packageId,
  targetLanguage: shard.targetLanguage,
  episodeOrdinal: shard.episodeOrdinal,
  requiredSessionOrdinal: shard.requiredSessionOrdinal,
  generationInputFingerprint: shard.generationInputFingerprint,
});
const practice = shard.cards.slice(3);
assert.deepEqual(
  practice.map((card) => [card.family, card.contentItem.target.text]),
  expectedPractice,
);
assert.equal(new Set(practice.map((card) => card.contentItem.target.text)).size, practice.length);
for (const locale of locales) {
  const learner = buildSessionChildBodiesFromShard(
    shard,
    locale,
    'lesson-01:session:08',
  ).learner;
  assert.equal(learner.interactions.length, expectedPractice.length);
}

process.stdout.write('LEARNING V2 SESSION 8 CHECKPOINT GATE: PASS\n');
