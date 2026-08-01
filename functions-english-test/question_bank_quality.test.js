/* global __dirname */
const assert = require('node:assert/strict');
const { Buffer } = require('node:buffer');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { pathToFileURL } = require('node:url');

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
  assert.equal(
    fs.readFileSync(path.join(ROOT, 'functions-english-test', 'data', 'questions.en.json'), 'utf8'),
    fs.readFileSync(path.join(ROOT, 'knowly-www', 'english-level-test', 'data', 'questions.en.json'), 'utf8'),
    'web and functions outputs must be byte-equivalent',
  );
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

test('generic language bank builder preserves the frozen registry and English compatibility contract', async () => {
  const bank = await import(pathToFileURL(path.join(ROOT, 'scripts', 'lib', 'language_test_bank.mjs')).href);

  assert.deepEqual(bank.LEVELS, ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);
  assert.deepEqual(bank.LANGUAGES, ['en', 'de', 'fr', 'it', 'es']);
  assert.deepEqual(bank.DIALECTS, {
    en: ['neutral', 'british', 'american'],
    de: ['standard'],
    fr: ['standard'],
    it: ['standard'],
    es: ['standard'],
  });
  assert.throws(() => bank.assertLanguage('pt'), /Unsupported language: pt/);
  assert.equal(
    bank.sourceDirFor(ROOT, 'en'),
    path.join(ROOT, 'content', 'english-test', 'questions'),
  );
  assert.equal(
    bank.sourceDirFor(ROOT, 'de'),
    path.join(ROOT, 'content', 'language-tests', 'questions', 'de'),
  );
  assert.deepEqual(bank.outputPathsFor(ROOT, 'fr'), [
    path.join(ROOT, 'knowly-www', 'english-level-test', 'data', 'questions.fr.json'),
    path.join(ROOT, 'functions-english-test', 'data', 'questions.fr.json'),
  ]);

  const sourceLevels = LEVELS.map(readLevel);
  const canonical = Buffer.from(JSON.stringify({
    schemaVersion: sourceLevels[0].schemaVersion,
    bankVersion: sourceLevels[0].bankVersion,
    language: 'en',
    levels: LEVELS,
    questions: sourceLevels.flatMap((data) => data.questions),
  }, null, 2) + '\n', 'utf8');
  const generated = Buffer.from(bank.buildLanguageBank({ root: ROOT, language: 'en' }), 'utf8');
  const outputs = bank.outputPathsFor(ROOT, 'en').map((output) => fs.readFileSync(output));
  assert.deepEqual(generated, canonical, 'builder must preserve legacy JSON.stringify(..., null, 2) + LF bytes');
  assert.deepEqual(outputs[0], canonical, 'web output must use canonical raw bytes');
  assert.deepEqual(outputs[1], canonical, 'server output must use canonical raw bytes');
  assert.equal(canonical.includes(Buffer.from('\r\n')), false, 'canonical output must not contain CRLF');
});

test('generated language test artifacts are protected from checkout line-ending conversion', () => {
  const attributes = fs.readFileSync(path.join(ROOT, '.gitattributes'), 'utf8');
  assert.match(attributes, /^knowly-www\/english-level-test\/data\/questions\.\*\.json text eol=lf$/m);
  assert.match(attributes, /^functions-english-test\/data\/questions\.\*\.json text eol=lf$/m);
});

