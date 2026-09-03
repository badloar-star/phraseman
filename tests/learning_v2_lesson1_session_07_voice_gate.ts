import assert from 'node:assert/strict';
import { EPISODE_01_SESSION_07_SOURCE } from '../modules/learning-v2/content/source/episode_01_session_07_v1';
import { buildSessionShardFromSource } from '../modules/learning-v2/content/source/session_shard_from_source_v1';
import { buildSessionChildBodiesFromShard } from '../modules/learning-v2/content/source/session_package_from_shard_v1';

const source = EPISODE_01_SESSION_07_SOURCE;
const shard = buildSessionShardFromSource(source);
const practice = source.modeNativePractice ?? [];

assert.equal(source.requiredSessionOrdinal, 7);
assert.equal(source.sessionKindOverride, 'voice');
assert.equal(source.distractorAuthorship, 'manual');
assert.deepEqual(source.newVocabulary?.map((item) => item.target), ['angry', 'scared']);
assert.deepEqual(source.phrases.map((item) => item.english), [
  'I am calm', 'I am nervous', 'I am excited', 'I am here',
]);
assert.equal(practice.length, 6);
assert.equal(practice.filter((step) => step.family === 'speed_match').length, 1);
assert.equal(new Set(practice.map((step) => `${step.target.kind}:${'sourceIndex' in step.target ? step.target.sourceIndex : ''}`)).size, practice.length);
assert.equal(source.phrases.every((phrase) => /^I am [a-z]+$/u.test(phrase.english)), true);
assert.equal(source.phrases.some((phrase) => /\b(?:not|a|an|the)\b/u.test(phrase.english)), false);

for (const locale of ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const) {
  const learner = buildSessionChildBodiesFromShard(shard, locale, 'lesson-01:session:07').learner;
  assert.equal(learner.interactions.length, 6);
  assert.equal(learner.interactions.filter((item) => item.family === 'speed_match').length, 1);
}

console.log('LESSON 1 SESSION 07 SPOKEN-PRODUCTION GATE: PASS');
