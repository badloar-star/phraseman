import assert from 'node:assert/strict';

import { LEARNING_V2_CONTENT_QUALITY_LOCALES } from '../modules/learning-v2/content/source/learning_content_quality_gate_v1';
import { EPISODE_01_SESSION_01_SOURCE } from '../modules/learning-v2/content/source/episode_01_session_01_v1';

const forbiddenFutureForms = new Set([
  'is',
  'are',
  'be',
  'was',
  'were',
  'do',
  'does',
  "isn't",
  "aren't",
]);

assert.equal(
  Reflect.get(EPISODE_01_SESSION_01_SOURCE, 'distractorAuthorship'),
  'manual',
  'The rewritten session must bypass the legacy distractor generator.',
);
assert.deepEqual(
  EPISODE_01_SESSION_01_SOURCE.phrases.map((phrase) => phrase.english),
  ['I am here', 'I am ready'],
);

for (const [phraseIndex, phrase] of EPISODE_01_SESSION_01_SOURCE.phrases.entries()) {
  assert.ok(phrase.explanation.length >= 100);
  assert.ok(
    !/проверьте подлежащее|точное слово для этой позиции|другое слово или неверная форма/iu.test(
      phrase.explanation,
    ),
    `phrase ${phraseIndex + 1}: legacy template copy is forbidden`,
  );
  for (const [wordIndex, word] of phrase.words.entries()) {
    assert.equal(
      word.distractors.length,
      2,
      `phrase ${phraseIndex + 1} word ${word.correct}: exactly two close traps`,
    );
    for (const distractor of word.distractors) {
      assert.ok(distractor.trapType);
      assert.match(
        distractor.reasonCode,
        new RegExp(`^[a-z_]+:${word.correct.toLocaleLowerCase('en')}:`),
      );
      assert.ok(!forbiddenFutureForms.has(distractor.value.toLocaleLowerCase('en')));
      assert.ok(distractor.why.toLocaleLowerCase('en').includes(distractor.value.toLocaleLowerCase('en')));
      assert.ok(distractor.why.toLocaleLowerCase('en').includes(word.correct.toLocaleLowerCase('en')));
    }

    for (const locale of LEARNING_V2_CONTENT_QUALITY_LOCALES) {
      const details = phrase.localizedDetails?.[locale];
      assert.ok(details, `phrase ${phraseIndex + 1} ${locale}: localized details missing`);
      assert.ok(details.explanation.length >= 100);
      const localizedWord = details.words[wordIndex];
      assert.equal(localizedWord?.correct, word.correct);
      assert.deepEqual(
        localizedWord?.distractors.map((entry) => entry.value),
        word.distractors.map((entry) => entry.value),
      );
      for (const distractor of localizedWord?.distractors ?? []) {
        assert.ok(distractor.trapType);
        assert.ok(distractor.reason.toLocaleLowerCase('en').includes(distractor.value.toLocaleLowerCase('en')));
        assert.ok(distractor.reason.toLocaleLowerCase('en').includes(word.correct.toLocaleLowerCase('en')));
      }
    }
  }
}

console.log('LEARNING V2 SESSION 1 MANUAL PHRASE GATE: PASS');
