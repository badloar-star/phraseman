const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const BANK_ROOT = path.join(ROOT, 'content', 'language-test-pilots', 'es', 'candidate-bank');
const MANIFEST_PATH = path.join(BANK_ROOT, 'manifest.json');
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const REQUIRED_AUTHORED_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const REQUIRED_COMPLETED_LEVELS = ['A1', 'A2', 'B1'];
const RANGES = {
  A1: [0.5, 1.2], A2: [1.3, 2.2], B1: [2.3, 3.1],
  B2: [3.2, 3.9], C1: [4.0, 4.7], C2: [4.8, 5.5],
};
const QUOTAS = {
  A1: { grammar: 12, vocabulary: 10, reading: 10, pragmatics: 8 },
  A2: { grammar: 12, vocabulary: 10, reading: 10, pragmatics: 8 },
  B1: { grammar: 10, vocabulary: 10, reading: 10, pragmatics: 10 },
  B2: { grammar: 10, vocabulary: 10, reading: 10, pragmatics: 10 },
  C1: { grammar: 8, vocabulary: 8, reading: 12, pragmatics: 12 },
  C2: { grammar: 8, vocabulary: 8, reading: 12, pragmatics: 12 },
};
const REQUIRED_FIELDS = [
  'id', 'level', 'difficulty', 'skill', 'format', 'scenario', 'prompt', 'scenarioRu',
  'instructionRu', 'stimulus', 'options', 'correctIndex', 'explanation', 'explanationRu',
  'targetConstruct', 'targetConstructRu', 'cefrRationale', 'cefrRationaleRu', 'dialect', 'reviewStatus',
  'ambiguityNotes', 'ambiguityNotesRu', 'canDoRu', 'claimBasis', 'distractorRationalesRu',
];
const RESIDUE = /(?:\b(?:expediente|dossier|akte|pratica|archivo|registro|id|ref)[-_ ]?\d{2,}\b|\{\{?[^}\n]+\}?\}|\b(?:item|question|placeholder|template)\d*\b|\b(?:ítem|pregunta|plantilla)[-_ ]?\d+\b)/iu;
const POSITION_COPY = /(?:\b(?:first|second|third|fourth)\s+(?:option|answer|reply)\b|\b(?:перв(?:ый|ая|ое)|втор(?:ой|ая|ое)|трет(?:ий|ья|ье)|четв[её]рт(?:ый|ая|ое))\s+(?:вариант|ответ)\b)/iu;

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function manifest() {
  assert.equal(fs.existsSync(MANIFEST_PATH), true, 'Spanish candidate-bank manifest must exist');
  return readJson(MANIFEST_PATH);
}

test('candidate source remains non-publishable while its reviewed release derivative exists', () => {
  const data = manifest();
  assert.equal(data.language, 'es');
  assert.equal(data.status, 'candidate_bank');
  assert.equal(data.publishable, false);
  assert.equal(data.externalReviewStatus, 'pending');
  assert.ok(Array.isArray(data.completedLevels));
  assert.deepEqual(data.completedLevels, REQUIRED_COMPLETED_LEVELS);
  assert.deepEqual(data.authoredLevels, REQUIRED_AUTHORED_LEVELS);
  assert.ok(data.completedLevels.every((level) => LEVELS.includes(level)));
  assert.equal(fs.existsSync(path.join(ROOT, 'knowly-www', 'english-level-test', 'data', 'questions.es.json')), true);
  assert.equal(fs.existsSync(path.join(ROOT, 'functions-english-test', 'data', 'questions.es.json')), true);
});

