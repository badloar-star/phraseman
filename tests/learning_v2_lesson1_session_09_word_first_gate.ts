import assert from 'node:assert/strict';
import { EPISODE_01_SESSION_09_SOURCE } from '../modules/learning-v2/content/source/episode_01_session_09_v1';
import { buildSessionShardFromSource } from '../modules/learning-v2/content/source/session_shard_from_source_v1';

const expectedTargets = [
  'tall', 'young', 'It is young',
  'He is ready', 'She is happy', 'It is fine',
] as const;

assert.equal(EPISODE_01_SESSION_09_SOURCE.requiredSessionOrdinal, 9);
assert.equal(EPISODE_01_SESSION_09_SOURCE.sessionKindOverride, 'words_then_phrases');
assert.deepEqual(
  EPISODE_01_SESSION_09_SOURCE.newVocabulary?.map((entry) => entry.target),
  ['tall', 'short', 'young'],
);
assert.ok(EPISODE_01_SESSION_09_SOURCE.phrases.every((phrase) => /^(?:He|She|It) is /u.test(phrase.english)));
assert.deepEqual(
  EPISODE_01_SESSION_09_SOURCE.modeNativePractice.map((step) => step.family),
  ['listen_choose', 'scripted_repeat_compare', 'context_gap_grammar', 'listen_build_dictation', 'speed_match', 'phrase_builder'],
);
const practice = buildSessionShardFromSource(EPISODE_01_SESSION_09_SOURCE).cards.slice(3);
assert.deepEqual(practice.map((card) => card.contentItem.target.text), expectedTargets);
assert.equal(new Set(practice.map((card) => card.contentItem.target.text)).size, practice.length);
assert.equal(practice.filter((card) => card.family === 'speed_match').length, 1);
process.stdout.write('LEARNING V2 SESSION 9 FULL B1 GATE: PASS\n');