test('multilingual quality auditor rejects each deliberate survivor mutation without mutating its fixture', async () => {
  const audit = await import(pathToFileURL(path.join(ROOT, 'scripts', 'audit_language_test_bank.mjs')).href);
  const fixture = {
    language: 'de',
    questions: LEVELS.flatMap((level) => {
      const quotas = ['A1', 'A2'].includes(level)
        ? { grammar: 12, vocabulary: 10, reading: 10, pragmatics: 8 }
        : ['B1', 'B2'].includes(level)
          ? { grammar: 10, vocabulary: 10, reading: 10, pragmatics: 10 }
          : { grammar: 8, vocabulary: 8, reading: 12, pragmatics: 12 };
      return Object.entries(quotas).flatMap(([skill, count]) => Array.from({ length: count }, (_, index) => ({
        id: `de-${level.toLowerCase()}-${skill}-${index + 1}`,
        level,
        skill,
        constructId: `de-${level.toLowerCase()}-${skill}-${index + 1}`,
        descriptorRefs: [`CEFR-2020-${level}-reception-anchor`],
        targetConstruct: `${skill} construct ${index + 1}`,
        canDo: `Can complete adult ${skill} task ${index + 1}.`,
        itemFormat: 'four-option contextual choice',
        adultContext: 'adult public-service context',
        fairnessRisk: 'avoid specialist knowledge',
        constructIrrelevantRisk: 'avoid typography clues',
        evidenceLabel: 'CEFR_2020_RECEPTION',
        stimulus: `${level} ${skill} unique${level}${skill}${index + 1} bespoke${level}${skill}${index + 1} marker${level}${skill}${index + 1}${['C1', 'C2'].includes(level) && index < 6 ? '. Second adult message gives essential context today.' : ''}`,
        options: ['eins', 'zwei', 'drei', 'vier'].map((option) => `${option}-${level}-${skill}-${index}`),
        correctIndex: 0,
        instructionRu: 'Выберите естественный вариант.',
        instructionEn: 'Choose the natural option.',
        routingEligible: !['C1', 'C2'].includes(level) || ['reading', 'pragmatics'].includes(skill),
        upperBandEvidence: ['C1', 'C2'].includes(level) && ['reading', 'pragmatics'].includes(skill),
        externalKnowledgeRequired: false,
        answerableFromStimulus: true,
        logicalInference: level === 'C2' && ['reading', 'pragmatics'].includes(skill) && index < 6 ? { domain: 'reading_pragmatics', premises: ['First statement', 'Second statement'], unstatedConclusion: 'A conclusion follows.', whyNotExplicit: 'Neither sentence states it directly.' } : undefined,
        review: Object.fromEntries(audit.REVIEW_FIELDS.map((field) => [field, 'pass'])),
      })));
    }),
  };
  fixture.questions.forEach((question) => {
    question.review.rationales = { 1: 'wrong agreement', 2: 'wrong register', 3: 'wrong meaning' };
    question.review.authoringPass = 'pass';
    question.review.adversarialPass = 'pass';
    question.review.deterministicPass = 'pass';
    question.review.levelCoveragePass = 'pass';
    question.review.reviewStatus = 'reviewed';
    question.review.sha256 = audit.questionSha256(question);
  });
  const before = JSON.stringify(fixture);
  assert.deepEqual(audit.auditQuestionBank(fixture).errors, []);
  assert.equal(JSON.stringify(fixture), before);

  const survivors = [
    ['duplicate ID', (items) => { items[1].id = items[0].id; }, /duplicate question ID/],
    ['cross-level construct reuse', (items) => { items[40].constructId = items[0].constructId; }, /duplicate constructId/],
    ['English instruction leakage', (items) => { items[0].instructionEn = `Choose ${items[0].options[0]}.`; }, /instructionEn leaks/],
    ['meaningful accented answer leakage', (items) => { items[0].options[0] = 'sí'; items[0].instructionEn = 'Choose sí.'; }, /instructionEn leaks/],
    ['ordinary article duplicate', (items) => { items[1].options[1] = `der ${items[0].options[1]}`; }, /duplicate material/],
    ['five structural fingerprints', (items) => { for (let i = 0; i < 5; i += 1) items[i].stimulus = `Item ${i + 1}: ____.`; }, /repeated structural fingerprint/],
    ['reconstructed sentence duplicate', (items) => { items[0].stimulus = 'Repeat ____ now.'; items[1].stimulus = `Repeat ${items[0].options[0]} now.`; }, /reconstructed sentence duplicate/],
    ['C2 grammar-only inference', (items) => { const item = items.find((question) => question.level === 'C2'); item.skill = 'grammar'; item.logicalInference = { evidence: 'Choose the grammatical form.', domain: 'grammar' }; }, /logical inference/],
    ['punctuation fake depth', (items) => { items.filter((question) => question.level === 'C1' && ['reading', 'pragmatics'].includes(question.skill)).forEach((item) => { item.stimulus = 'One. Two.'; }); }, /meaningful multi-sentence/],
    ['obscure trivia', (items) => { const item = items.find((question) => question.level === 'C2'); item.stimulus = 'In 1837, which obscure local decree changed the archive?'; }, /external-knowledge/],
    ['bank language mismatch', (items) => { items[0].id = 'fr-a1-grammar-1'; }, /ID prefix/],
    ['meaningless descriptor refs', (items) => { items[0].descriptorRefs = ['x']; }, /descriptorRefs/],
    ['upper routing evidence gap', (items) => { const item = items.find((question) => question.level === 'C1' && question.routingEligible); item.upperBandEvidence = false; }, /upperBandEvidence/],
  ];
  for (const [name, mutate, expected] of survivors) {
    const copy = JSON.parse(JSON.stringify(fixture));
    mutate(copy.questions);
    assert.match(audit.auditQuestionBank(copy).errors.join('\n'), expected, name);
  }
  const shortArticle = JSON.parse(JSON.stringify(fixture));
  shortArticle.questions[0].options[0] = 'la';
  shortArticle.questions[0].instructionEn = 'Choose the natural option.';
  shortArticle.questions[0].review.sha256 = audit.questionSha256(shortArticle.questions[0]);
  assert.doesNotMatch(audit.auditQuestionBank(shortArticle).errors.join('\n'), /instructionEn leaks/, 'short valid article la');
  for (const article of ['den', 'dem', 'des', 'einem']) {
    const copy = JSON.parse(JSON.stringify(fixture));
    copy.questions[1].options[1] = `${article} ${copy.questions[0].options[1]}`;
    assert.match(audit.auditQuestionBank(copy).errors.join('\n'), /duplicate material/, `${article} normalization`);
  }
});

