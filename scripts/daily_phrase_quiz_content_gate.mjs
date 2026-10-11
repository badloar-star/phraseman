import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { evaluateDailyPhraseEnglishBaseline } from './daily_phrase_english_baseline.mjs';
import {
  exactDailyPhraseRowId,
  inspectDailyPhraseRowIds,
  selectExactDailyPhraseRows,
} from './daily_phrase_row_selection.mjs';

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

const CROSS_LOCALE_MARKERS = Object.freeze({
  ru: Object.freeze({
    uniqueLetters: /[іїєґ]/iu,
    words: new Set(['нагоду', 'треба', 'варто', 'йдеться', 'вислів', 'прислів’я', 'прислівʼя', 'завжди', 'кожен', 'кожна', 'спершу']),
  }),
  uk: Object.freeze({
    uniqueLetters: /[ыёэъ]/iu,
    words: new Set(['верно', 'нужно', 'речь', 'выражение', 'пословица', 'всегда', 'каждый', 'каждая', 'любая', 'любой', 'следует']),
  }),
});
const GRAPHEME_SEGMENTER = new Intl.Segmenter('und', { granularity: 'grapheme' });

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

const LEARNER_FACING_QUIZ_KEYS = new Set(['correctFeedback', 'text', 'feedback']);
const DISALLOWED_LEARNER_COPY_BYTES = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFD]/u;

function hasInvalidQuizLearnerCopyEncoding(value, key = '') {
  if (typeof value === 'string') {
    return LEARNER_FACING_QUIZ_KEYS.has(key) && DISALLOWED_LEARNER_COPY_BYTES.test(value);
  }
  if (Array.isArray(value)) {
    return value.some((item) => hasInvalidQuizLearnerCopyEncoding(item));
  }
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value).some(([childKey, childValue]) => (
    hasInvalidQuizLearnerCopyEncoding(childValue, childKey)
  ));
}

function invalidLocalizedLearnerCopy(value, options = {}) {
  const text = String(value ?? '').normalize('NFKC');
  const latinScan = options.allowQuotedLatinI === true ? text.replaceAll('«i»', '') : text;
  return !/\p{Script=Cyrillic}/u.test(text) || /\p{Script=Latin}/u.test(latinScan);
}

function hasCrossLocaleContamination(value, locale) {
  const markers = CROSS_LOCALE_MARKERS[locale];
  if (!markers) return false;
  const text = String(value ?? '').normalize('NFKC');
  if (markers.uniqueLetters.test(text)) return true;
  return normalize(text).split(' ').some((word) => markers.words.has(word));
}

function visibleLength(value) {
  const text = String(value ?? '').normalize('NFKC').replace(/\s+/gu, ' ').trim();
  return [...GRAPHEME_SEGMENTER.segment(text)].length;
}

function hasVisibleLongestCorrectClue(row, config) {
  const distractors = Array.isArray(row?.[config.quizField]?.distractors)
    ? row[config.quizField].distractors
    : [];
  if (distractors.length !== 2) return false;
  const correctLength = visibleLength(row?.[config.meaningField]);
  const longestDistractor = Math.max(...distractors.map((distractor) => visibleLength(distractor?.text)));
  return longestDistractor > 0
    && correctLength - longestDistractor >= 12
    && correctLength / longestDistractor >= 1.25;
}

