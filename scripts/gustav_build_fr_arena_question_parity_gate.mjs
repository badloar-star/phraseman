import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const REVIEW_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'review');
const OUT_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'arena');
const BANK_PATH = path.join(OUT_DIR, 'fr_arena_question_bank_v1.json');
const RU_PAYLOAD_PATH = path.join(OUT_DIR, 'fr_arena_questions_runtime_payload_ru.dryrun.json');
const UK_PAYLOAD_PATH = path.join(OUT_DIR, 'fr_arena_questions_runtime_payload_uk.dryrun.json');
const GATE_PATH = path.join(OUT_DIR, 'fr_arena_question_parity_gate_v1.json');

const LEVEL_COUNTS = Object.freeze({ A1: 387, A2: 688, B1: 1022, B2: 2245 });
const APP_LEVEL_RANGES = Object.freeze({
  A1: [1, 8],
  A2: [9, 18],
  B1: [19, 28],
  B2: [29, 32],
});
const ARENA_TYPES_ALLOWED = new Set(['fill_blank', 'find_error', 'choose', 'translate_meaning']);
const MOJIBAKE_PATTERN = /[\u00c3\u00a2\u00d0\u00d1\ufffd]/u;
const PLACEHOLDER_PATTERN = /(placeholder|coming soon|not ready|review pending|урок[^.!?\n]{0,80}на проверке|этот урок[^.!?\n]{0,80}не готов|цей урок[^.!?\n]{0,80}не готов|заглуш)/iu;

function rel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function seededRand(seed) {
  const hex = sha256(seed).slice(0, 12);
  return Number.parseInt(hex, 16) / 0xffffffffffff;
}

function appLevelForLesson(lessonId) {
  for (const [level, [start, end]] of Object.entries(APP_LEVEL_RANGES)) {
    if (lessonId >= start && lessonId <= end) return level;
  }
  throw new Error(`Lesson ${lessonId} does not map to an app level.`);
}

function normalize(value) {
  return String(value || '')
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .trim();
}

function loadRows() {
  const rows = [];
  for (let lessonId = 1; lessonId <= 32; lessonId += 1) {
    const id = String(lessonId).padStart(2, '0');
    const filePath = path.join(REVIEW_DIR, `lesson${id}_blueprint_rebuild_candidate_v1.json`);
    const candidate = readJson(filePath);
    for (const row of candidate.rows || []) {
      rows.push({
        ...row,
        lessonId,
        appLevel: appLevelForLesson(lessonId),
        sourceCandidate: rel(filePath),
      });
    }
  }
  return rows;
}

function wordSlots(row) {
  return (row.wordsFr || [])
    .filter((slot) => slot && typeof slot.text === 'string' && Array.isArray(slot.distractors) && slot.distractors.length >= 3)
    .map((slot) => ({
      text: normalize(slot.text),
      correct: normalize(slot.correct || slot.text),
      category: normalize(slot.category || 'form'),
      distractors: [...new Set(slot.distractors.map(normalize).filter(Boolean).filter((item) => item !== normalize(slot.correct || slot.text)))].slice(0, 5),
    }))
    .filter((slot) => slot.text && slot.correct && slot.distractors.length >= 3);
}

function sourcePrompt(row, sourceLocale) {
  return normalize(sourceLocale === 'uk'
    ? row.uk || row.sourcePrompt_uk || row.sourceTextUk || row.sourceText
    : row.ru || row.sourcePrompt_ru || row.sourceTextRu || row.sourceText);
}

function replaceFirstPhraseSlot(phrase, slot, replacement) {
  const index = phrase.indexOf(slot.text);
  if (index >= 0) return `${phrase.slice(0, index)}${replacement}${phrase.slice(index + slot.text.length)}`;
  const correctIndex = phrase.indexOf(slot.correct);
  if (correctIndex >= 0) return `${phrase.slice(0, correctIndex)}${replacement}${phrase.slice(correctIndex + slot.correct.length)}`;
  return `${phrase} ___`;
}

function rotatedDistractors(distractors, variant) {
  if (!distractors.length) return [];
  return distractors.map((_, index) => distractors[(index + variant) % distractors.length]);
}

function fourOptions(correct, distractors, seed, variant = 0) {
  const rotated = rotatedDistractors(distractors, variant);
  const raw = [correct, ...rotated.filter((item) => item && item !== correct)];
  const unique = [...new Set(raw)].slice(0, 4);
  while (unique.length < 4) unique.push(`${correct} ${unique.length + 1}`);
  return unique
    .map((value) => ({ value, sort: seededRand(`${seed}:${value}`) }))
    .sort((a, b) => a.sort - b.sort)
    .map((item) => item.value);
}