test('multilingual audit binds reviews from a separate, complete review file', async () => {
  const audit = await import(pathToFileURL(path.join(ROOT, 'scripts', 'audit_language_test_bank.mjs')).href);
  const sourceRaw = Buffer.from('{"language":"de","questions":[{"id":"de-a1-001","level":"A1","correctIndex":0}]}\n');
  const review = {
    language: 'de', level: 'A1', sourceSha256: audit.sha256Raw(sourceRaw), reviews: [{
      id: 'de-a1-001', language: 'de', level: 'A1', reviewStatus: 'reviewed',
      accuracy: 'pass', levelFit: 'pass', singleAnswer: 'pass', distractorExclusivity: 'pass', naturalness: 'pass', originality: 'pass', ruInstructionAccuracy: 'pass', enInstructionAccuracy: 'pass',
      authoringPass: 'pass', adversarialPass: 'pass', deterministicPass: 'pass', levelCoveragePass: 'pass',
      rationales: { 1: 'wrong agreement', 2: 'wrong register', 3: 'wrong meaning' },
    }],
  };
  assert.deepEqual(audit.auditSeparateReview({ sourceRaw, questions: JSON.parse(sourceRaw).questions, review, language: 'de', level: 'A1' }).errors, []);
  review.reviews[0].accuracy = 'fail';
  assert.match(audit.auditSeparateReview({ sourceRaw, questions: JSON.parse(sourceRaw).questions, review, language: 'de', level: 'A1' }).errors.join('\n'), /accuracy/);
  review.reviews[0].accuracy = 'pass';
  review.sourceSha256 = '0'.repeat(64);
  assert.match(audit.auditSeparateReview({ sourceRaw, questions: JSON.parse(sourceRaw).questions, review, language: 'de', level: 'A1' }).errors.join('\n'), /stale review hash/);
  review.sourceSha256 = audit.sha256Raw(sourceRaw);
  review.reviews.push({ ...review.reviews[0] });
  assert.match(audit.auditSeparateReview({ sourceRaw, questions: JSON.parse(sourceRaw).questions, review, language: 'de', level: 'A1' }).errors.join('\n'), /exactly one/);
  review.reviews.length = 1;
  review.reviews[0].rationales = { 0: 'wrong key', 1: 'wrong agreement', 2: 'wrong register' };
  assert.match(audit.auditSeparateReview({ sourceRaw, questions: JSON.parse(sourceRaw).questions, review, language: 'de', level: 'A1' }).errors.join('\n'), /incomplete review/);
});

