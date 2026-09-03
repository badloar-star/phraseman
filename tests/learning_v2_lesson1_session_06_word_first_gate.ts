import assert from 'node:assert/strict';
import { EPISODE_01_SESSION_06_SOURCE } from '../modules/learning-v2/content/source/episode_01_session_06_v1';
import { buildSessionShardFromSource } from '../modules/learning-v2/content/source/session_shard_from_source_v1';
import { buildSessionChildBodiesFromShard } from '../modules/learning-v2/content/source/session_package_from_shard_v1';

const source = EPISODE_01_SESSION_06_SOURCE;
const practice = source.modeNativePractice ?? [];
const shard = buildSessionShardFromSource(source);

assert.deepEqual(source.newVocabulary?.map((entry) => entry.target), ['calm', 'nervous', 'excited']);
assert.deepEqual(source.phrases.slice(0, 3).map((entry) => entry.english), ['I am calm', 'I am nervous', 'I am excited']);
assert.equal(practice.length, 6);
assert.equal(practice.filter((step) => step.family === 'speed_match').length, 1);
assert.deepEqual(practice.map((step) => step.family), [
  'listen_choose', 'scripted_repeat_compare', 'context_gap_grammar',
  'listen_build_dictation', 'speed_match', 'phrase_builder',
]);
assert.equal(new Set(practice.map((step) => `${step.target.kind}:${'sourceIndex' in step.target ? step.target.sourceIndex : step.target.sourceIndices.join(',')}`)).size, 6);
for (const locale of ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const) {
  assert.equal(buildSessionChildBodiesFromShard(shard, locale, 'lesson-01:session:06').learner.interactions.length, 6);
}
console.log('LEARNING V2 SESSION 6 UNIQUE-TARGET GATE: PASS');
