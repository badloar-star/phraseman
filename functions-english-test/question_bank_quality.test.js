const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.join(__dirname, '..');
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const RANGES = {
  A1: [0.5, 1.2],
  A2: [1.3, 2.2],
  B1: [2.3, 3.1],
  B2: [3.2, 3.9],
  C1: [4.0, 4.7],
  C2: [4.8, 5.5],
};
const REQUIRED_REVIEW_FIELDS = [
  'targetConstruct',
  'cefrRationale',
  'dialect',
  'reviewStatus',
  'ambiguityNotes',
];
const REQUIRED_RUSSIAN_UI_FIELDS = ['scenarioRu', 'instructionRu'];
const CYRILLIC_PATTERN = /[\u0400-\u04FF]/;

function readLevel(level) {
  return JSON.parse(fs.readFileSync(
    path.join(ROOT, 'content', 'english-test', 'questions', `${level}.json`),
    'utf8',
  ));
}

test('every level has 40 reviewed, unambiguous items in its CEFR range', () => {
  const ids = new Set();
  for (const level of LEVELS) {
    const data = readLevel(level);
    assert.equal(data.questions.length, 40, `${level} count`);
    const skills = new Set();
    const positions = [0, 0, 0, 0];

    for (const question of data.questions) {
      assert.equal(question.level, level, question.id);
      assert.equal(ids.has(question.id), false, `duplicate ${question.id}`);
      ids.add(question.id);
      for (const field of REQUIRED_REVIEW_FIELDS) {
        assert.equal(typeof question[field], 'string', `${question.id} ${field}`);
        assert.ok(question[field].trim(), `${question.id} ${field} must not be empty`);
      }
      for (const field of REQUIRED_RUSSIAN_UI_FIELDS) {
        assert.equal(typeof question[field], 'string', `${question.id} ${field}`);
        assert.ok(question[field].trim(), `${question.id} ${field} must not be empty`);
        assert.match(question[field], CYRILLIC_PATTERN, `${question.id} ${field} must be Russian`);
      }
      assert.equal(typeof question.stimulus, 'string', `${question.id} stimulus`);
      assert.equal(question.reviewStatus, 'reviewed', question.id);
      assert.ok(['neutral', 'british', 'american'].includes(question.dialect), question.id);
      assert.equal(question.options.length, 4, question.id);
      assert.equal(new Set(question.options.map((option) => option.trim().toLowerCase())).size, 4, question.id);
      assert.ok(!question.options.some((option) => /all (?:are|of the above)/i.test(option)), question.id);
      assert.ok(question.difficulty >= RANGES[level][0], question.id);
      assert.ok(question.difficulty <= RANGES[level][1], question.id);
      assert.notEqual(question.skill, 'listening', question.id);
      skills.add(question.skill);
      positions[question.correctIndex] += 1;
    }

    assert.ok(skills.size >= 3, `${level} represents only ${[...skills].join(', ')}`);
    assert.deepEqual(positions, [10, 10, 10, 10], `${level} stored answer positions`);
  }
  assert.equal(ids.size, 240);
});

test('beginner tasks explain the action in Russian and keep the assessed language in English', () => {
  const questions = ['A1', 'A2'].flatMap((level) => readLevel(level).questions);
  const byId = Object.fromEntries(questions.map((question) => [question.id, question]));

  for (const question of questions) {
    assert.match(question.scenarioRu, CYRILLIC_PATTERN, `${question.id} scenario`);
    assert.match(question.instructionRu, CYRILLIC_PATTERN, `${question.id} instruction`);
    assert.equal(
      question.options.some((option) => CYRILLIC_PATTERN.test(option)),
      false,
      `${question.id} options must remain English assessment material`,
    );
  }

  assert.equal(byId['en-a1-005'].scenarioRu, 'Заказ в кафе');
  assert.equal(
    byId['en-a1-005'].instructionRu,
    'Бариста спрашивает, что ты хочешь заказать. Выбери самый естественный ответ.',
  );
  assert.equal(byId['en-a1-005'].stimulus, 'What would you like?');
  assert.equal(byId['en-a1-005'].options[byId['en-a1-005'].correctIndex], 'A coffee, please.');
});

test('English stimulus does not repeat service instructions already shown in Russian', () => {
  const questions = LEVELS.flatMap((level) => readLevel(level).questions);
  const byId = Object.fromEntries(questions.map((question) => [question.id, question]));
  const englishMetaInstruction = /^(?:choose|read(?: the text)?|complete|use|repeat|in formal (?:english|writing)|which response|which opening)\b/i;

  for (const question of questions) {
    assert.doesNotMatch(question.stimulus, englishMetaInstruction, question.id);
  }

  assert.equal(
    byId['en-b1-023'].stimulus,
    'The government has announced plans to reduce carbon emissions by 40% before 2030. The new policy will affect the transport and energy sectors.',
  );
  assert.equal(
    byId['en-c2-020'].stimulus,
    'A reviewer concludes, “The proposal is not without merit, though its central assumption remains untested.”',
  );
});

