import assert from 'node:assert/strict';
import { EPISODE_01_SESSION_12_SOURCE } from '../modules/learning-v2/content/source/episode_01_session_12_v1';
import { buildSessionShardFromSource } from '../modules/learning-v2/content/source/session_shard_from_source_v1';
import { buildSessionChildBodiesFromShard } from '../modules/learning-v2/content/source/session_package_from_shard_v1';

const LOCALES = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
const source = EPISODE_01_SESSION_12_SOURCE;

assert.equal(source.requiredSessionOrdinal, 12);
assert.deepEqual(source.reviewConstructIds, [
  'affirmative_self_statement',
  'affirmative_third_person_statement',
]);
assert.deepEqual(source.newVocabulary?.map((item) => item.target), [
  'loud', 'friendly', 'helpful',
]);
assert.deepEqual(source.phrases.map((phrase) => phrase.english), [
  'She is loud', 'He is friendly', 'She is helpful', 'She is ready',
]);

for (const page of source.introPages) {
  for (const locale of LOCALES) {
    assert.ok(page.body[locale].trim().length > 0, `${page.kind}.${locale} must be manual copy`);
    assert.ok(page.question.explanation[locale].trim().length > 0,
      `${page.kind}.${locale} needs its own explanation`);
  }
}

for (const vocabulary of source.newVocabulary ?? []) {
  for (const locale of LOCALES) {
    assert.ok(vocabulary.meaning[locale].trim().length > 0, `${vocabulary.target}.${locale}.meaning`);
  }
}

const shard = buildSessionShardFromSource(source);
const children = buildSessionChildBodiesFromShard(shard, 'ru', 'lesson-01:session:12');
assert.deepEqual(children.learner.interactions.map((entry) => entry.family), [
  'listen_choose',
  'scripted_repeat_compare',
  'context_gap_grammar',
  'listen_build_dictation',
  'speed_match',
  'phrase_builder',
]);
assert.equal(children.learner.interactions.filter((entry) => entry.family === 'speed_match').length, 1);

const learnerEnglish = source.phrases.map((phrase) => phrase.english).join('\n');
assert.doesNotMatch(learnerEnglish, /\b(?:Am I|Are you|not|a|an)\b/iu,
  'Session 12 is the approved affirmative application packet, not the legacy question packet');

console.log('Learning V2 Session 12 Full B1 affirmative editorial gate: PASS');
