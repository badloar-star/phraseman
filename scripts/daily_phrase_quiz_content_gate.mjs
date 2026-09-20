import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const DAILY_PHRASE_QUIZ_CONTRACT_VERSION = 'daily-phrase-diagnostic-quiz-v1';

const LOCALES = Object.freeze({
  ru: { meaningField: 'meaning_ru', quizField: 'quiz_ru', englishMeaningField: 'meaning' },
  uk: { meaningField: 'meaning_uk', quizField: 'quiz_uk', englishMeaningField: 'meaning_uk' },
});

const MISCONCEPTION_CODES = new Set([
  'literal_reading',
  'semantic_neighbor',
  'scope_shift',
  'polarity_reversal',
  'register_misread',
  'cause_effect_swap',
  'overgeneralization',
]);

function words(value) {
  return String(value).match(/[\p{L}\p{N}]+(?:[’'ʼ-][\p{L}\p{N}]+)*/gu) ?? [];
}

function normalize(value) {
  return words(String(value).normalize('NFKC').toLocaleLowerCase('und')).join(' ');
}

function issue(rowId, code, message) {
  return { rowId: rowId || '__unknown__', code, message };
}

function genericFeedback(value, locale) {
  const normalized = normalize(value);
  const generic = locale === 'uk'
    ? /^(?:неправильно|не зовсім|спробуй ще|помилка)(?:\s|$)/u
    : /^(?:неверно|не совсем|попробуй ещё|ошибка)(?:\s|$)/u;
  return words(value).length < 8 || generic.test(normalized);
}

function invalidLocalizedLearnerCopy(value) {
  const text = String(value ?? '').normalize('NFKC');
  return !/\p{Script=Cyrillic}/u.test(text) || /\p{Script=Latin}/u.test(text);
}

export function evaluateDailyPhraseQuizContent(rows, options = {}) {
  const list = Array.isArray(rows) ? rows : [];
  const targetRows = Array.isArray(options?.targetRows) ? options.targetRows : list;
  const englishRows = Array.isArray(options?.englishRows) ? options.englishRows : [];
  const issues = [];

  if (list.length === 0) {
    issues.push(issue('__batch__', 'batch.empty', 'At least one Daily Phrase row is required'));
  }

  const targetMeanings = Object.fromEntries(Object.entries(LOCALES).map(([locale, config]) => [
    locale,
    new Map(targetRows.map((row) => [normalize(row?.[config.meaningField]), String(row?.id ?? '')])),
  ]));
  const englishPool = Object.fromEntries(Object.entries(LOCALES).map(([locale, config]) => [
    locale,
    new Set(englishRows.flatMap((row) => [
      normalize(row?.[config.englishMeaningField]),
      normalize(row?.english),
    ]).filter(Boolean)),
  ]));

  for (const row of list) {
    const rowId = String(row?.id ?? '');
    if (row?.candidateStatus !== 'CANDIDATE_PENDING_INDEPENDENT_REVIEW') {
      issues.push(issue(rowId, 'candidate.not_authored', 'Quiz content is allowed only on an authored candidate row'));
    }

    for (const [locale, config] of Object.entries(LOCALES)) {
      const quiz = row?.[config.quizField];
      const correct = String(row?.[config.meaningField] ?? '').trim();
      const prefix = `${locale}.`;
      if (!quiz || typeof quiz !== 'object' || Array.isArray(quiz)) {
        issues.push(issue(rowId, `${prefix}quiz_missing`, `${config.quizField} is required`));
        continue;
      }

      const correctWords = words(correct).length;
      if (correctWords < 3 || correctWords > 40) {
        issues.push(issue(rowId, `${prefix}correct_meaning_shape`, 'Localized correct meaning must contain 3-40 words'));
      }
      if (invalidLocalizedLearnerCopy(correct)) {
        issues.push(issue(rowId, `${prefix}correct_meaning_script`, 'Localized correct meaning must contain Cyrillic and no Latin-script letters'));
      }

      const correctFeedback = String(quiz.correctFeedback ?? '').trim();
      const correctFeedbackWords = words(correctFeedback).length;
      if (correctFeedbackWords < 6 || correctFeedbackWords > 40) {
        issues.push(issue(rowId, `${prefix}correct_feedback_shape`, 'correctFeedback must contain 6-40 words'));
      }
      if (invalidLocalizedLearnerCopy(correctFeedback)) {
        issues.push(issue(rowId, `${prefix}correct_feedback_script`, 'Localized correctFeedback must contain Cyrillic and no Latin-script letters'));
      }

      const distractors = Array.isArray(quiz.distractors) ? quiz.distractors : [];
      if (distractors.length !== 2) {
        issues.push(issue(rowId, `${prefix}distractor_count`, 'Exactly two authored diagnostic distractors are required'));
      }

      const answerKeys = [normalize(correct)];
      const ids = new Set();
      const misconceptionCodes = new Set();

      for (const distractor of distractors) {
        const id = String(distractor?.id ?? '').trim();
        const text = String(distractor?.text ?? '').trim();
        const textKey = normalize(text);
        const code = String(distractor?.misconceptionCode ?? '').trim();
        const feedback = String(distractor?.feedback ?? '').trim();

        if (!/^[a-z0-9][a-z0-9_-]*$/u.test(id)) {
          issues.push(issue(rowId, `${prefix}invalid_distractor_id`, 'Distractor id must be a stable lowercase token'));
        } else if (ids.has(id)) {
          issues.push(issue(rowId, `${prefix}duplicate_distractor_id`, `Duplicate distractor id: ${id}`));
        }
        ids.add(id);

        const textWords = words(text).length;
        if (textWords < 3 || textWords > 24) {
          issues.push(issue(rowId, `${prefix}distractor_text_shape`, 'Distractor text must contain 3-24 words'));
        }
        if (invalidLocalizedLearnerCopy(text)) {
          issues.push(issue(rowId, `${prefix}distractor_text_script`, 'Localized distractor text must contain Cyrillic and no Latin-script letters'));
        }

        if (!MISCONCEPTION_CODES.has(code)) {
          issues.push(issue(rowId, `${prefix}invalid_misconception_code`, `Unsupported misconceptionCode: ${code}`));
        }
        misconceptionCodes.add(code);

        if (genericFeedback(feedback, locale) || words(feedback).length > 55) {
          issues.push(issue(rowId, `${prefix}feedback_not_diagnostic`, 'Feedback must explain the plausible misconception and the exact semantic difference'));
        }
        if (invalidLocalizedLearnerCopy(feedback)) {
          issues.push(issue(rowId, `${prefix}distractor_feedback_script`, 'Localized distractor feedback must contain Cyrillic and no Latin-script letters'));
        }

        if (answerKeys.includes(textKey)) {
          issues.push(issue(rowId, `${prefix}answer_not_distinct`, 'Correct answer and both distractors must be distinct after Unicode normalization'));
        }
        answerKeys.push(textKey);

        const copiedTargetRowId = targetMeanings[locale].get(textKey);
        if (copiedTargetRowId && copiedTargetRowId !== rowId) {
          issues.push(issue(rowId, `${prefix}target_pool_copy`, `Distractor copies meaning from ${copiedTargetRowId}`));
        }
        if (englishPool[locale].has(textKey)) {
          issues.push(issue(rowId, `${prefix}english_pool_copy`, 'Distractor copies an English Daily Phrase pool entry'));
        }
      }

      if (misconceptionCodes.size !== distractors.length) {
        issues.push(issue(rowId, `${prefix}misconception_not_distinct`, 'The two distractors must diagnose different misconception types'));
      }
    }
  }

  return {
    contractVersion: DAILY_PHRASE_QUIZ_CONTRACT_VERSION,
    verdict: issues.length === 0 ? 'PASS' : 'HOLD',
    checkedRows: list.map((row) => String(row?.id ?? '__unknown__')),
    issues,
  };
}

export function parseDailyPhraseQuizCliArgs(argv) {
  const [bankPath, ...rest] = argv;
  let englishPath = null;
  let ids = null;
  for (let index = 0; index < rest.length; index += 1) {
    if (rest[index] === '--ids') {
      ids = String(rest[index + 1] ?? '').split(',').map((value) => value.trim()).filter(Boolean);
      index += 1;
    } else if (!String(rest[index]).startsWith('--') && englishPath === null) {
      englishPath = rest[index];
    }
  }
  return { bankPath, englishPath, ids };
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(path.resolve(process.cwd(), filePath), 'utf8'));
}

function runCli() {
  const { bankPath, englishPath, ids } = parseDailyPhraseQuizCliArgs(process.argv.slice(2));
  if (!bankPath) {
    console.error('Usage: node scripts/daily_phrase_quiz_content_gate.mjs <bank.json> [english-baseline.json] [--ids id1,id2]');
    process.exitCode = 2;
    return;
  }
  const bank = readJson(bankPath);
  const allRows = Array.isArray(bank) ? bank : bank.rows;
  const requested = ids ? new Set(ids) : null;
  const rows = requested ? allRows.filter((row) => requested.has(String(row?.id))) : allRows;
  if (requested && rows.length !== requested.size) {
    const found = new Set(rows.map((row) => String(row?.id)));
    const missing = [...requested].filter((id) => !found.has(id));
    throw new Error(`Unknown row ids: ${missing.join(', ')}`);
  }
  const result = evaluateDailyPhraseQuizContent(rows, {
    targetRows: allRows,
    englishRows: englishPath ? readJson(englishPath) : [],
  });
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.verdict === 'PASS' ? 0 : 1;
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectRun) runCli();
