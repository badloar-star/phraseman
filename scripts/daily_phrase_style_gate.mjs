import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { evaluateDailyPhraseTargetSurface } from './daily_phrase_target_surface.mjs';
import {
  exactDailyPhraseRowId,
  inspectDailyPhraseRowIds,
  selectExactDailyPhraseRows,
} from './daily_phrase_row_selection.mjs';

export const APPROVED_STYLE_CONTRACT_VERSION = 'daily-phrase-narrative-style-v1';

const LOCALE_RULES = {
  ru: {
    field: 'text_ru',
    dryPatterns: [
      /так (?:говорят|называют)/iu,
      /эт(?:а|ой|у) (?:фраза|поговорка|идиома|выражение)/iu,
      /например\s*:/iu,
    ],
  },
  uk: {
    field: 'text_uk',
    dryPatterns: [
      /так (?:кажуть|називають)/iu,
      /ц(?:я|ією|ю) (?:фраза|приказка|ідіома|вислів)/iu,
      /наприклад\s*:/iu,
    ],
  },
};

const INTERNAL_ROW_REFERENCE = /\b(?:es|fr|de|it)[_-]?\d{3}\b/iu;

function words(value) {
  return String(value).match(/[\p{L}\p{N}]+(?:[’'ʼ-][\p{L}\p{N}]+)*/gu) ?? [];
}

function sentences(value) {
  return String(value)
    .split(/[.!?…]+(?:[»”"']+)?/u)
    .map((part) => part.trim())
    .filter(Boolean);
}

function sentenceCount(value) {
  return sentences(value).length;
}

function normalizeForMatch(value) {
  return words(String(value).toLocaleLowerCase('und')).join(' ');
}

function issue(rowId, code, message) {
  return { rowId: rowId || '__unknown__', code, message };
}

export function evaluateDailyPhraseRowStyle(row) {
  const exactRowId = exactDailyPhraseRowId(row?.id);
  const rowId = exactRowId ?? '';
  const targetText = String(row?.targetText ?? '').trim();
  const targetNormalized = normalizeForMatch(targetText);
  const issues = [];

  if (!exactRowId) {
    issues.push(issue('__unknown__', 'row.invalid_id_type', 'Row id must be an exact nonblank string'));
  }

  if (!targetNormalized) {
    issues.push(issue(rowId, 'target.missing', 'targetText is required'));
  }

  for (const [locale, rules] of Object.entries(LOCALE_RULES)) {
    const text = String(row?.[rules.field] ?? '').trim();
    const prefix = `${locale}.`;

    if (!text) {
      issues.push(issue(rowId, `${prefix}missing`, `${rules.field} is required`));
      continue;
    }

    if (!text.startsWith('❤️ ')) {
      issues.push(issue(rowId, `${prefix}heart_hook`, `${rules.field} must start with "❤️ "`));
    }

    const wordCount = words(text).length;
    if (wordCount < 50 || wordCount > 70) {
      issues.push(
        issue(rowId, `${prefix}word_count`, `${rules.field} must contain 50-70 words; received ${wordCount}`),
      );
    }

    const count = sentenceCount(text);
    if (count < 4 || count > 7) {
      issues.push(
        issue(rowId, `${prefix}sentence_count`, `${rules.field} must contain 4-7 paced sentences; received ${count}`),
      );
    }

    const targetSurface = evaluateDailyPhraseTargetSurface(row, rules.field);
    if (targetNormalized && targetSurface.status !== 'PASS') {
      const invalidDeclaredSurface = ['invalid_surface', 'declared_surface_missing']
        .includes(targetSurface.status);
      issues.push(
        issue(
          rowId,
          invalidDeclaredSurface ? `${prefix}target_surface_form_invalid` : `${prefix}target_missing`,
          invalidDeclaredSurface
            ? `${rules.field} declares an invalid or absent grammatical target surface form`
            : `${rules.field} must weave targetText or an explicit grammatical surface form into the story`,
        ),
      );
    }

    if (INTERNAL_ROW_REFERENCE.test(text)) {
      issues.push(
        issue(
          rowId,
          `${prefix}internal_row_reference`,
          `${rules.field} must not expose internal row identifiers to learners`,
        ),
      );
    }

    const matchedDryPattern = rules.dryPatterns.find((pattern) => pattern.test(text));
    if (matchedDryPattern) {
      issues.push(
        issue(rowId, `${prefix}dry_formula`, `${rules.field} uses the rejected dictionary-style explanation formula`),
      );
    }

    if (!/[!?—:«»]/u.test(text)) {
      issues.push(
        issue(rowId, `${prefix}flat_rhythm`, `${rules.field} needs natural punctuation and varied narrative rhythm`),
      );
    }

    const textSentences = sentences(text);
    const closing = textSentences.at(-1) ?? '';
    if (words(closing).length < 4) {
      issues.push(
        issue(rowId, `${prefix}weak_closing`, `${rules.field} needs a memorable closing sentence of at least four words`),
      );
    }
  }

  return {
    contractVersion: APPROVED_STYLE_CONTRACT_VERSION,
    rowId,
    verdict: issues.length === 0 ? 'PASS' : 'HOLD',
    issues,
  };
}

function openingKey(text) {
  return words(String(text).replace(/^❤️\s*/u, '').toLocaleLowerCase('und'))
    .slice(0, 4)
    .join(' ');
}

function containsLearnerQuestion(row, field) {
  const text = String(row?.[field] ?? '').toLocaleLowerCase('und');
  const target = String(row?.targetText ?? '').toLocaleLowerCase('und');
  const withoutTarget = target ? text.split(target).join('') : text;
  return withoutTarget.includes('?');
}

function targetSentencePosition(row, field) {
  const result = evaluateDailyPhraseTargetSurface(row, field);
  return result.status === 'PASS' && Number.isInteger(result.startSentenceIndex)
    ? result.startSentenceIndex
    : -1;
}

function dominantValue(values) {
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()].sort((left, right) => right[1] - left[1])[0] ?? [undefined, 0];
}

export function evaluateDailyPhraseBatchStyle(rows) {
  const list = Array.isArray(rows) ? rows : [];
  const rowResults = list.map(evaluateDailyPhraseRowStyle);
  const issues = rowResults.flatMap((result) => result.issues);
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

  for (const locale of Object.keys(LOCALE_RULES)) {
    const field = LOCALE_RULES[locale].field;
    const groups = new Map();

    for (const row of list) {
      const key = openingKey(row?.[field]);
      if (!key) continue;
      const ids = groups.get(key) ?? [];
      ids.push(exactDailyPhraseRowId(row?.id) ?? '__unknown__');
      groups.set(key, ids);
    }

    for (const [key, ids] of groups) {
      if (ids.length > 2) {
        issues.push(
          issue(
            '__batch__',
            'batch.repeated_opening',
            `${locale} opening "${key}" repeats in ${ids.join(', ')}`,
          ),
        );
      }
    }

    if (list.length >= 5) {
      const sentenceCounts = list.map((row) => sentenceCount(row?.[field]));
      if (sentenceCounts.every((count) => count > 0) && new Set(sentenceCounts).size === 1) {
        issues.push(
          issue(
            '__batch__',
            'batch.uniform_sentence_count',
            `${locale} descriptions all use exactly ${sentenceCounts[0]} sentences; vary narrative pacing across the batch`,
          ),
        );
      } else if (list.length >= 10 && sentenceCounts.every((count) => count > 0)) {
        const [dominantCount, occurrences] = dominantValue(sentenceCounts);
        if (occurrences / list.length >= 0.8) {
          issues.push(
            issue(
              '__batch__',
              'batch.concentrated_sentence_count',
              `${locale} descriptions use exactly ${dominantCount} sentences in ${occurrences}/${list.length} rows; vary narrative pacing across the batch`,
            ),
          );
        }
      }

      const targetPositions = list.map((row) => targetSentencePosition(row, field));
      if (targetPositions.every((position) => position >= 0) && new Set(targetPositions).size === 1) {
        issues.push(
          issue(
            '__batch__',
            'batch.uniform_target_position',
            `${locale} target phrase always appears in sentence ${targetPositions[0] + 1}; vary how the phrase enters each story`,
          ),
        );
      } else if (list.length >= 10 && targetPositions.every((position) => position >= 0)) {
        const [dominantPosition, occurrences] = dominantValue(targetPositions);
        if (occurrences / list.length >= 0.8) {
          issues.push(
            issue(
              '__batch__',
              'batch.concentrated_target_position',
              `${locale} target phrase appears in sentence ${dominantPosition + 1} in ${occurrences}/${list.length} rows; vary how the phrase enters each story`,
            ),
          );
        }
      }

      const questionRows = list.filter((row) => containsLearnerQuestion(row, field));
      if (questionRows.length / list.length > 0.6) {
        issues.push(
          issue(
            '__batch__',
            'batch.question_slot_overuse',
            `${locale} learner questions appear in ${questionRows.length}/${list.length} rows; English-parity maximum is 60%`,
          ),
        );
      }
    }
  }

  return {
    contractVersion: APPROVED_STYLE_CONTRACT_VERSION,
    verdict: issues.length === 0 ? 'PASS' : 'HOLD',
    checkedRows: list.map((row) => exactDailyPhraseRowId(row?.id) ?? '__unknown__'),
    issues,
  };
}

function parseCliArgs(argv) {
  const [bankPath, ...rest] = argv;
  let ids = null;

  for (let index = 0; index < rest.length; index += 1) {
    if (rest[index] === '--ids') {
      ids = String(rest[index + 1] ?? '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
      index += 1;
    }
  }

  return { bankPath, ids };
}

function runCli() {
  const { bankPath, ids } = parseCliArgs(process.argv.slice(2));
  if (!bankPath) {
    console.error('Usage: node scripts/daily_phrase_style_gate.mjs <bank.json> [--ids id1,id2]');
    process.exitCode = 2;
    return;
  }

  const absolutePath = path.resolve(process.cwd(), bankPath);
  const payload = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
  const allRows = Array.isArray(payload) ? payload : payload.rows;
  if (!Array.isArray(allRows)) {
    throw new Error(`No rows array found in ${absolutePath}`);
  }

  const rows = selectExactDailyPhraseRows(allRows, ids);

  const result = evaluateDailyPhraseBatchStyle(rows);
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.verdict === 'PASS' ? 0 : 1;
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectRun) runCli();