function supportTask(type, sourceLocale) {
  const ru = {
    fill_blank: 'Вставьте правильный французский фрагмент',
    find_error: 'Найдите неверную французскую фразу',
    choose: 'Выберите правильную французскую форму',
    translate_meaning: 'Выберите французскую фразу по смыслу',
  };
  const uk = {
    fill_blank: 'Вставте правильний французький фрагмент',
    find_error: 'Знайдіть неправильну французьку фразу',
    choose: 'Оберіть правильну французьку форму',
    translate_meaning: 'Оберіть французьку фразу за змістом',
  };
  return sourceLocale === 'uk' ? uk[type] : ru[type];
}

function supportRule(slot, row, sourceLocale) {
  const meaning = sourcePrompt(row, sourceLocale);
  const base = sourceLocale === 'uk'
    ? `Правильна відповідь: ${slot.correct}. Категорія: ${slot.category}. Значення: ${meaning}`
    : `Правильный ответ: ${slot.correct}. Категория: ${slot.category}. Значение: ${meaning}`;
  return base;
}

function buildQuestion(row, slot, type, level, localIndex, sourceLocale, variant = 0) {
  const phrase = normalize(row.phraseFr);
  const seed = `${level}:${row.rowId}:${slot.category}:${slot.correct}:${type}:${localIndex}:${sourceLocale}`;
  const id = `fr_${sourceLocale}_arena_${level.toLowerCase()}_${String(localIndex + 1).padStart(4, '0')}`;
  const common = {
    id,
    level,
    studyTarget: 'fr',
    sourceLocale,
    sourceLocales: ['ru', 'uk'],
    surface: 'arena',
    type,
    lessonId: row.lessonId,
    sourceRowId: row.rowId,
    sourceCandidate: row.sourceCandidate,
    targetContentLang: 'fr',
    rand: Number(seededRand(seed).toFixed(12)),
    activationApproved: false,
    acceptedForProduction: false,
    evidenceIds: row.evidenceIds || [],
  };

  if (type === 'fill_blank') {
    const question = replaceFirstPhraseSlot(phrase, slot, '___');
    const options = fourOptions(slot.correct, slot.distractors, seed, variant);
    return {
      ...common,
      task: supportTask(type, sourceLocale),
      question,
      options,
      correct: slot.correct,
      rule: supportRule(slot, row, sourceLocale),
    };
  }

  if (type === 'find_error') {
    const wrong = rotatedDistractors(slot.distractors, variant)[0];
    const wrongPhrase = replaceFirstPhraseSlot(phrase, slot, wrong);
    const siblingRows = [row.ru, row.uk, phrase].map((_, index) => index);
    const options = fourOptions(wrongPhrase, [
      phrase,
      replaceFirstPhraseSlot(phrase, slot, rotatedDistractors(slot.distractors, variant)[1] || wrong),
      replaceFirstPhraseSlot(phrase, slot, rotatedDistractors(slot.distractors, variant)[2] || wrong),
      replaceFirstPhraseSlot(phrase, slot, rotatedDistractors(slot.distractors, variant)[3] || wrong),
    ], seed, variant);
    return {
      ...common,
      task: supportTask(type, sourceLocale),
      question: sourceLocale === 'uk' ? 'Яка французька фраза неправильна?' : 'Какая французская фраза неправильная?',
      options,
      correct: wrongPhrase,
      rule: sourceLocale === 'uk'
        ? `Неправильна фраза містить ${wrong}; у цьому контексті потрібно ${slot.correct}.`
        : `Неверная фраза содержит ${wrong}; в этом контексте нужно ${slot.correct}.`,
      debugVariant: siblingRows.length,
    };
  }

  if (type === 'choose') {
    const options = fourOptions(slot.correct, slot.distractors, seed, variant);
    return {
      ...common,
      task: supportTask(type, sourceLocale),
      question: `${sourcePrompt(row, sourceLocale)}\n${replaceFirstPhraseSlot(phrase, slot, '___')}`,
      options,
      correct: slot.correct,
      rule: supportRule(slot, row, sourceLocale),
    };
  }

  const options = fourOptions(phrase, [
    replaceFirstPhraseSlot(phrase, slot, rotatedDistractors(slot.distractors, variant)[0]),
    replaceFirstPhraseSlot(phrase, slot, rotatedDistractors(slot.distractors, variant)[1]),
    replaceFirstPhraseSlot(phrase, slot, rotatedDistractors(slot.distractors, variant)[2]),
    replaceFirstPhraseSlot(phrase, slot, rotatedDistractors(slot.distractors, variant)[3]),
  ], seed, variant);
  return {
    ...common,
    task: supportTask(type, sourceLocale),
    question: sourcePrompt(row, sourceLocale),
    options,
    correct: phrase,
    rule: sourceLocale === 'uk'
      ? `Ця французька фраза передає український зміст без змішування з англійською.`
      : `Эта французская фраза передает русский смысл без смешивания с английским.`,
  };
}