test('each authored Spanish level has 40 ordered items and the declared skill quota', () => {
  for (const level of manifest().authoredLevels) {
    const file = path.join(BANK_ROOT, `${level}.json`);
    assert.equal(fs.existsSync(file), true, `${level} candidate file`);
    const data = readJson(file);
    assert.equal(data.schemaVersion, 3, level);
    assert.equal(data.language, 'es', level);
    assert.equal(data.level, level);
    assert.equal(data.publishable, false);
    assert.equal(data.bankVersion, manifest().bankVersion, `${level}:bankVersion`);
    assert.equal(data.questions.length, 40, level);
    assert.deepEqual(data.questions.map(({ difficulty }) => difficulty), data.questions.map(({ difficulty }) => difficulty).toSorted((a, b) => a - b), `${level}:difficulty order`);
    for (let index = 1; index < data.questions.length; index += 1) {
      assert.ok(data.questions[index].difficulty > data.questions[index - 1].difficulty, `${level}:strict difficulty at ${index}`);
    }
    if (['B1', 'B2', 'C1', 'C2'].includes(level)) {
      const increments = data.questions.slice(1).map((item, index) => Number((item.difficulty - data.questions[index].difficulty).toFixed(3)));
      assert.ok(new Set(increments).size >= 8, `${level}:difficulty must use explicit non-linear expert pre-calibration`);
    }

    const skillCounts = Object.fromEntries(Object.keys(QUOTAS[level]).map((skill) => [skill, data.questions.filter((item) => item.skill === skill).length]));
    assert.deepEqual(skillCounts, QUOTAS[level], `${level}:skill quota`);
    assert.equal(new Set(data.questions.map(({ id }) => id)).size, 40, `${level}:unique IDs`);
    assert.equal(new Set(data.questions.map(({ targetConstruct }) => targetConstruct)).size, 40, `${level}:unique constructs`);
    assert.equal(new Set(data.questions.map(({ canDoRu }) => canDoRu)).size, 40, `${level}:unique can-do statements`);
    assert.equal(new Set(data.questions.map(({ cefrRationale }) => cefrRationale)).size, 40, `${level}:unique CEFR rationales`);
    assert.equal(new Set(data.questions.map(({ ambiguityNotes }) => ambiguityNotes)).size, 40, `${level}:unique ambiguity notes`);
    for (const item of data.questions) {
      assert.doesNotMatch(item.cefrRationale, /^This A1 item checks a basic familiar-context operation:/u, item.id);
      assert.doesNotMatch(item.ambiguityNotes, /^Only “.+” satisfies the stated context and target construct without adding unstated information\.$/u, item.id);
    }
  }
});

test('authored-level items match the runtime field contract without claiming external review', () => {
  for (const level of manifest().authoredLevels) {
    const questions = readJson(path.join(BANK_ROOT, `${level}.json`)).questions;
    questions.forEach((item, index) => {
      assert.equal(item.id, `es-${level.toLowerCase()}-${String(index + 1).padStart(3, '0')}`);
      assert.equal(item.level, level, item.id);
      assert.ok(item.difficulty >= RANGES[level][0] && item.difficulty <= RANGES[level][1], item.id);
      assert.ok(['multiple-choice', 'gap-fill'].includes(item.format), item.id);
      assert.equal(item.dialect, 'standard', item.id);
      assert.equal(item.reviewStatus, 'self_checked', item.id);
      assert.equal(item.claimBasis, 'SYNTHESIS', item.id);
      for (const field of REQUIRED_FIELDS) assert.equal(Object.hasOwn(item, field), true, `${item.id}:${field}`);
      for (const field of ['scenario', 'prompt', 'explanation', 'cefrRationale', 'ambiguityNotes']) {
        assert.equal(typeof item[field], 'string', `${item.id}:${field}`);
        assert.ok(item[field].trim().length >= 12, `${item.id}:${field}`);
        assert.doesNotMatch(item[field], /[\u0400-\u04ff]/u, `${item.id}:${field}:English copy`);
      }
      for (const field of ['scenarioRu', 'instructionRu', 'explanationRu', 'cefrRationaleRu', 'ambiguityNotesRu', 'canDoRu']) {
        assert.match(item[field], /[\u0400-\u04ff]/u, `${item.id}:${field}`);
        assert.ok(item[field].trim().length >= 12, `${item.id}:${field}`);
      }
      assert.match(item.targetConstructRu, /[\u0400-\u04ff]/u, `${item.id}:targetConstructRu`);
      const englishResidue = /\b(?:basic|reading|vocabulary|grammar|familiar|context|operation|interaction|explicit|detail|controlled|construct|target|direct-object|present-tense)\b/iu;
      assert.doesNotMatch(item.targetConstructRu, englishResidue, `${item.id}:targetConstructRu:mixed language`);
      assert.doesNotMatch(item.cefrRationaleRu, englishResidue, `${item.id}:cefrRationaleRu:mixed language`);
    });
  }
});

