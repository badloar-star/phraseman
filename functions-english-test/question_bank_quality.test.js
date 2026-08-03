const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');

const ROOT = path.join(__dirname, '..');
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const RANGES = {
  A1: [0.5, 1.2], A2: [1.3, 2.2], B1: [2.3, 3.1],
  B2: [3.2, 3.9], C1: [4.0, 4.7], C2: [4.8, 5.5],
};
const SOURCE_DIR = path.join(ROOT, 'content', 'english-test', 'questions');
const WEB_BANK = path.join(ROOT, 'knowly-www', 'english-level-test', 'data', 'questions.en.json');
const FUNCTIONS_BANK = path.join(__dirname, 'data', 'questions.en.json');
const TECHNICAL_PLACEHOLDER = /\b(?:dossier|expediente|akte|pratica)\d+\b/i;

function sourceQuestions() {
  return LEVELS.flatMap((level) => JSON.parse(
    fs.readFileSync(path.join(SOURCE_DIR, `${level}.json`), 'utf8'),
  ).questions);
}

test('English pool has 40 reviewed, single-answer items in every CEFR band', () => {
  const questions = sourceQuestions();
  assert.equal(questions.length, 240);
  assert.equal(new Set(questions.map(({ id }) => id)).size, 240);

  for (const level of LEVELS) {
    const items = questions.filter((item) => item.level === level);
    assert.equal(items.length, 40, level);
    for (const item of items) {
      assert.match(item.id, new RegExp(`^en-${level.toLowerCase()}-\\d{3}$`));
      assert.equal(item.reviewStatus, 'reviewed', item.id);
      assert.equal(item.options.length, 4, item.id);
      assert.equal(new Set(item.options.map((value) => value.trim().toLowerCase())).size, 4, item.id);
      assert.ok(Number.isInteger(item.correctIndex) && item.correctIndex >= 0 && item.correctIndex < 4, item.id);
      assert.ok(item.difficulty >= RANGES[level][0] && item.difficulty <= RANGES[level][1], item.id);
      assert.match(item.scenarioRu, /[\u0400-\u04ff]/u, item.id);
      assert.match(item.instructionRu, /[\u0400-\u04ff]/u, item.id);
    }
  }
});

test('English pool contains no leaked multilingual technical identifiers', () => {
  for (const item of sourceQuestions()) {
    const learnerText = [item.scenario, item.prompt, item.stimulus, ...item.options].join('\n');
    assert.doesNotMatch(learnerText, TECHNICAL_PLACEHOLDER, item.id);
  }
});

test('confirmed English regressions keep their corrected single answers', () => {
  const byId = Object.fromEntries(sourceQuestions().map((question) => [question.id, question]));
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
    'en-c2-006': 'hand in',
    'en-c2-007': 'The sources are numerous, but the central argument may still be weak.',
    'en-c2-008': 'Had it not been for',
    'en-c2-009': 'isn’t necessarily',
    'en-c2-010': 'did they know',
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

  assert.match(byId['en-c1-006'].options[byId['en-c1-006'].correctIndex], /has a candidate demonstrated/i);
  assert.equal(byId['en-c2-029'].options.some((option) => /all are acceptable/i.test(option)), false);
  for (const [id, answer] of Object.entries(correctedAnswers)) {
    assert.equal(byId[id].options[byId[id].correctIndex], answer, id);
  }
});

test('C2 replacements do not regress to lower-band grammar templates', () => {
  const byId = Object.fromEntries(sourceQuestions().map((question) => [question.id, question]));
  for (const id of ['en-c2-007', 'en-c2-015', 'en-c2-016', 'en-c2-017', 'en-c2-018', 'en-c2-024']) {
    assert.ok(['reading', 'pragmatics', 'vocabulary'].includes(byId[id].skill), id);
  }
});

test('maintenance script cannot certify its own review status', () => {
  const source = fs.readFileSync(path.join(ROOT, 'scripts', 'revise_english_test_bank.mjs'), 'utf8');
  assert.doesNotMatch(source, /reviewStatus:\s*['"]reviewed['"]/);
});

test('upper bands retain direct evidence items required by the adaptive engine', () => {
  const questions = sourceQuestions();
  for (const level of ['C1', 'C2']) {
    const eligible = questions.filter((item) => item.level === level && item.upperBandEvidence === true);
    assert.ok(eligible.length >= 12, `${level} must retain substantial direct evidence`);
  }
});

test('generated web and functions banks exactly match the six English sources', () => {
  const source = sourceQuestions();
  const web = JSON.parse(fs.readFileSync(WEB_BANK, 'utf8'));
  const functions = JSON.parse(fs.readFileSync(FUNCTIONS_BANK, 'utf8'));
  assert.deepEqual(web.questions, source);
  assert.deepEqual(functions, web);
  assert.equal(fs.readFileSync(FUNCTIONS_BANK, 'utf8'), fs.readFileSync(WEB_BANK, 'utf8'));
});

test('English generator check is read-only and the shared registry is English-only', async () => {
  const outputs = [WEB_BANK, FUNCTIONS_BANK];
  const before = outputs.map((output) => ({
    text: fs.readFileSync(output, 'utf8'),
    mtimeNs: fs.statSync(output, { bigint: true }).mtimeNs,
  }));

  execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'generate_english_test_assets.mjs'), '--check'], {
    cwd: ROOT,
    stdio: 'pipe',
  });

  outputs.forEach((output, index) => {
    assert.equal(fs.readFileSync(output, 'utf8'), before[index].text);
    assert.equal(fs.statSync(output, { bigint: true }).mtimeNs, before[index].mtimeNs);
  });

  const bank = await import(pathToFileURL(path.join(ROOT, 'scripts', 'lib', 'language_test_bank.mjs')).href);
  assert.deepEqual(bank.LANGUAGES, ['en']);
  assert.deepEqual(bank.DIALECTS, { en: ['neutral', 'british', 'american'] });
});
