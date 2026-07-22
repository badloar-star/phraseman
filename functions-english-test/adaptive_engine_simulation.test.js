const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

require(path.join(__dirname, '..', 'knowly-www', 'english-level-test', 'engine.js'));

const { Engine, seededRandom } = globalThis.EnglishTestEngine;
const bank = JSON.parse(fs.readFileSync(
  path.join(__dirname, 'data', 'questions.en.json'),
  'utf8',
)).questions;
const ATTEMPTS = 2000;

function runAttempt(seed, choose) {
  const engine = new Engine(bank, seed);
  const shown = [];
  while (!engine.shouldFinish()) {
    const question = engine.pickNextQuestion();
    assert.ok(question, `question pool exhausted for seed ${seed}`);
    shown.push(question);
    const response = choose(question, shown.length - 1, seed);
    engine.recordAnswer(question, response.index, response.skipped, 1000);
  }
  return { result: engine.computeResult(), shown };
}

function simulate(choose) {
  const attempts = [];
  for (let seed = 1; seed <= ATTEMPTS; seed += 1) {
    attempts.push(runAttempt(seed, choose));
  }
  return attempts;
}

test('all-wrong and all-skipped beginners get a short, neutral result', () => {
  const wrong = simulate((question) => ({
    index: (question.correctIndex + 1) % question.options.length,
    skipped: false,
  }));
  const skipped = simulate(() => ({ index: null, skipped: true }));

  assert.deepEqual([...new Set(wrong.map(({ result }) => result.estimatedLevel))], ['Pre-A1']);
  assert.deepEqual([...new Set(skipped.map(({ result }) => result.estimatedLevel))], ['Pre-A1']);
  assert.deepEqual([...new Set(wrong.map(({ result }) => result.totalQuestions))], [12]);
  assert.deepEqual([...new Set(skipped.map(({ result }) => result.totalQuestions))], [12]);
  assert.equal(skipped.every(({ result }) => result.insufficientData), true);
  assert.equal(wrong.every(({ shown }) => shown.slice(0, 4).every((question) => question.level !== 'B1')), true);
});

test('all-correct trajectories earn C2 only after direct C1 and C2 evidence', () => {
  const attempts = simulate((question) => ({ index: question.correctIndex, skipped: false }));

  assert.equal(attempts.every(({ result }) => result.estimatedLevel === 'C2'), true);
  assert.equal(attempts.every(({ result }) => result.totalQuestions <= 20), true);
  assert.equal(attempts.every(({ shown }) => shown.filter((question) => question.level === 'C1').length >= 3), true);
  assert.equal(attempts.every(({ shown }) => shown.filter((question) => question.level === 'C2').length >= 3), true);
  assert.equal(attempts.every(({ shown }) => (
    shown.filter((question) => question.level === 'C1' || question.level === 'C2')
      .every((question) => question.upperBandEvidence === true)
  )), true);
  assert.equal(attempts.every(({ shown }) => shown.slice(0, 4).every((question) => question.level !== 'B1')), true);
});

test('uniform random answers do not create a systematic high-level result', () => {
  const attempts = simulate((question, position, seed) => {
    const random = seededRandom((seed * 65537 + position * 31337) >>> 0);
    return { index: Math.floor(random() * question.options.length), skipped: false };
  });
  const highLevelRate = attempts.filter(
    ({ result }) => result.estimatedLevel === 'C1' || result.estimatedLevel === 'C2',
  ).length / attempts.length;

  assert.ok(highLevelRate <= 0.02, `random high-level rate was ${highLevelRate}`);
  assert.equal(Math.max(...attempts.map(({ result }) => result.totalQuestions)) <= 20, true);
});

for (let fixedPosition = 0; fixedPosition < 4; fixedPosition += 1) {
  test(`always choosing displayed position ${fixedPosition + 1} has no high-level shortcut`, () => {
    const attempts = simulate(() => ({ index: fixedPosition, skipped: false }));
    const highLevelRate = attempts.filter(
      ({ result }) => result.estimatedLevel === 'C1' || result.estimatedLevel === 'C2',
    ).length / attempts.length;

    assert.ok(highLevelRate <= 0.02, `position ${fixedPosition + 1} high-level rate was ${highLevelRate}`);
    assert.equal(Math.max(...attempts.map(({ result }) => result.totalQuestions)) <= 20, true);
  });
}