test('authored-level items have unique natural stimuli and documented distractors', () => {
  const fingerprints = new Set();
  for (const level of manifest().authoredLevels) {
    for (const item of readJson(path.join(BANK_ROOT, `${level}.json`)).questions) {
      assert.equal(item.options.length, 4, item.id);
      assert.equal(new Set(item.options.map((option) => option.normalize('NFKC').trim().toLocaleLowerCase('es'))).size, 4, item.id);
      assert.ok(Number.isInteger(item.correctIndex) && item.correctIndex >= 0 && item.correctIndex < 4, item.id);
      const visible = [item.stimulus, ...item.options].join('\n');
      assert.doesNotMatch(visible, RESIDUE, item.id);
      const fingerprint = item.stimulus.normalize('NFKC').toLocaleLowerCase('es').replace(/\p{N}+/gu, '#').replace(/\s+/gu, ' ').trim();
      assert.equal(fingerprints.has(fingerprint), false, `${item.id}:duplicate stimulus`);
      fingerprints.add(fingerprint);

      const expectedKeys = [0, 1, 2, 3].filter((optionIndex) => optionIndex !== item.correctIndex).map(String).sort();
      assert.deepEqual(Object.keys(item.distractorRationalesRu).sort(), expectedKeys, item.id);
      for (const rationale of Object.values(item.distractorRationalesRu)) {
        assert.match(rationale, /[\u0400-\u04ff]/u, item.id);
        assert.ok(rationale.length >= 24, item.id);
      }
      assert.doesNotMatch([item.explanation, item.explanationRu, item.ambiguityNotes, item.ambiguityNotesRu].join('\n'), POSITION_COPY, item.id);
    }
  }
});

test('each authored level balances stored answers and avoids positional cycles', () => {
  for (const level of manifest().authoredLevels) {
    const questions = readJson(path.join(BANK_ROOT, `${level}.json`)).questions;
    assert.deepEqual([0, 1, 2, 3].map((position) => questions.filter((item) => item.correctIndex === position).length), [10, 10, 10, 10], level);
    for (let period = 2; period <= 10; period += 1) {
      assert.equal(questions.every((item, index) => item.correctIndex === questions[index % period].correctIndex), false, `${level}:period ${period}`);
    }
    for (const skill of Object.keys(QUOTAS[level])) {
      const items = questions.filter((item) => item.skill === skill);
      const uniqueLongestCorrect = items.filter((item) => {
        const lengths = item.options.map((option) => option.length);
        const correctLength = lengths[item.correctIndex];
        return correctLength === Math.max(...lengths) && lengths.filter((length) => length === correctLength).length === 1;
      });
      const uniqueShortestCorrect = items.filter((item) => {
        const lengths = item.options.map((option) => option.length);
        const correctLength = lengths[item.correctIndex];
        return correctLength === Math.min(...lengths) && lengths.filter((length) => length === correctLength).length === 1;
      });
      assert.ok(uniqueLongestCorrect.length <= Math.ceil(items.length / 4), `${level}:${skill}:longest-answer cue:${uniqueLongestCorrect.map(({ id }) => id).join(',')}`);
      assert.ok(uniqueShortestCorrect.length <= Math.ceil(items.length / 4), `${level}:${skill}:shortest-answer cue:${uniqueShortestCorrect.map(({ id }) => id).join(',')}`);
      for (const [metric, measure] of [
        ['characters', (option) => option.length],
        ['words', (option) => option.trim().split(/\s+/u).length],
      ]) {
        const rankCounts = new Map();
        for (const item of items) {
          const lengths = item.options.map(measure);
          const correctLength = lengths[item.correctIndex];
          if (lengths.filter((length) => length === correctLength).length !== 1) continue;
          const rank = 1 + lengths.filter((length) => length < correctLength).length;
          rankCounts.set(rank, (rankCounts.get(rank) ?? 0) + 1);
        }
        const rankedItems = [...rankCounts.values()].reduce((sum, count) => sum + count, 0);
        if (rankedItems < 4) continue;
        const [dominantRank, dominantCount] = [...rankCounts.entries()].toSorted((a, b) => b[1] - a[1])[0];
        assert.ok(dominantCount <= Math.ceil(items.length * 0.4), `${level}:${skill}:${metric}:dominant length rank ${dominantRank} in ${dominantCount}/${items.length}`);
      }
    }
  }
});

test('Spanish candidate answers avoid known regional shortcuts', () => {
  for (const level of manifest().authoredLevels) {
    for (const item of readJson(path.join(BANK_ROOT, `${level}.json`)).questions) {
      const answer = item.options[item.correctIndex].normalize('NFKC').trim().toLocaleLowerCase('es');
      assert.notEqual(answer, 'a correos.', item.id);
      if (item.id === 'es-a2-025') assert.notEqual(answer, 'ingreso', item.id);
    }
  }
});

test('A1 begins with two distinct easy anchors', () => {
  if (!manifest().authoredLevels.includes('A1')) return;
  const questions = readJson(path.join(BANK_ROOT, 'A1.json')).questions;
  const anchors = questions.filter((item) => item.difficulty <= 0.65);
  assert.equal(anchors.length, 2);
  assert.equal(new Set(anchors.map(({ skill }) => skill)).size, 2);
});