test('all four current project blueprints are intentionally RED until Phase B supplies individual authoring objects', async () => {
  const audit = await import(pathToFileURL(path.join(ROOT, 'scripts', 'audit_language_test_bank.mjs')).href);
  for (const language of ['de', 'fr', 'it', 'es']) {
    const blueprint = JSON.parse(fs.readFileSync(path.join(ROOT, 'content', 'language-tests', 'blueprints', `${language}.json`), 'utf8'));
    assert.match(audit.auditBlueprint(blueprint).errors.join('\n'), /40 individual construct objects/, language);
  }
});

test('audit CLI rejects traversal, writes only confined reports, and --allow-draft changes only final-evidence failures', () => {
  const auditScript = path.join(ROOT, 'scripts', 'audit_language_test_bank.mjs');
  assert.match(execFileSync(process.execPath, [auditScript, '--help'], { encoding: 'utf8' }), /--allow-draft/);
  assert.throws(() => execFileSync(process.execPath, [auditScript, '--language', '..'], { encoding: 'utf8', stdio: 'pipe' }), /unknown argument|unsupported language/);
  const run = require('node:child_process').spawnSync(process.execPath, [auditScript, '--all', '--allow-draft'], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(run.status, 1, 'missing sources remain an error in draft mode');
  assert.match(run.stdout, /de: failed/);
  assert.doesNotMatch(run.stdout, /\.\.\\|\.\.\//);
});

test('generic check rejects a one-byte line-ending drift without changing output bytes or mtimes', async () => {
  const bank = await import(pathToFileURL(path.join(ROOT, 'scripts', 'lib', 'language_test_bank.mjs')).href);
  const outputs = bank.outputPathsFor(ROOT, 'en');
  const before = outputs.map((output) => ({
    bytes: fs.readFileSync(output),
    mtimeNs: fs.statSync(output, { bigint: true }).mtimeNs,
  }));

  assert.doesNotThrow(() => bank.checkGeneratedOutputs({ root: ROOT, languages: ['en'] }));
  outputs.forEach((output, index) => {
    assert.deepEqual(fs.readFileSync(output), before[index].bytes);
    assert.equal(fs.statSync(output, { bigint: true }).mtimeNs, before[index].mtimeNs);
  });

  const tempRoot = path.join(ROOT, '.codex-tmp', 'language-test-bank-quality');
  fs.rmSync(tempRoot, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(bank.sourceDirFor(tempRoot, 'en')), { recursive: true });
  fs.cpSync(bank.sourceDirFor(ROOT, 'en'), bank.sourceDirFor(tempRoot, 'en'), { recursive: true });
  for (const [index, output] of bank.outputPathsFor(ROOT, 'en').entries()) {
    const tempOutput = bank.outputPathsFor(tempRoot, 'en')[index];
    fs.mkdirSync(path.dirname(tempOutput), { recursive: true });
    fs.copyFileSync(output, tempOutput);
  }
  const tempOutputs = bank.outputPathsFor(tempRoot, 'en');
  fs.writeFileSync(tempOutputs[0], fs.readFileSync(tempOutputs[0]).toString('utf8').replace(/\n/g, '\r\n'), 'utf8');
  const driftBefore = tempOutputs.map((output) => ({
    bytes: fs.readFileSync(output),
    mtimeNs: fs.statSync(output, { bigint: true }).mtimeNs,
  }));
  assert.throws(
    () => bank.checkGeneratedOutputs({ root: tempRoot, languages: ['en'] }),
    /generated output differs/,
  );
  tempOutputs.forEach((output, index) => {
    assert.deepEqual(fs.readFileSync(output), driftBefore[index].bytes);
    assert.equal(fs.statSync(output, { bigint: true }).mtimeNs, driftBefore[index].mtimeNs);
  });
  fs.rmSync(tempRoot, { recursive: true, force: true });
});

test('generic builder rejects malformed language fixtures without writing outputs', async () => {
  const bank = await import(pathToFileURL(path.join(ROOT, 'scripts', 'lib', 'language_test_bank.mjs')).href);
  const tempRoot = path.join(ROOT, '.codex-tmp', 'language-test-bank-negative-fixtures');
  const copyEnglish = (language = 'en') => {
    const source = bank.sourceDirFor(tempRoot, language);
    fs.mkdirSync(path.dirname(source), { recursive: true });
    fs.cpSync(bank.sourceDirFor(ROOT, 'en'), source, { recursive: true });
    for (const level of LEVELS) {
      const file = path.join(source, `${level}.json`);
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      data.language = language;
      data.questions.forEach((question) => {
        question.id = question.id.replace(/^en-/, `${language}-`);
        if (language !== 'en') question.dialect = 'standard';
      });
      fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
    }
    return source;
  };
  const expectRejected = (mutate, expected) => {
    fs.rmSync(tempRoot, { recursive: true, force: true });
    const source = copyEnglish('en');
    mutate(source);
    assert.throws(() => bank.buildLanguageBank({ root: tempRoot, language: 'en' }), expected);
    assert.equal(fs.existsSync(bank.outputPathsFor(tempRoot, 'en')[0]), false, 'builder must not write web output');
    assert.equal(fs.existsSync(bank.outputPathsFor(tempRoot, 'en')[1]), false, 'builder must not write server output');
  };

  try {
    expectRejected((source) => {
      const file = path.join(source, 'A1.json');
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      data.questions[0].id = 'de-a1-001';
      fs.writeFileSync(file, JSON.stringify(data), 'utf8');
    }, /must use the en- ID prefix/);
    expectRejected((source) => {
      const file = path.join(source, 'A1.json');
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      data.questions[1].difficulty = data.questions[0].difficulty;
      fs.writeFileSync(file, JSON.stringify(data), 'utf8');
    }, /difficulty is not ascending/);
    expectRejected((source) => {
      const file = path.join(source, 'A2.json');
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      data.questions[0].level = 'A1';
      fs.writeFileSync(file, JSON.stringify(data), 'utf8');
    }, /has level A1, expected A2/);
    expectRejected((source) => {
      const file = path.join(source, 'A1.json');
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      data.questions[0].correctIndex = 1;
      fs.writeFileSync(file, JSON.stringify(data), 'utf8');
    }, /correctIndex distribution/);

    fs.rmSync(tempRoot, { recursive: true, force: true });
    const germanSource = copyEnglish('de');
    let german = JSON.parse(fs.readFileSync(path.join(germanSource, 'A1.json'), 'utf8'));
    german.questions[0].dialect = 'british';
    fs.writeFileSync(path.join(germanSource, 'A1.json'), JSON.stringify(german), 'utf8');
    assert.throws(() => bank.buildLanguageBank({ root: tempRoot, language: 'de' }), /invalid de dialect/);

    german = JSON.parse(fs.readFileSync(path.join(germanSource, 'A1.json'), 'utf8'));
    german.questions[0].dialect = 'standard';
    delete german.questions[0].targetConstruct;
    fs.writeFileSync(path.join(germanSource, 'A1.json'), JSON.stringify(german), 'utf8');
    assert.throws(() => bank.buildLanguageBank({ root: tempRoot, language: 'de' }), /missing field: targetConstruct/);

    fs.rmSync(tempRoot, { recursive: true, force: true });
    const validSource = copyEnglish('en');
    const generated = bank.buildLanguageBank({ root: tempRoot, language: 'en' });
    const [webOutput, serverOutput] = bank.outputPathsFor(tempRoot, 'en');
    fs.mkdirSync(path.dirname(webOutput), { recursive: true });
    fs.writeFileSync(webOutput, generated, 'utf8');
    const before = { bytes: fs.readFileSync(webOutput), mtimeNs: fs.statSync(webOutput, { bigint: true }).mtimeNs };
    assert.throws(() => bank.checkGeneratedOutputs({ root: tempRoot, languages: ['en'] }), /output does not exist/);
    assert.deepEqual(fs.readFileSync(webOutput), before.bytes);
    assert.equal(fs.statSync(webOutput, { bigint: true }).mtimeNs, before.mtimeNs);
    assert.equal(fs.existsSync(serverOutput), false);
    assert.ok(validSource);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});
