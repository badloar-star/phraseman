import assert from 'node:assert/strict';
import { EPISODE_01_SESSION_04_SOURCE } from '../modules/learning-v2/content/source/episode_01_session_04_v1';
import { buildSessionShardFromSource } from '../modules/learning-v2/content/source/session_shard_from_source_v1';
import { buildSessionChildBodiesFromShard } from '../modules/learning-v2/content/source/session_package_from_shard_v1';

const source = EPISODE_01_SESSION_04_SOURCE;
const practice = source.modeNativePractice ?? [];
const shard = buildSessionShardFromSource(source);

assert.equal(source.distractorAuthorship, 'manual');
assert.equal(source.sessionKindOverride, 'words_then_phrases');
assert.deepEqual(source.newVocabulary?.map((entry) => entry.target), ['hungry', 'thirsty', 'sick']);
assert.deepEqual(source.phrases.slice(0, 3).map((phrase) => phrase.english), [
  'I am hungry', 'I am thirsty', 'I am sick',
]);
assert.deepEqual(source.introPages.map((page) => page.kind), ['concept', 'formula', 'trap']);
assert.equal(practice.length, 6);
assert.equal(practice.filter((step) => step.family === 'speed_match').length, 1);
assert.equal(new Set(practice.map((step) => `${step.target.kind}:${'sourceIndex' in step.target ? step.target.sourceIndex : ''}`)).size, 6);
assert.deepEqual(practice.map((step) => step.family), [
  'listen_choose', 'scripted_repeat_compare', 'context_gap_grammar',
  'listen_build_dictation', 'speed_match', 'phrase_builder',
]);
assert.equal(practice.every((step) => step.modePayload.family === step.family), true);

for (const locale of ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const) {
  const learner = buildSessionChildBodiesFromShard(shard, locale, 'lesson-01:session:04').learner;
  assert.equal(learner.interactions.length, 6);
  assert.equal(learner.interactions.filter((step) => step.family === 'speed_match').length, 1);
}

console.log('LEARNING V2 SESSION 4 UNIQUE-TARGET READINESS GATE: PASS');
