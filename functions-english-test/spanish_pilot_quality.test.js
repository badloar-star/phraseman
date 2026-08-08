const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const PILOT_PATH = path.join(ROOT, 'content', 'language-test-pilots', 'es', 'control-set.json');
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const RANGES = {
  A1: [0.5, 1.2], A2: [1.3, 2.2], B1: [2.3, 3.1],
  B2: [3.2, 3.9], C1: [4.0, 4.7], C2: [4.8, 5.5],
};
const TECHNICAL_ID = /(?:\b(?:expediente|dossier|akte|pratica|archivo|registro|id|ref)[-_ ]?\d{2,}\b|\{\{?[^}\n]+\}?\})/iu;
const REQUIRED_ENGLISH_BANK_FIELDS = [
  'id', 'level', 'difficulty', 'skill', 'format', 'scenario', 'prompt', 'stimulus',
  'options', 'correctIndex', 'explanation', 'targetConstruct', 'cefrRationale',
  'dialect', 'reviewStatus', 'ambiguityNotes', 'scenarioRu', 'instructionRu',
];

function pilot() {
  assert.equal(fs.existsSync(PILOT_PATH), true, 'Spanish control set must exist outside production data trees');
  return JSON.parse(fs.readFileSync(PILOT_PATH, 'utf8'));
}

test('Spanish control-set pilot remains explicitly non-publishable beside the reviewed release bank', () => {
  const data = pilot();
  assert.equal(data.language, 'es');
  assert.equal(data.status, 'control_set');
  assert.equal(data.publishable, false);
  assert.equal(data.authorReviewStatus, 'self_checked');
  assert.equal(data.externalReviewStatus, 'pending');
  assert.equal(fs.existsSync(path.join(ROOT, 'knowly-www', 'english-level-test', 'data', 'questions.es.json')), true);
  assert.equal(fs.existsSync(path.join(ROOT, 'functions-english-test', 'data', 'questions.es.json')), true);
});

test('Spanish pilot covers every CEFR band with three bounded, unique items', () => {
  const data = pilot();
  assert.equal(data.questions.length, 18);
  assert.equal(new Set(data.questions.map(({ id }) => id)).size, 18);

  for (const level of LEVELS) {
    const items = data.questions.filter((item) => item.level === level);
    assert.equal(items.length, 3, level);
    assert.deepEqual(items.map(({ difficulty }) => difficulty), items.map(({ difficulty }) => difficulty).toSorted((a, b) => a - b), `${level}:difficulty order`);
    for (const item of items) {
      assert.match(item.id, new RegExp(`^es-pilot-${level.toLowerCase()}-\\d{3}$`));
      assert.ok(item.difficulty >= RANGES[level][0] && item.difficulty <= RANGES[level][1], item.id);
      assert.ok(['grammar', 'vocabulary', 'reading', 'pragmatics'].includes(item.skill), item.id);
      assert.ok(['multiple-choice', 'gap-fill'].includes(item.format), item.id);
      assert.equal(item.variety, 'es-general');
      assert.equal(item.claimBasis, 'SYNTHESIS');
      assert.equal(item.dialect, 'standard', item.id);
      assert.equal(item.reviewStatus, 'self_checked', item.id);
      for (const key of REQUIRED_ENGLISH_BANK_FIELDS) {
        assert.equal(Object.hasOwn(item, key), true, `${item.id}:${key}`);
      }
      for (const key of ['scenario', 'prompt', 'explanation', 'targetConstruct', 'cefrRationale', 'ambiguityNotes']) {
        assert.equal(typeof item[key], 'string', `${item.id}:${key}`);
        assert.ok(item[key].trim().length >= 12, `${item.id}:${key}`);
      }
      for (const key of ['scenario', 'prompt', 'explanation', 'cefrRationale', 'ambiguityNotes']) {
        assert.doesNotMatch(item[key], /[\u0400-\u04ff]/u, `${item.id}:${key}:must be English`);
      }
    }
  }

  const anchors = data.questions.filter((item) => item.level === 'A1' && item.difficulty <= 0.65);
  assert.equal(anchors.length, 2, 'the engine needs two easy A1 anchors');
  assert.equal(new Set(anchors.map(({ skill }) => skill)).size, 2, 'A1 anchors must exercise different skills');
});

