import assert from 'node:assert/strict';
import { EPISODE_01_SESSION_11_SOURCE } from '../modules/learning-v2/content/source/episode_01_session_11_v1';

assert.equal(EPISODE_01_SESSION_11_SOURCE.requiredSessionOrdinal, 11);
assert.equal(EPISODE_01_SESSION_11_SOURCE.sessionKindOverride, 'words_then_phrases');
assert.deepEqual(EPISODE_01_SESSION_11_SOURCE.newVocabulary?.map((item) => item.target), ['smart', 'strong', 'quiet']);
assert.deepEqual(EPISODE_01_SESSION_11_SOURCE.phrases.map((item) => item.english), ['She is smart', 'He is strong', 'She is quiet', 'She is ready']);
assert.ok((EPISODE_01_SESSION_11_SOURCE.modeNativePractice ?? []).every((step) => step.family !== 'speed_match') || (EPISODE_01_SESSION_11_SOURCE.modeNativePractice ?? []).filter((step) => step.family === 'speed_match').length === 1);
process.stdout.write('LEARNING V2 SESSION 11 EXACT FULL B1 GATE: PASS\n');