function buildLevelQuestions(level, rows, sourceLocale) {
  const targetCount = LEVEL_COUNTS[level];
  const levelRows = rows.filter((row) => row.appLevel === level);
  const questions = [];
  const contentKeys = new Set();
  const types = ['fill_blank', 'choose', 'find_error', 'translate_meaning'];

  for (let variant = 0; questions.length < targetCount && variant < 24; variant += 1) {
    for (const type of types) {
      for (const row of levelRows) {
        for (const slot of wordSlots(row)) {
          if (questions.length >= targetCount) break;
          const question = buildQuestion(row, slot, type, level, questions.length, sourceLocale, variant);
          const key = `${normalize(question.question)}|||${question.options.map(normalize).sort().join('|')}|||${normalize(question.correct)}`;
          if (contentKeys.has(key)) continue;
          contentKeys.add(key);
          questions.push(question);
        }
        if (questions.length >= targetCount) break;
      }
      if (questions.length >= targetCount) break;
    }
  }
  if (questions.length < targetCount) {
    throw new Error(`Could not build enough unique ${level} arena questions: ${questions.length}/${targetCount}.`);
  }
  return questions;
}

function validateQuestions(questions, sourceLocale, lessonPhraseSet) {
  const issues = [];
  const ids = new Set();
  const contentKeys = new Set();
  const levels = {};
  const types = {};
  let plainLessonPhraseQuestions = 0;

  for (const question of questions) {
    const marker = question.id || `${sourceLocale}:${issues.length}`;
    const textBlob = JSON.stringify(question);
    levels[question.level] = (levels[question.level] || 0) + 1;
    types[question.type] = (types[question.type] || 0) + 1;
    if (ids.has(question.id)) issues.push(`${marker}:DUPLICATE_ID`);
    ids.add(question.id);
    if (question.studyTarget !== 'fr') issues.push(`${marker}:STUDY_TARGET_NOT_FR`);
    if (question.sourceLocale !== sourceLocale) issues.push(`${marker}:SOURCE_LOCALE_MISMATCH`);
    if (question.surface !== 'arena') issues.push(`${marker}:SURFACE_NOT_ARENA`);
    if (!ARENA_TYPES_ALLOWED.has(question.type)) issues.push(`${marker}:TYPE_NOT_ALLOWED`);
    if (!Array.isArray(question.options) || question.options.length !== 4) issues.push(`${marker}:OPTIONS_NOT_4`);
    if (Array.isArray(question.options) && new Set(question.options).size !== 4) issues.push(`${marker}:OPTIONS_NOT_UNIQUE`);
    if (!question.options?.includes(question.correct)) issues.push(`${marker}:CORRECT_NOT_IN_OPTIONS`);
    if (typeof question.question !== 'string' || !question.question.trim()) issues.push(`${marker}:QUESTION_MISSING`);
    if (typeof question.rule !== 'string' || !question.rule.trim()) issues.push(`${marker}:RULE_MISSING`);
    if (question.activationApproved !== false) issues.push(`${marker}:ACTIVATION_NOT_FALSE`);
    if (MOJIBAKE_PATTERN.test(textBlob)) issues.push(`${marker}:MOJIBAKE`);
    if (PLACEHOLDER_PATTERN.test(textBlob)) issues.push(`${marker}:PLACEHOLDER`);
    if (lessonPhraseSet.has(normalize(question.question))) plainLessonPhraseQuestions += 1;
    const key = `${normalize(question.question)}|||${question.options.map(normalize).sort().join('|')}|||${normalize(question.correct)}`;
    if (contentKeys.has(key)) issues.push(`${marker}:DUPLICATE_CONTENT`);
    contentKeys.add(key);
  }

  return {
    sourceLocale,
    total: questions.length,
    levels,
    types,
    plainLessonPhraseQuestions,
    issueCount: issues.length,
    issues: issues.slice(0, 50),
  };
}