test('every Spanish item has one declared answer and three documented distractors', () => {
  for (const item of pilot().questions) {
    assert.equal(item.options.length, 4, item.id);
    assert.equal(new Set(item.options.map((option) => option.normalize('NFKC').trim().toLocaleLowerCase('es'))).size, 4, item.id);
    assert.ok(Number.isInteger(item.correctIndex) && item.correctIndex >= 0 && item.correctIndex < 4, item.id);

    const wordCounts = item.options.map((option) => option.trim().split(/\s+/u).length).toSorted((a, b) => a - b);
    const medianWords = (wordCounts[1] + wordCounts[2]) / 2;
    const correctWords = item.options[item.correctIndex].trim().split(/\s+/u).length;
    assert.ok(correctWords <= Math.max(4, medianWords * 1.8), `${item.id}:correct-answer length cue`);

    const expectedDistractors = [0, 1, 2, 3]
      .filter((index) => index !== item.correctIndex)
      .map(String)
      .sort();
    assert.deepEqual(Object.keys(item.distractorRationalesRu).sort(), expectedDistractors, item.id);
    for (const rationale of Object.values(item.distractorRationalesRu)) {
      assert.match(rationale, /[\u0400-\u04ff]/u, item.id);
      assert.ok(rationale.length >= 24, item.id);
    }
    for (const key of ['canDoRu', 'scenarioRu', 'instructionRu', 'explanationRu', 'cefrRationaleRu', 'ambiguityNotesRu']) {
      assert.match(item[key], /[\u0400-\u04ff]/u, `${item.id}:${key}`);
      assert.ok(item[key].length >= 12, `${item.id}:${key}`);
    }
    const reviewCopy = [item.explanation, item.ambiguityNotes, item.explanationRu, item.ambiguityNotesRu].join('\n');
    assert.doesNotMatch(
      reviewCopy,
      /(?:\b(?:first|second|third|fourth)\s+(?:option|answer|reply)\b|\b(?:перв(?:ый|ая|ое)|втор(?:ой|ая|ое)|трет(?:ий|ья|ье)|четв[её]рт(?:ый|ая|ое))\s+(?:вариант|ответ)\b)/iu,
      `${item.id}:position-dependent review copy`,
    );
  }
});

test('learner-visible Spanish text has no technical identifiers or template clones', () => {
  const fingerprints = new Set();
  for (const item of pilot().questions) {
    const visible = [item.stimulus, ...item.options].join('\n');
    assert.doesNotMatch(visible, TECHNICAL_ID, item.id);
    assert.doesNotMatch(visible, /(?:\b(?:item|question|placeholder|template)\d*\b|\b(?:ítem|pregunta|plantilla)[-_ ]?\d+\b)/iu, item.id);

    const fingerprint = item.stimulus
      .normalize('NFKC')
      .toLocaleLowerCase('es')
      .replace(/\p{N}+/gu, '#')
      .replace(/\s+/g, ' ')
      .trim();
    assert.equal(fingerprints.has(fingerprint), false, `template clone: ${item.id}`);
    fingerprints.add(fingerprint);
  }
});

test('answer positions and upper-band evidence cannot encode shortcuts', () => {
  const questions = pilot().questions;
  const positions = [0, 1, 2, 3].map((index) => questions.filter((item) => item.correctIndex === index).length);
  assert.ok(Math.max(...positions) - Math.min(...positions) <= 1, positions.join(','));

  for (let period = 2; period <= 6; period += 1) {
    const repeats = questions.every((item, index) => item.correctIndex === questions[index % period].correctIndex);
    assert.equal(repeats, false, `stored answers repeat every ${period} items`);
  }

  for (const level of ['C1', 'C2']) {
    const items = questions.filter((item) => item.level === level);
    assert.ok(items.filter((item) => item.upperBandEvidence === true).length >= 2, level);
  }

  for (const item of questions.filter(({ upperBandEvidence }) => upperBandEvidence === true)) {
    assert.match(item.upperBandEvidenceRu, /[\u0400-\u04ff]/u, `${item.id}:upperBandEvidenceRu`);
    assert.ok(item.upperBandEvidenceRu.length >= 60, `${item.id}:upperBandEvidenceRu`);
  }

  for (const item of questions.filter(({ level }) => level === 'C2')) {
    assert.ok(item.stimulus.length >= 120, `${item.id}:C2 stimulus density`);
    assert.ok(Math.min(...item.options.map((option) => option.length)) >= 45, `${item.id}:C2 near-miss density`);
  }
});

test('pilot data is not referenced by runtime or deployment entry points', () => {
  const runtimeFiles = ['package.json', 'firebase.json'];
  const visit = (relativeDir) => {
    const absoluteDir = path.join(ROOT, relativeDir);
    for (const entry of fs.readdirSync(absoluteDir, { withFileTypes: true })) {
      if (['node_modules', 'data', 'coverage'].includes(entry.name)) continue;
      const relativePath = path.join(relativeDir, entry.name);
      if (entry.isDirectory()) visit(relativePath);
      else if (/\.(?:js|mjs|cjs|html|json)$/iu.test(entry.name) && !/\.test\.[cm]?js$/iu.test(entry.name)) {
        runtimeFiles.push(relativePath);
      }
    }
  };
  visit('functions-english-test');
  visit(path.join('knowly-www', 'english-level-test'));

  for (const relativePath of new Set(runtimeFiles)) {
    const source = fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
    assert.doesNotMatch(source, /language-test-pilots|control-set\.json/iu, relativePath);
  }
});
