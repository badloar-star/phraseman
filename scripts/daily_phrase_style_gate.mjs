import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

function words(value) {
  return String(value).match(/[\p{L}\p{N}]+(?:[’'ʼ-][\p{L}\p{N}]+)*/gu) ?? [];
}

function sentenceCount(value) {
  return String(value)
    .split(/[.!?…]+(?:[»”"']+)?/u)
    .map((part) => part.trim())
    .filter(Boolean).length;
}

function normalizeForMatch(value) {
  return words(String(value).toLocaleLowerCase('und')).join(' ');
}

function issue(rowId, code, message) {
  return { rowId: rowId || '__unknown__', code, message };
}

export function evaluateDailyPhraseRowStyle(row) {
  const rowId = String(row?.id ?? '');
  const targetText = String(row?.targetText ?? '').trim();
  const targetNormalized = normalizeForMatch(targetText);
  const issues = [];

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

    if (targetNormalized && !normalizeForMatch(text).includes(targetNormalized)) {
      issues.push(
        issue(rowId, `${prefix}target_missing`, `${rules.field} must weave the exact target phrase into the story`),
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

    const sentences = text
      .split(/[.!?…]+(?:[»”"']+)?/u)
      .map((part) => part.trim())
      .filter(Boolean);
    const closing = sentences.at(-1) ?? '';
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

export function evaluateDailyPhraseBatchStyle(rows) {
  const list = Array.isArray(rows) ? rows : [];
  const rowResults = list.map(evaluateDailyPhraseRowStyle);
  const issues = rowResults.flatMap((result) => result.issues);

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
      ids.push(String(row?.id ?? '__unknown__'));
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
    checkedRows: list.map((row) => String(row?.id ?? '__unknown__')),
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

  const requested = ids ? new Set(ids) : null;
  const rows = requested ? allRows.filter((row) => requested.has(String(row?.id))) : allRows;
  if (requested && rows.length !== requested.size) {
    const found = new Set(rows.map((row) => String(row?.id)));
    const missing = [...requested].filter((id) => !found.has(id));
    throw new Error(`Unknown row ids: ${missing.join(', ')}`);
  }

  const result = evaluateDailyPhraseBatchStyle(rows);
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.verdict === 'PASS' ? 0 : 1;
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectRun) runCli();
