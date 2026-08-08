const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

require(path.join(__dirname, '..', 'knowly-www', 'english-level-test', 'engine.js'));

const { Engine, seededRandom } = globalThis.EnglishTestEngine;
const LANGUAGES = ['en'];
const banks = Object.fromEntries(LANGUAGES.map((language) => [language, JSON.parse(fs.readFileSync(
  path.join(__dirname, 'data', `questions.${language}.json`),
  'utf8',
)).questions]));
const ATTEMPTS = 2000;

function runAttempt(language, seed, choose) {
  const engine = new Engine(banks[language], seed);
  const shown = [];
  while (!engine.shouldFinish()) {
    const question = engine.pickNextQuestion();
    assert.ok(question, `${language}: question pool exhausted for seed ${seed}`);
    assert.equal(shown.some(({ id }) => id === question.id), false, `${language}: repeated ${question.id} for seed ${seed}`);
    shown.push(question);
    const response = choose(question, shown.length - 1, seed);
    engine.recordAnswer(question, response.index, response.skipped, 1000);
  }
  const result = engine.computeResult();
  assert.ok(result.totalQuestions <= 20, `${language}: ${result.totalQuestions} questions for seed ${seed}`);
  return { result, shown };
}

function simulate(language, choose) {
  const attempts = [];
  for (let seed = 1; seed <= ATTEMPTS; seed += 1) {
    attempts.push(runAttempt(language, seed, choose));
  }
  return attempts;
}

test('all-wrong and all-skipped beginners get a short, neutral result', () => {
  for (const language of LANGUAGES) {
    const wrong = simulate(language, (question) => ({
      index: (question.correctIndex + 1) % question.options.length,
      skipped: false,
    }));
    const skipped = simulate(language, () => ({ index: null, skipped: true }));

    assert.deepEqual([...new Set(wrong.map(({ result }) => result.estimatedLevel))], ['Pre-A1'], language);
    assert.deepEqual([...new Set(skipped.map(({ result }) => result.estimatedLevel))], ['Pre-A1'], language);
    assert.deepEqual([...new Set(wrong.map(({ result }) => result.totalQuestions))], [12], language);
    assert.deepEqual([...new Set(skipped.map(({ result }) => result.totalQuestions))], [12], language);
    assert.equal(skipped.every(({ result }) => result.insufficientData), true, language);
    assert.equal(wrong.every(({ shown }) => shown.slice(0, 4).every((question) => question.level !== 'B1')), true, language);
  }
});

test('all-correct trajectories earn C2 only after direct C1 and C2 evidence', () => {
  for (const language of LANGUAGES) {
    const attempts = simulate(language, (question) => ({ index: question.correctIndex, skipped: false }));

    assert.equal(attempts.every(({ result }) => result.estimatedLevel === 'C2'), true, language);
    assert.equal(attempts.every(({ shown }) => shown.filter((question) => question.level === 'C1').length >= 3), true, language);
    assert.equal(attempts.every(({ shown }) => shown.filter((question) => question.level === 'C2').length >= 3), true, language);
    assert.equal(attempts.every(({ shown }) => (
      shown.filter((question) => question.level === 'C1' || question.level === 'C2')
        .every((question) => question.upperBandEvidence === true)
    )), true, language);
    assert.equal(attempts.every(({ shown }) => shown.slice(0, 4).every((question) => question.level !== 'B1')), true, language);
  }
});

test('uniform random answers do not create a systematic high-level result', () => {
  for (const [languageIndex, language] of LANGUAGES.entries()) {
    const attempts = simulate(language, (question, position, seed) => {
      const random = seededRandom((seed * 65537 + position * 31337 + languageIndex * 104729) >>> 0);
      return { index: Math.floor(random() * question.options.length), skipped: false };
    });
    const highLevelRate = attempts.filter(
      ({ result }) => result.estimatedLevel === 'C1' || result.estimatedLevel === 'C2',
    ).length / attempts.length;

    assert.ok(highLevelRate <= 0.02, `${language}: random high-level rate was ${highLevelRate}`);
  }
});

for (let fixedPosition = 0; fixedPosition < 4; fixedPosition += 1) {
  test(`always choosing displayed position ${fixedPosition + 1} has no high-level shortcut`, () => {
    for (const language of LANGUAGES) {
      const attempts = simulate(language, () => ({ index: fixedPosition, skipped: false }));
      const highLevelRate = attempts.filter(
        ({ result }) => result.estimatedLevel === 'C1' || result.estimatedLevel === 'C2',
      ).length / attempts.length;

      assert.ok(highLevelRate <= 0.02, `${language}: position ${fixedPosition + 1} high-level rate was ${highLevelRate}`);
    }
  });
}