export function evaluateDailyPhraseQuizContent(rows, options = {}) {
  const list = Array.isArray(rows) ? rows : [];
  const targetRows = Array.isArray(options?.targetRows) ? options.targetRows : list;
  const englishRows = Array.isArray(options?.englishRows) ? options.englishRows : [];
  const issues = [];
  const rowIdInventory = inspectDailyPhraseRowIds(list);

  for (const index of rowIdInventory.invalidIndexes) {
    issues.push(issue('__batch__', 'batch.invalid_row_id_type', `Row ${index + 1} needs an exact nonblank string id`));
  }
  for (const rowId of rowIdInventory.duplicates) {
    issues.push(issue(rowId, 'batch.duplicate_row_id', `Row id ${rowId} occurs more than once`));
  }

  if (list.length === 0) {
    issues.push(issue('__batch__', 'batch.empty', 'At least one Daily Phrase row is required'));
  }

  const targetMeanings = Object.fromEntries(Object.entries(LOCALES).map(([locale, config]) => [
    locale,
    new Map(targetRows.map((row) => [
      normalize(row?.[config.meaningField]),
      exactDailyPhraseRowId(row?.id) ?? '',
    ])),
  ]));
  const englishPool = Object.fromEntries(Object.entries(LOCALES).map(([locale, config]) => [
    locale,
    new Set(englishRows.flatMap((row) => [
      normalize(row?.[config.englishMeaningField]),
      normalize(row?.english),
    ]).filter(Boolean)),
  ]));

  for (const row of list) {
    const rowId = exactDailyPhraseRowId(row?.id) ?? '';
    if (row?.candidateStatus !== 'CANDIDATE_PENDING_INDEPENDENT_REVIEW') {
      issues.push(issue(rowId, 'candidate.not_authored', 'Quiz content is allowed only on an authored candidate row'));
    }

    for (const [locale, config] of Object.entries(LOCALES)) {
      const quiz = row?.[config.quizField];
      const prefix = `${locale}.`;
      const rawCorrect = row?.[config.meaningField];
      if (typeof rawCorrect !== 'string') {
        issues.push(issue(rowId, `${prefix}correct_meaning_type`, `${config.meaningField} must be a string`));
      }
      const correct = typeof rawCorrect === 'string' ? rawCorrect.trim() : '';
      if (!quiz || typeof quiz !== 'object' || Array.isArray(quiz)) {
        issues.push(issue(rowId, `${prefix}quiz_missing`, `${config.quizField} is required`));
        continue;
      }
      if (hasInvalidQuizLearnerCopyEncoding(quiz)) {
        issues.push(issue(rowId, `${prefix}quiz_learner_copy_encoding`, 'Learner-facing quiz text and feedback must not contain replacement characters or disallowed C0 control characters'));
      }

      const correctWords = words(correct).length;
      if (correctWords < 3 || correctWords > 40) {
        issues.push(issue(rowId, `${prefix}correct_meaning_shape`, 'Localized correct meaning must contain 3-40 words'));
      }
      if (invalidLocalizedLearnerCopy(correct)) {
        issues.push(issue(rowId, `${prefix}correct_meaning_script`, 'Localized correct meaning must contain Cyrillic and no Latin-script letters'));
      }
      if (hasCrossLocaleContamination(correct, locale)) {
        issues.push(issue(rowId, `${prefix}correct_meaning_locale_contamination`, 'Localized correct meaning contains high-signal text from the other Cyrillic locale'));
      }

      if (typeof quiz.correctFeedback !== 'string') {
        issues.push(issue(rowId, `${prefix}correct_feedback_type`, 'correctFeedback must be a string'));
      }
      const correctFeedback = typeof quiz.correctFeedback === 'string' ? quiz.correctFeedback.trim() : '';
      const correctFeedbackWords = words(correctFeedback).length;
      if (correctFeedbackWords < 6 || correctFeedbackWords > 40) {
        issues.push(issue(rowId, `${prefix}correct_feedback_shape`, 'correctFeedback must contain 6-40 words'));
      }
      if (invalidLocalizedLearnerCopy(correctFeedback)) {
        issues.push(issue(rowId, `${prefix}correct_feedback_script`, 'Localized correctFeedback must contain Cyrillic and no Latin-script letters'));
      }
      if (hasCrossLocaleContamination(correctFeedback, locale)) {
        issues.push(issue(rowId, `${prefix}correct_feedback_locale_contamination`, 'Localized correctFeedback contains high-signal text from the other Cyrillic locale'));
      }

      const distractors = Array.isArray(quiz.distractors) ? quiz.distractors : [];
      if (distractors.length !== 2) {
        issues.push(issue(rowId, `${prefix}distractor_count`, 'Exactly two authored diagnostic distractors are required'));
      }

      const answerKeys = [normalize(correct)];
      const answerWordCounts = [correctWords];
      const ids = new Set();
      const misconceptionCodes = new Set();

      for (const distractor of distractors) {
        if (typeof distractor?.id !== 'string') {
          issues.push(issue(rowId, `${prefix}distractor_id_type`, 'Distractor id must be a string'));
        }
        if (typeof distractor?.text !== 'string') {
          issues.push(issue(rowId, `${prefix}distractor_text_type`, 'Distractor text must be a string'));
        }
        if (typeof distractor?.misconceptionCode !== 'string') {
          issues.push(issue(rowId, `${prefix}misconception_code_type`, 'misconceptionCode must be a string'));
        }
        if (typeof distractor?.feedback !== 'string') {
          issues.push(issue(rowId, `${prefix}distractor_feedback_type`, 'Distractor feedback must be a string'));
        }
        const id = typeof distractor?.id === 'string' ? distractor.id : '';
        const text = typeof distractor?.text === 'string' ? distractor.text.trim() : '';
        const textKey = normalize(text);
        const code = typeof distractor?.misconceptionCode === 'string'
          ? distractor.misconceptionCode
          : '';
        const feedback = typeof distractor?.feedback === 'string' ? distractor.feedback.trim() : '';

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
        if (invalidLocalizedLearnerCopy(text, { allowQuotedLatinI: code === 'literal_reading' })) {
          issues.push(issue(rowId, `${prefix}distractor_text_script`, 'Localized distractor text must contain Cyrillic and no Latin-script letters'));
        }
        if (hasCrossLocaleContamination(text, locale)) {
          issues.push(issue(rowId, `${prefix}distractor_text_locale_contamination`, 'Localized distractor text contains high-signal text from the other Cyrillic locale'));
        }
        answerWordCounts.push(textWords);

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
        if (hasCrossLocaleContamination(feedback, locale)) {
          issues.push(issue(rowId, `${prefix}distractor_feedback_locale_contamination`, 'Localized distractor feedback contains high-signal text from the other Cyrillic locale'));
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
      if (distractors.length === 2) {
        const distractorWordCounts = answerWordCounts.slice(1);
        const shortestDistractor = Math.min(...distractorWordCounts);
        const longestDistractor = Math.max(...distractorWordCounts);
        if (correctWords - longestDistractor > 6 || shortestDistractor - correctWords > 6) {
          issues.push(issue(rowId, `${prefix}answer_length_clue`, 'Correct answer and distractors must not reveal the answer through a visible word-count gap'));
        }
      }
    }

    const ruDistractors = Array.isArray(row?.quiz_ru?.distractors) ? row.quiz_ru.distractors : [];
    const ukDistractors = Array.isArray(row?.quiz_uk?.distractors) ? row.quiz_uk.distractors : [];
    if (ruDistractors.length === 2 && ukDistractors.length === 2) {
      const ruById = new Map(ruDistractors.map((distractor) => [
        typeof distractor?.id === 'string' ? distractor.id : '',
        distractor,
      ]));
      const ukById = new Map(ukDistractors.map((distractor) => [
        typeof distractor?.id === 'string' ? distractor.id : '',
        distractor,
      ]));
      const ruIds = [...ruById.keys()].sort();
      const ukIds = [...ukById.keys()].sort();
      if (JSON.stringify(ruIds) !== JSON.stringify(ukIds)) {
        issues.push(issue(rowId, 'locale.distractor_id_mismatch', 'Russian and Ukrainian quizzes must localize the same stable distractor ids'));
      } else {
        for (const id of ruIds) {
          const ruRawCode = ruById.get(id)?.misconceptionCode;
          const ukRawCode = ukById.get(id)?.misconceptionCode;
          const ruCode = typeof ruRawCode === 'string' ? ruRawCode : '';
          const ukCode = typeof ukRawCode === 'string' ? ukRawCode : '';
          if (ruCode !== ukCode) {
            issues.push(issue(rowId, 'locale.misconception_code_mismatch', `Distractor ${id} must use the same misconceptionCode in Russian and Ukrainian`));
          }
        }
      }
    }
  }

  // Authoring packets are intentionally small. Catch a repeated visual shortcut
  // across the packet without retroactively changing the contract for full-bank
  // audits whose historical rows were accepted under earlier balancing rules.
  const scanCompletePrefix = options?.enforceRepeatedLongestAcrossAll === true;
  if (list.length >= 3 && (scanCompletePrefix || list.length <= 10)) {
    for (const [locale, config] of Object.entries(LOCALES)) {
      let run = [];
      for (const row of list) {
        if (hasVisibleLongestCorrectClue(row, config)) {
          run.push(exactDailyPhraseRowId(row?.id) ?? '__unknown__');
          if (run.length === 3) {
            issues.push(issue(
              run[0],
              `${locale}.repeated_longest_correct`,
              `Correct answer is visibly longest in three consecutive authored rows: ${run.join(', ')}`,
            ));
            break;
          }
        } else {
          run = [];
        }
      }
    }
  }

  return {
    contractVersion: DAILY_PHRASE_QUIZ_CONTRACT_VERSION,
    verdict: issues.length === 0 ? 'PASS' : 'HOLD',
    checkedRows: list.map((row) => exactDailyPhraseRowId(row?.id) ?? '__unknown__'),
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
  if (!bankPath || !englishPath) {
    console.error('Usage: node scripts/daily_phrase_quiz_content_gate.mjs <bank.json> <english-baseline.json> [--ids id1,id2]. A canonical English baseline is required.');
    process.exitCode = 2;
    return;
  }
  const bank = readJson(bankPath);
  const allRows = Array.isArray(bank) ? bank : bank.rows;
  const rows = selectExactDailyPhraseRows(allRows, ids);
  const baseline = evaluateDailyPhraseEnglishBaseline(
    readJson(englishPath),
    { requireCanonical: true },
  );
  const evaluated = evaluateDailyPhraseQuizContent(rows, {
    targetRows: allRows,
    englishRows: baseline.rows,
  });
  const issues = [...baseline.issues, ...evaluated.issues];
  const result = { ...evaluated, verdict: issues.length ? 'HOLD' : 'PASS', issues };
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.verdict === 'PASS' ? 0 : 1;
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectRun) runCli();
