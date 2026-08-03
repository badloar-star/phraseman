const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

require(path.join(__dirname, '..', 'knowly-www', 'english-level-test', 'engine.js'));

const { Engine, seededRandom } = globalThis.EnglishTestEngine;
const LANGUAGES = ['es', 'de', 'it', 'fr'];
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const ROOT = path.join(__dirname, '..');

function loadBank(language) {
  return LEVELS.flatMap((level) => JSON.parse(fs.readFileSync(path.join(
    ROOT,
    'content',
    'language-test-pilots',
    language,
    'candidate-bank',
    `${level}.json`,
  ), 'utf8')).questions);
}

const BANKS = Object.fromEntries(LANGUAGES.map((language) => [language, loadBank(language)]));

function runAttempt(language, seed, choose) {
  const engine = new Engine(BANKS[language], seed);
  const shown = [];
  while (!engine.shouldFinish()) {
    const question = engine.pickNextQuestion();
    assert.ok(question, `${language}/${seed}:question pool`);
    assert.equal(shown.some(({ id }) => id === question.id), false, `${language}/${seed}:${question.id}:repeat`);
    shown.push(question);
    const response = choose(question, shown.length - 1, seed);
    engine.recordAnswer(question, response.index, response.skipped, 1000);
  }
  return { result: engine.computeResult(), shown };
}

test('all four candidate banks follow the English staircase on deterministic extremes', () => {
  for (const language of LANGUAGES) {
    for (let seed = 1; seed <= 64; seed += 1) {
      const wrong = runAttempt(language, seed, (question) => ({
        index: (question.correctIndex + 1) % question.options.length,
        skipped: false,
      }));
      assert.equal(wrong.result.estimatedLevel, 'Pre-A1', `${language}/${seed}:all wrong`);
      assert.equal(wrong.result.totalQuestions, 12, `${language}/${seed}:all wrong length`);
      assert.ok(wrong.shown[0].difficulty <= 0.65 && wrong.shown[1].difficulty <= 0.65, `${language}/${seed}:anchors`);
      assert.notEqual(wrong.shown[0].skill, wrong.shown[1].skill, `${language}/${seed}:anchor skills`);

      const correct = runAttempt(language, seed, (question) => ({
        index: question.correctIndex,
        skipped: false,
      }));
      assert.equal(correct.result.estimatedLevel, 'C2', `${language}/${seed}:all correct`);
      assert.ok(correct.result.totalQuestions >= 12 && correct.result.totalQuestions <= 20, `${language}/${seed}:length`);
      for (const level of ['C1', 'C2']) {
        const directEvidence = correct.shown.filter((question) => question.level === level);
        assert.ok(directEvidence.length >= 3, `${language}/${seed}:${level}:shown`);
        assert.ok(directEvidence.every((question) => question.upperBandEvidence === true), `${language}/${seed}:${level}:evidence`);
      }
    }
  }
});

test('random and fixed-position strategies do not create a high-level shortcut', () => {
  const attemptsPerStrategy = 256;
  for (const [languageIndex, language] of LANGUAGES.entries()) {
    const randomResults = [];
    for (let seed = 1; seed <= attemptsPerStrategy; seed += 1) {
      randomResults.push(runAttempt(language, seed, (question, position) => {
        const random = seededRandom((seed * 65537 + position * 31337 + languageIndex * 104729) >>> 0);
        return { index: Math.floor(random() * question.options.length), skipped: false };
      }).result);
    }
    const randomHigh = randomResults.filter(({ estimatedLevel }) => estimatedLevel === 'C1' || estimatedLevel === 'C2').length;
    assert.ok(randomHigh / attemptsPerStrategy <= 0.02, `${language}:random high-level rate ${randomHigh}/${attemptsPerStrategy}`);

    for (let fixedIndex = 0; fixedIndex < 4; fixedIndex += 1) {
      let fixedHigh = 0;
      for (let seed = 1; seed <= 64; seed += 1) {
        const { result } = runAttempt(language, seed, () => ({ index: fixedIndex, skipped: false }));
        if (result.estimatedLevel === 'C1' || result.estimatedLevel === 'C2') fixedHigh += 1;
      }
      assert.ok(fixedHigh / 64 <= 0.02, `${language}:position ${fixedIndex + 1} high-level rate ${fixedHigh}/64`);
    }
  }
});
