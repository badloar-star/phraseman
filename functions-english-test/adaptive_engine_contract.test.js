const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');

require(path.join(__dirname, '..', 'knowly-www', 'english-level-test', 'engine.js'));

const { Engine } = globalThis.EnglishTestEngine;
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const SKILLS = ['grammar', 'vocabulary', 'reading', 'pragmatics'];
const RANGES = [[0.5, 1.2], [1.3, 2.2], [2.3, 3.1], [3.2, 3.9], [4, 4.7], [4.8, 5.5]];

function makeBank() {
  return LEVELS.flatMap((level, levelIndex) =>
    Array.from({ length: 12 }, (_, index) => ({
      id: `${level.toLowerCase()}-${String(index + 1).padStart(3, '0')}`,
      level,
      difficulty: RANGES[levelIndex][0]
        + (RANGES[levelIndex][1] - RANGES[levelIndex][0]) * (index / 11),
      skill: SKILLS[index % SKILLS.length],
      format: index % 2 === 0 ? 'multiple-choice' : 'gap-fill',
      scenario: 'contract fixture',
      prompt: `Question ${level} ${index + 1}`,
      options: [`wrong-a-${index}`, `right-${index}`, `wrong-b-${index}`, `wrong-c-${index}`],
      correctIndex: 1,
      explanation: 'Fixture explanation.',
    })),
  );
}

function answer(engine, correct) {
  const question = engine.pickNextQuestion();
  assert.ok(question, 'engine should provide a next question');
  const selectedIndex = correct
    ? question.correctIndex
    : (question.correctIndex + 1) % question.options.length;
  engine.recordAnswer(question, selectedIndex, false, 1000);
  return question;
}

test('the first two questions are easy A1 anchors from different skills', () => {
  const engine = new Engine(makeBank(), 42);
  const first = answer(engine, false);
  const second = answer(engine, false);

  assert.equal(first.level, 'A1');
  assert.equal(second.level, 'A1');
  assert.notEqual(first.skill, second.skill);
  assert.ok(first.difficulty <= 0.65);
  assert.ok(second.difficulty <= 0.65);
});

test('two correct answers promote only one CEFR band and an error lowers the next question', () => {
  const engine = new Engine(makeBank(), 7);

  assert.equal(answer(engine, true).level, 'A1');
  assert.equal(answer(engine, true).level, 'A1');
  assert.equal(answer(engine, false).level, 'A2');
  assert.equal(engine.pickNextQuestion().level, 'A1');
});

test('low-level learners may finish after 12 items and are not forced to 24', () => {
  const engine = new Engine(makeBank(), 21);
  for (let index = 0; index < 11; index += 1) answer(engine, false);
  assert.equal(engine.shouldFinish(), false);
  answer(engine, false);
  assert.equal(engine.shouldFinish(), true);
  assert.equal(engine.computeResult().estimatedLevel, 'Pre-A1');
});

test('C1 and C2 require direct evidence at the claimed band', () => {
  const engine = new Engine(makeBank(), 99);
  for (let index = 0; index < 12; index += 1) answer(engine, true);

  const premature = engine.computeResult();
  assert.notEqual(premature.estimatedLevel, 'C2');
  assert.equal(engine.shouldFinish(), false);

  const thirteenth = answer(engine, true);
  assert.equal(thirteenth.level, 'C2');
  assert.equal(engine.shouldFinish(), false);
  const fourteenth = answer(engine, true);
  assert.equal(fourteenth.level, 'C2');
  const finalResult = engine.computeResult();
  assert.equal(finalResult.estimatedLevel, 'C2');
  assert.equal(engine.shouldFinish(), true);
  assert.equal('confidence' in finalResult, false);
  assert.equal('index' in finalResult, false);
});

test('runtime option shuffling breaks the source answer-position shortcut', () => {
  const positionCounts = [0, 0, 0, 0];
  for (let seed = 1; seed <= 400; seed += 1) {
    const engine = new Engine(makeBank(), seed);
    const question = engine.pickNextQuestion();
    positionCounts[question.correctIndex] += 1;
  }

  for (const count of positionCounts) {
    assert.ok(count >= 70 && count <= 130, `unexpected distribution: ${positionCounts.join(',')}`);
  }
});

test('the assessment always stops by question 20', () => {
  const engine = new Engine(makeBank(), 123);
  for (let index = 0; index < 20; index += 1) answer(engine, index % 2 === 0);
  assert.equal(engine.shouldFinish(), true);
});

test('a late run of errors lowers the result instead of preserving a stale high band', () => {
  const engine = new Engine(makeBank(), 31415);
  for (let index = 0; index < 8; index += 1) answer(engine, true);
  for (let index = 0; index < 4; index += 1) answer(engine, false);

  assert.equal(engine.shouldFinish(), false);
  assert.equal(engine.pickNextQuestion().level, 'A1');
  while (!engine.shouldFinish()) answer(engine, false);
  assert.equal(engine.computeResult().estimatedLevel, 'A1');
});

test('seed zero stays deterministic and result exposes a bounded stop reason', () => {
  const first = new Engine(makeBank(), 0);
  const second = new Engine(makeBank(), 0);
  assert.equal(first.seed, 0);
  assert.equal(second.seed, 0);
  assert.equal(first.pickNextQuestion().id, second.pickNextQuestion().id);

  for (let index = 0; index < 12; index += 1) answer(first, false);
  assert.equal(first.computeResult().stopReason, 'minimum_evidence');
});

test('an unstable B2 route continues beyond question 12 when more answers can change the result', () => {
  const engine = new Engine(makeBank(), 7);
  const opening = [true, true, true, true, true, true, true, true, false, true, true, false];
  opening.forEach((correct) => answer(engine, correct));

  assert.equal(engine.computeResult().estimatedLevel, 'B2');
  assert.equal(engine.shouldFinish(), false);

  while (!engine.shouldFinish()) answer(engine, true);
  assert.ok(engine.history.length > 12);
  assert.ok(engine.history.length <= 20);
});

test('promotion at question 12 must be tested on the newly reached neighboring band', () => {
  const engine = new Engine(makeBank(), 7);
  for (let index = 0; index < 10; index += 1) answer(engine, false);
  answer(engine, true);
  answer(engine, true);

  assert.equal(engine.computeResult().estimatedLevel, 'A1');
  assert.equal(engine.pickNextQuestion().level, 'A2');
  assert.equal(engine.shouldFinish(), false);
});

test('a completed answer is saved so an immediate repeat attempt avoids that question', () => {
  const originalStorage = globalThis.localStorage;
  const values = new Map();
  globalThis.localStorage = {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, value),
  };
  try {
    const firstAttempt = new Engine(makeBank(), 8080);
    const first = answer(firstAttempt, false);
    const saved = JSON.parse(values.get('en_test_recent'));
    assert.ok(Number.isFinite(saved[first.id]));

    const repeatAttempt = new Engine(makeBank(), 8080);
    const repeatedFirst = repeatAttempt.pickNextQuestion();
    assert.notEqual(repeatedFirst.id, first.id);
    assert.ok(Object.keys(repeatAttempt.recentQuestions).length <= 240);
  } finally {
    if (originalStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = originalStorage;
  }
});