test('localization preserves complete assessed sentences and precise high-band tasks', () => {
  const questions = LEVELS.flatMap((level) => readLevel(level).questions);
  const byId = Object.fromEntries(questions.map((question) => [question.id, question]));
  const genericInstructions = new Set([
    'Выбери грамматически правильный вариант.',
    'Выбери форму, которая правильно завершает английское предложение.',
    'Выбери английское слово или выражение, которое лучше всего подходит по смыслу.',
    'Выбери английское слово или выражение, которое правильно заполняет пропуск.',
    'Прочитай английский текст и выбери правильный ответ.',
    'Прочитай английский текст и выбери правильный вариант.',
    'Прочитай ситуацию и выбери самый естественный и уместный ответ.',
    'Прочитай ситуацию и выбери самый естественный и уместный вариант.',
  ]);

  for (const question of questions) {
    const promptBlankCount = (question.prompt.match(/______/g) || []).length;
    const stimulusBlankCount = (question.stimulus.match(/______/g) || []).length;
    assert.equal(stimulusBlankCount, promptBlankCount, `${question.id} assessed blanks`);
    if (question.prompt !== question.stimulus) {
      assert.equal(
        genericInstructions.has(question.instructionRu),
        false,
        `${question.id} transformed prompt needs a specific Russian goal`,
      );
    }
  }

  assert.equal(byId['en-a2-005'].stimulus, 'What were you doing when I ______?');
  assert.match(byId['en-a1-022'].stimulus, /The shop ______ at 9:00\./);
  assert.equal(
    byId['en-b2-027'].stimulus,
    '“Will you come to the party?” “Yes, I ______.”',
  );
  assert.equal(
    byId['en-c1-015'].instructionRu,
    'Определи основную функцию оборота “I wonder whether you might”.',
  );
  assert.equal(
    byId['en-c2-020'].instructionRu,
    'Выбери толкование, которое точнее всего сохраняет позицию рецензента.',
  );
  assert.equal(
    byId['en-c2-039'].instructionRu,
    'Определи, что библиотекарь подразумевает своим ответом.',
  );
  const neutralUpperBandInstructions = {
    'en-c1-028': 'Определи, что говорящий сообщает этой фразой.',
    'en-c2-029': 'Определи позицию аналитика, выраженную этой формулировкой.',
    'en-c2-035': 'Выбери наиболее точное толкование высказывания.',
    'en-c2-036': 'Определи, что делает говорящий этой формулировкой.',
    'en-c2-037': 'Определи, что здесь выражает оборот “purports to”.',
  };
  for (const [id, instruction] of Object.entries(neutralUpperBandInstructions)) {
    assert.equal(byId[id].instructionRu, instruction, id);
  }
});

test('confirmed broken items contain the corrected one-answer forms', () => {
  const questions = LEVELS.flatMap((level) => readLevel(level).questions);
  const byId = Object.fromEntries(questions.map((question) => [question.id, question]));

  assert.match(byId['en-c1-006'].options[byId['en-c1-006'].correctIndex], /has a candidate demonstrated/i);
  assert.match(byId['en-c2-006'].options[byId['en-c2-006'].correctIndex], /^hand in$/i);
  assert.match(byId['en-c2-010'].options[byId['en-c2-010'].correctIndex], /^did they know$/i);
  assert.equal(byId['en-c2-029'].options.some((option) => /all are acceptable/i.test(option)), false);

  const correctedAnswers = {
    'en-a1-031': '7:15',
    'en-a1-039': 'never',
    'en-a2-031': 'boils',
    'en-a2-034': 'onto',
    'en-b1-003': 'has been studying',
    'en-b1-011': 'were',
    'en-b1-025': 'make',
    'en-b1-028': 'don’t have to',
    'en-b2-003': 'had taken',
    'en-b2-005': 'had been',
    'en-b2-008': 'have I seen',
    'en-b2-012': 'be',
    'en-b2-019': 'told',
    'en-b2-020': 'went',
    'en-b2-021': 'is supposed to leave',
    'en-b2-022': 'needn’t have',
    'en-b2-027': 'will',
    'en-c1-001': 'be remanded',
    'en-c1-002': 'be verified',
    'en-c1-004': 'Should',
    'en-c1-012': 'casts',
    'en-c1-015': 'It softens a request for reconsideration.',
    'en-c1-016': 'provisional',
    'en-c1-017': 'has',
    'en-c1-022': 'should',
    'en-c1-024': 'Stream of consciousness',
    'en-c1-026': 'ingenious',
    'en-c1-027': 'predict a decline',
    'en-c1-028': 'A further delay remains possible.',
    'en-c1-031': 'under',
    'en-c1-032': 'glossed over',
    'en-c1-033': 'was',
    'en-c1-034': 'Much as',
    'en-c1-035': 'undermined',
    'en-c1-038': 'substantiated',
    'en-c1-040': 'It was broadly directional but not precise.',
    'en-c2-001': 'needn’t have',
    'en-c2-002': 'didn’t need to',
    'en-c2-005': 'didn’t say',
    'en-c2-007': 'The sources are numerous, but the central argument may still be weak.',
    'en-c2-008': 'Had it not been for',
    'en-c2-009': 'isn’t necessarily',
    'en-c2-014': 'albeit',
    'en-c2-015': 'The findings may be consistent with a causal relationship.',
    'en-c2-016': 'nonetheless',
    'en-c2-017': 'At least one member did not reject it.',
    'en-c2-018': 'insofar as',
    'en-c2-020': 'The proposal has some merit, but the reviewer retains a serious reservation.',
    'en-c2-021': 'equivocal',
    'en-c2-022': 'The concession does not surrender or weaken those rights.',
    'en-c2-023': 'Every resubmitted amendment had been rejected by the committee.',
    'en-c2-024': 'The minister did not issue a full denial.',
    'en-c2-029': 'The analyst questions the reported magnitude without necessarily denying an effect.',
    'en-c2-030': 'The cost reduction is accepted, while the effect on outcomes remains unresolved.',
    'en-c2-032': 'understatement',
    'en-c2-033': 'ostensibly',
    'en-c2-034': 'contingent upon',
    'en-c2-035': 'Possibly none survived, and certainly not many did.',
    'en-c2-036': 'Rejecting “conclusive” as too strong while leaving room for weaker support.',
    'en-c2-037': 'The paper claims to do so, but the writer withholds endorsement.',
    'en-c2-038': 'It continued in a more limited form rather than simply being dropped.',
    'en-c2-040': 'It prevents the statement from being treated as conceding liability.',
  };
  for (const [id, answer] of Object.entries(correctedAnswers)) {
    assert.equal(byId[id].options[byId[id].correctIndex], answer, id);
  }
});

