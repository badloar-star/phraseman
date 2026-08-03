const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const LANGUAGES = ['es', 'de', 'it', 'fr'];
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const RANGES = {
  A1: [0.5, 1.2], A2: [1.3, 2.2], B1: [2.3, 3.1],
  B2: [3.2, 3.9], C1: [4.0, 4.7], C2: [4.8, 5.5],
};
const BALANCED_QUOTA = { grammar: 10, vocabulary: 10, reading: 10, pragmatics: 10 };
const UPPER_QUOTA = { grammar: 8, vocabulary: 8, reading: 12, pragmatics: 12 };
const QUOTAS = Object.fromEntries(LANGUAGES.map((language) => [language, {
  A1: language === 'es' ? { grammar: 12, vocabulary: 10, reading: 10, pragmatics: 8 } : BALANCED_QUOTA,
  A2: language === 'es' ? { grammar: 12, vocabulary: 10, reading: 10, pragmatics: 8 } : BALANCED_QUOTA,
  B1: BALANCED_QUOTA,
  B2: BALANCED_QUOTA,
  C1: UPPER_QUOTA,
  C2: UPPER_QUOTA,
}]));
const REQUIRED_FIELDS = [
  'id', 'level', 'difficulty', 'skill', 'format', 'scenario', 'prompt',
  'scenarioRu', 'instructionRu', 'stimulus', 'options', 'correctIndex',
  'explanation', 'explanationRu', 'targetConstruct', 'targetConstructRu',
  'cefrRationale', 'cefrRationaleRu', 'dialect', 'reviewStatus',
  'ambiguityNotes', 'ambiguityNotesRu', 'canDoRu', 'claimBasis',
  'distractorRationalesRu',
];
const ENGLISH_SERVICE_FIELDS = [
  'scenario', 'prompt', 'explanation', 'targetConstruct', 'cefrRationale', 'ambiguityNotes',
];
const RUSSIAN_SERVICE_FIELDS = [
  'scenarioRu', 'instructionRu', 'explanationRu', 'targetConstructRu',
  'cefrRationaleRu', 'ambiguityNotesRu', 'canDoRu',
];
const RESIDUE = /(?:\b(?:expediente|dossier|akte|pratica|archivo|registro|id|ref)[-_ ]?\d{2,}\b|\{\{?[^}\n]+\}?\}|\b(?:item|question|placeholder|template)[-_ ]?\d+\b)/iu;
const MOJIBAKE = /(?:Ã|Â|â€|ï¿½|�)/u;
const STOPWORDS = {
  en: 'the a an and or but if then is are was were be been being of to from for with without on in at by as this that these those it its they their we our you your can could should would must not no before after while when where which who what how',
  es: 'el la los las un una unos unas y o pero si entonces es son fue fueron ser de del a al para por con sin en este esta estos estas eso que se su sus ellos ellas nosotros usted puede podría debe no antes después mientras cuando donde cual quien qué cómo',
  de: 'der die das den dem des ein eine einer einen und oder aber wenn dann ist sind war waren sein von zu zum zur für mit ohne auf in an bei als dieser diese dieses dass es sie ihr wir unser du kann könnte soll muss nicht kein keine vor nach während wann wo welcher wer was wie',
  it: 'il lo la i gli le un uno una e o ma se allora è sono era erano essere di del della a al alla per da con senza su in nel questa questo questi queste che si suo loro noi voi può potrebbe deve non nessun prima dopo mentre quando dove quale chi cosa come',
  fr: 'le la les un une des du de et ou mais si alors est sont était étaient être à au aux pour par avec sans sur dans en ce cette ces que se son leur nous vous peut pourrait doit ne pas aucun avant après pendant quand où quel qui quoi comment',
};
for (const language of Object.keys(STOPWORDS)) {
  STOPWORDS[language] = new Set(STOPWORDS[language].split(' '));
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function bankRoot(language) {
  return path.join(ROOT, 'content', 'language-test-pilots', language, 'candidate-bank');
}

function tokens(text) {
  return String(text)
    .normalize('NFKD')
    .toLocaleLowerCase()
    .replace(/[^a-z\u00c0-\u024f\u1e00-\u1eff]+/gu, ' ')
    .trim()
    .split(/\s+/u)
    .filter(Boolean);
}

function looksPredominantlyEnglish(text, assessedLanguage) {
  const words = tokens(text);
  const englishHits = words.filter((word) => STOPWORDS.en.has(word));
  const assessedHits = words.filter((word) => STOPWORDS[assessedLanguage].has(word));
  return englishHits.length >= 3
    && new Set(englishHits).size >= 3
    && englishHits.length >= assessedHits.length + 2;
}

test('all four source candidate banks remain non-publishable while reviewed release derivatives exist', () => {
  for (const language of LANGUAGES) {
    const manifest = readJson(path.join(bankRoot(language), 'manifest.json'));
    assert.equal(manifest.language, language);
    assert.equal(manifest.status, 'candidate_bank');
    assert.equal(manifest.publishable, false);
    assert.equal(manifest.externalReviewStatus, 'pending');
    assert.deepEqual(manifest.authoredLevels, LEVELS);
    assert.equal(fs.existsSync(path.join(ROOT, 'knowly-www', 'english-level-test', 'data', `questions.${language}.json`)), true);
    assert.equal(fs.existsSync(path.join(ROOT, 'functions-english-test', 'data', `questions.${language}.json`)), true);
  }
});

test('all 960 authored items satisfy the shared English-engine bank contract', () => {
  const globalIds = new Set();
  for (const language of LANGUAGES) {
    const manifest = readJson(path.join(bankRoot(language), 'manifest.json'));
    const languageConstructs = new Set();
    const languageStimuli = new Set();
    for (const level of LEVELS) {
      const bank = readJson(path.join(bankRoot(language), `${level}.json`));
      assert.equal(bank.bankVersion, manifest.bankVersion, `${language}/${level}:bankVersion`);
      assert.equal(bank.language, language, `${language}/${level}:language`);
      assert.equal(bank.level, level, `${language}/${level}:level`);
      assert.equal(bank.publishable, false, `${language}/${level}:publishable`);
      assert.equal(bank.questions.length, 40, `${language}/${level}:count`);
      const positions = [0, 0, 0, 0];
      const skills = new Set();
      const levelMetadata = {
        canDoRu: new Set(),
        cefrRationale: new Set(),
        ambiguityNotes: new Set(),
        explanation: new Set(),
      };
      bank.questions.forEach((item, index) => {
        assert.equal(item.id, `${language}-${level.toLowerCase()}-${String(index + 1).padStart(3, '0')}`);
        assert.equal(globalIds.has(item.id), false, `${item.id}:global duplicate`);
        globalIds.add(item.id);
        assert.ok(item.difficulty >= RANGES[level][0] && item.difficulty <= RANGES[level][1], `${item.id}:difficulty range`);
        if (index > 0) assert.ok(item.difficulty > bank.questions[index - 1].difficulty, `${item.id}:difficulty order`);
        for (const field of REQUIRED_FIELDS) assert.equal(Object.hasOwn(item, field), true, `${item.id}:${field}`);
        assert.equal(item.options.length, 4, item.id);
        assert.equal(new Set(item.options.map((option) => option.normalize('NFKC').trim().toLocaleLowerCase(language))).size, 4, `${item.id}:options`);
        assert.ok(Number.isInteger(item.correctIndex) && item.correctIndex >= 0 && item.correctIndex < 4, item.id);
        positions[item.correctIndex] += 1;
        skills.add(item.skill);
        assert.equal(item.reviewStatus, 'self_checked', item.id);
        assert.equal(item.claimBasis, 'SYNTHESIS', item.id);
        const visible = [item.stimulus, ...item.options].join('\n');
        assert.doesNotMatch(visible, RESIDUE, item.id);
        assert.doesNotMatch(visible, /[\u0400-\u04ff]/u, `${item.id}:target-language text`);
        assert.equal(looksPredominantlyEnglish(item.stimulus, language), false, `${item.id}:English stimulus leak`);
        item.options.forEach((option, optionIndex) => {
          assert.equal(looksPredominantlyEnglish(option, language), false, `${item.id}:English option ${optionIndex} leak`);
        });
        const construct = item.targetConstruct.normalize('NFKC').trim().toLocaleLowerCase();
        assert.equal(languageConstructs.has(construct), false, `${item.id}:duplicate target construct`);
        languageConstructs.add(construct);
        const stimulus = item.stimulus.normalize('NFKC').trim().toLocaleLowerCase(language);
        assert.equal(languageStimuli.has(stimulus), false, `${item.id}:duplicate stimulus`);
        languageStimuli.add(stimulus);
        for (const [field, values] of Object.entries(levelMetadata)) values.add(item[field]);
        const expectedRationaleKeys = [0, 1, 2, 3].filter((optionIndex) => optionIndex !== item.correctIndex).map(String).sort();
        assert.deepEqual(Object.keys(item.distractorRationalesRu).sort(), expectedRationaleKeys, `${item.id}:distractor rationales`);
      });
      assert.deepEqual(positions, [10, 10, 10, 10], `${language}/${level}:answer positions`);
      assert.deepEqual(
        Object.fromEntries([...skills].toSorted().map((skill) => [skill, bank.questions.filter((item) => item.skill === skill).length])),
        Object.fromEntries(Object.entries(QUOTAS[language][level]).toSorted(([left], [right]) => left.localeCompare(right))),
        `${language}/${level}:skill quota`,
      );
      for (const [field, values] of Object.entries(levelMetadata)) {
        assert.equal(values.size, 40, `${language}/${level}:${field}:unique`);
      }
      const increments = bank.questions.slice(1).map((item, index) => Number(
        (item.difficulty - bank.questions[index].difficulty).toFixed(3),
      ));
      const minimumDistinctIncrements = ['B1', 'B2', 'C1', 'C2'].includes(level) ? 8 : 2;
      assert.ok(new Set(increments).size >= minimumDistinctIncrements, `${language}/${level}:non-linear difficulty`);
      for (let period = 2; period <= 10; period += 1) {
        assert.equal(
          bank.questions.every((item, index) => item.correctIndex === bank.questions[index % period].correctIndex),
          false,
          `${language}/${level}:answer-position period ${period}`,
        );
      }
      if (level === 'A1') {
        assert.ok(bank.questions[0].difficulty <= 0.65 && bank.questions[1].difficulty <= 0.65, `${language}:A1 anchors`);
        assert.notEqual(bank.questions[0].skill, bank.questions[1].skill, `${language}:A1 anchor skills`);
      }
    }
  }
  assert.equal(globalIds.size, 960);
});

test('all localized metadata is complete, correctly scripted, and valid UTF-8 text', () => {
  for (const language of LANGUAGES) {
    for (const level of LEVELS) {
      const questions = readJson(path.join(bankRoot(language), `${level}.json`)).questions;
      for (const item of questions) {
        for (const field of ENGLISH_SERVICE_FIELDS) {
          assert.ok(typeof item[field] === 'string' && item[field].trim().length >= 8, `${item.id}:${field}:complete`);
          assert.doesNotMatch(item[field], /[\u0400-\u04ff]/u, `${item.id}:${field}:Russian leak`);
          assert.doesNotMatch(item[field], MOJIBAKE, `${item.id}:${field}:encoding`);
        }
        for (const field of RUSSIAN_SERVICE_FIELDS) {
          assert.ok(typeof item[field] === 'string' && item[field].trim().length >= 8, `${item.id}:${field}:complete`);
          assert.match(item[field], /[\u0400-\u04ff]/u, `${item.id}:${field}:Russian script`);
          assert.doesNotMatch(item[field], MOJIBAKE, `${item.id}:${field}:encoding`);
        }
        for (const text of [item.stimulus, ...item.options]) {
          assert.doesNotMatch(text, MOJIBAKE, `${item.id}:target text encoding`);
          assert.doesNotMatch(text, /[\u0400-\u04ff]/u, `${item.id}:target text Russian leak`);
        }
        for (const rationale of Object.values(item.distractorRationalesRu)) {
          assert.match(rationale, /[\u0400-\u04ff]/u, `${item.id}:distractor rationale Russian script`);
          assert.doesNotMatch(rationale, MOJIBAKE, `${item.id}:distractor rationale encoding`);
        }
      }
    }
  }
});

test('C1 and C2 retain substantial direct evidence for the adaptive engine', () => {
  for (const language of LANGUAGES) {
    for (const level of ['C1', 'C2']) {
      const questions = readJson(path.join(bankRoot(language), `${level}.json`)).questions;
      assert.ok(questions.every((item) => typeof item.upperBandEvidence === 'boolean'), `${language}/${level}:boolean evidence flags`);
      const evidence = questions.filter((item) => item.upperBandEvidence === true);
      assert.ok(evidence.length >= 12, `${language}/${level}:substantial direct evidence`);
      for (const item of evidence) {
        assert.match(item.upperBandEvidenceRu, /[\u0400-\u04ff]/u, `${item.id}:upperBandEvidenceRu`);
        assert.ok(item.upperBandEvidenceRu.length >= 60, `${item.id}:upperBandEvidenceRu detail`);
      }
    }
  }
});

test('upper-level calibration documents match generated difficulty priors', () => {
  for (const language of LANGUAGES) {
    for (const level of ['B2', 'C1', 'C2']) {
      const questions = readJson(path.join(bankRoot(language), `${level}.json`)).questions;
      const lines = fs.readFileSync(
        path.join(bankRoot(language), `${level}-DIFFICULTY-CALIBRATION.md`),
        'utf8',
      ).split(/\r?\n/u);

      if (language === 'es') {
        for (const item of questions) {
          const line = lines.find((candidate) => candidate.startsWith(`| ${item.id} |`));
          assert.ok(line, `${item.id}:calibration row`);
          assert.ok(line.includes(`| ${item.difficulty.toFixed(3)} |`), `${item.id}:calibration score`);
        }
        continue;
      }

      for (let start = 0; start < questions.length; start += 10) {
        const end = start + 9;
        const range = `${questions[start].id}–${String(end + 1).padStart(3, '0')}`;
        const line = lines.find((candidate) => candidate.startsWith(`| ${range} |`));
        assert.ok(line, `${language}/${level}:${range}:calibration row`);
        const scores = `${questions[start].difficulty.toFixed(3)}–${questions[end].difficulty.toFixed(3)}`;
        assert.ok(line.includes(`| ${scores} |`), `${language}/${level}:${range}:calibration scores`);
      }
    }
  }
});

test('all four banks avoid systematic answer-length cues', () => {
  for (const language of LANGUAGES) {
    for (const level of LEVELS) {
      const questions = readJson(path.join(bankRoot(language), `${level}.json`)).questions;
      for (const skill of new Set(questions.map(({ skill }) => skill))) {
        const items = questions.filter((item) => item.skill === skill);
        for (const [extreme, select] of [
          ['longest', Math.max],
          ['shortest', Math.min],
        ]) {
          const uniquelyExtreme = items.filter((item) => {
            const lengths = item.options.map((option) => option.length);
            const correctLength = lengths[item.correctIndex];
            const extremeLength = select(...lengths);
            return correctLength === extremeLength
              && lengths.filter((length) => length === correctLength).length === 1;
          });
          assert.ok(
            uniquelyExtreme.length <= Math.ceil(items.length / 4),
            `${language}/${level}:${skill}:${extreme}-answer cue:${uniquelyExtreme.map(({ id }) => id).join(',')}`,
          );
        }

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
          assert.ok(
            dominantCount <= Math.ceil(items.length * 0.4),
            `${language}/${level}:${skill}:${metric}:dominant length rank ${dominantRank} in ${dominantCount}/${items.length}`,
          );
        }
      }
    }
  }
});
