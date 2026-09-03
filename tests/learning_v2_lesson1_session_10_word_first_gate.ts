import assert from 'node:assert/strict';
import { EPISODE_01_SESSION_10_SOURCE } from '../modules/learning-v2/content/source/episode_01_session_10_v1';

const locales = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
const canonical = ['She is old', 'He is kind', 'She is funny', 'She is ready'];

assert.equal(EPISODE_01_SESSION_10_SOURCE.requiredSessionOrdinal, 10);
assert.equal(EPISODE_01_SESSION_10_SOURCE.sessionKindOverride, 'words_then_phrases');
assert.equal(EPISODE_01_SESSION_10_SOURCE.distractorAuthorship, 'manual');
assert.deepEqual(EPISODE_01_SESSION_10_SOURCE.newVocabulary?.map((entry) => entry.target), ['old', 'kind', 'funny']);
assert.deepEqual(EPISODE_01_SESSION_10_SOURCE.phrases.map((phrase) => phrase.english), canonical);

for (const phrase of EPISODE_01_SESSION_10_SOURCE.phrases) {
  assert.match(phrase.english, /^(?:I am|He is|She is|It is)\b/u);
  assert.doesNotMatch(phrase.english, /\b(?:you|are|not)\b|\?/iu);
}

for (const page of EPISODE_01_SESSION_10_SOURCE.introPages) {
  for (const locale of locales) {
    assert.ok(page.title[locale]?.trim());
    assert.ok(page.body[locale]?.trim());
    assert.ok(page.question?.explanation?.[locale]?.trim());
  }
}

const practice = EPISODE_01_SESSION_10_SOURCE.modeNativePractice ?? [];
assert.equal(practice.filter((step) => step.family === 'speed_match').length, 1);
assert.equal(new Set(practice.map((step) => `${step.family}:${JSON.stringify(step.target)}`)).size, practice.length);

process.stdout.write('LEARNING V2 SESSION 10 EXACT FULL B1 GATE: PASS\n');