test('C2 review replacements do not repeat lower-band grammar templates', () => {
  const questions = LEVELS.flatMap((level) => readLevel(level).questions);
  const byId = Object.fromEntries(questions.map((question) => [question.id, question]));
  for (const id of ['en-c2-007', 'en-c2-015', 'en-c2-016', 'en-c2-017', 'en-c2-018', 'en-c2-024']) {
    assert.ok(['reading', 'pragmatics', 'vocabulary'].includes(byId[id].skill), id);
  }
});

test('upper bands expose a substantial explicit evidence-eligible subset', () => {
  for (const level of ['C1', 'C2']) {
    const questions = readLevel(level).questions;
    assert.ok(questions.every((question) => typeof question.upperBandEvidence === 'boolean'), level);
    assert.ok(
      questions.filter((question) => question.upperBandEvidence).length >= 12,
      `${level} has too few evidence-eligible items`,
    );
  }
});

test('maintenance script cannot certify its own review status', () => {
  const source = fs.readFileSync(path.join(ROOT, 'scripts', 'revise_english_test_bank.mjs'), 'utf8');
  assert.doesNotMatch(source, /reviewStatus:\s*['"]reviewed['"]/);
});

test('generated web and functions banks exactly match the six sources', () => {
  const sourceQuestions = LEVELS.flatMap((level) => readLevel(level).questions);
  const web = JSON.parse(fs.readFileSync(
    path.join(ROOT, 'knowly-www', 'english-level-test', 'data', 'questions.en.json'),
    'utf8',
  ));
  const functions = JSON.parse(fs.readFileSync(
    path.join(ROOT, 'functions-english-test', 'data', 'questions.en.json'),
    'utf8',
  ));

  assert.deepEqual(web.questions, sourceQuestions);
  assert.deepEqual(functions, web);
  const apiSource = fs.readFileSync(path.join(ROOT, 'functions-english-test', 'index.js'), 'utf8');
  assert.match(apiSource, new RegExp(`BANK_VERSION = '${web.bankVersion.replaceAll('.', '\\.')}'`));
});

test('--check is a read-only validation command', () => {
  const outputs = [
    path.join(ROOT, 'knowly-www', 'english-level-test', 'data', 'questions.en.json'),
    path.join(ROOT, 'functions-english-test', 'data', 'questions.en.json'),
  ];
  const before = outputs.map((output) => ({
    text: fs.readFileSync(output, 'utf8'),
    mtimeNs: fs.statSync(output, { bigint: true }).mtimeNs,
  }));

  execFileSync(process.execPath, [
    path.join(ROOT, 'scripts', 'generate_english_test_assets.mjs'),
    '--check',
  ], { cwd: ROOT, stdio: 'pipe' });

  outputs.forEach((output, index) => {
    assert.equal(fs.readFileSync(output, 'utf8'), before[index].text);
    assert.equal(fs.statSync(output, { bigint: true }).mtimeNs, before[index].mtimeNs);
  });
});