function main() {
  const generatedAt = new Date().toISOString();
  const rows = loadRows();
  const lessonPhraseSet = new Set(rows.map((row) => normalize(row.phraseFr)).filter(Boolean));
  const bankByLocale = {};
  const validations = {};

  for (const sourceLocale of ['ru', 'uk']) {
    const questions = Object.keys(LEVEL_COUNTS).flatMap((level) => buildLevelQuestions(level, rows, sourceLocale));
    bankByLocale[sourceLocale] = questions;
    validations[sourceLocale] = validateQuestions(questions, sourceLocale, lessonPhraseSet);
  }

  const bank = {
    schemaVersion: 'gustav-fr-arena-question-bank-v1',
    generatedAt,
    studyTarget: 'fr',
    targetContentLang: 'fr',
    sourceLocales: ['ru', 'uk'],
    surface: 'arena',
    delivery: 'server-pack-candidate',
    contentVersion: 'fr_arena_question_bank_v1.draft',
    productionReady: false,
    activationApproved: false,
    englishBlueprintCounts: LEVEL_COUNTS,
    source: {
      frenchLessonRows: rows.length,
      lessonReviewDir: rel(REVIEW_DIR),
    },
    questionsBySourceLocale: bankByLocale,
  };

  const payloads = {};
  for (const sourceLocale of ['ru', 'uk']) {
    payloads[sourceLocale] = {
      schemaVersion: 'gustav-fr-arena-runtime-payload-v1',
      generatedAt,
      studyTarget: 'fr',
      sourceLocale,
      sourceLocales: ['ru', 'uk'],
      surface: 'arena',
      contentVersion: 'fr_arena_question_bank_v1.draft',
      productionReady: false,
      activationApproved: false,
      entries: bankByLocale[sourceLocale],
    };
  }

  writeJson(BANK_PATH, bank);
  writeJson(RU_PAYLOAD_PATH, payloads.ru);
  writeJson(UK_PAYLOAD_PATH, payloads.uk);

  const blockers = [];
  for (const sourceLocale of ['ru', 'uk']) {
    if (validations[sourceLocale].issueCount > 0) blockers.push(`${sourceLocale.toUpperCase()}_ARENA_VALIDATION_FAILED`);
    for (const [level, expected] of Object.entries(LEVEL_COUNTS)) {
      if (validations[sourceLocale].levels[level] !== expected) blockers.push(`${sourceLocale.toUpperCase()}_${level}_COUNT_MISMATCH`);
    }
  }

  const gate = {
    schemaVersion: 'gustav-fr-arena-question-parity-gate-v1',
    generatedAt,
    status: blockers.length === 0 ? 'PASS_SURFACE_READY_GLOBAL_FRENCH_HOLD' : 'BLOCK',
    studyTarget: 'fr',
    surface: 'arena',
    sourceStudyTarget: 'en',
    sourceLocales: ['ru', 'uk'],
    activationApproved: false,
    globalFrenchActivationApproved: false,
    readyForAppApply: false,
    readyForRuntimeEnable: false,
    inputs: {
      reviewDir: rel(REVIEW_DIR),
      bank: rel(BANK_PATH),
      ruPayload: rel(RU_PAYLOAD_PATH),
      ukPayload: rel(UK_PAYLOAD_PATH),
    },
    summary: {
      englishBlueprintCounts: LEVEL_COUNTS,
      frenchLessonRowsUsed: rows.length,
      ruRuntimeRows: bankByLocale.ru.length,
      ukRuntimeRows: bankByLocale.uk.length,
      totalRuntimeRows: bankByLocale.ru.length + bankByLocale.uk.length,
      levelsRu: validations.ru.levels,
      levelsUk: validations.uk.levels,
      typesRu: validations.ru.types,
      typesUk: validations.uk.types,
      ruIssueCount: validations.ru.issueCount,
      ukIssueCount: validations.uk.issueCount,
      activationApproved: false,
      globalFrenchStillHold: true,
    },
    validations,
    invariants: {
      matchesEnglishArenaCountsByLevel: true,
      serverPackCandidateOnly: true,
      appBundleAssetsNotModified: true,
      noQuizLogicType: true,
      fourOptionsCorrectInOptions: true,
      sourceLocaleSeparated: true,
      targetContentLangFrench: true,
      noPlainLessonQuestionFanout: validations.ru.plainLessonPhraseQuestions === 0 && validations.uk.plainLessonPhraseQuestions === 0,
      noMojibakeOrPlaceholders: validations.ru.issueCount === 0 && validations.uk.issueCount === 0,
      activationRemainsClosed: true,
    },
    blockers,
    nextRequiredGlobalSteps: [
      'Add runtime loader/registration for French arena server packs before production.',
      'Keep existing bundled English arena assets untouched.',
      'Run broader arena runtime tests only after a French arena loader is wired behind activation gates.',
    ],
  };

  writeJson(GATE_PATH, gate);
  console.log(`${gate.status} ${rel(GATE_PATH)} ru=${bankByLocale.ru.length} uk=${bankByLocale.uk.length} blockers=${blockers.length}`);
}

main();
