import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { exactDailyPhraseRowId } from './daily_phrase_row_selection.mjs';
import { dailyPhraseTargetLexicalSignature } from './daily_phrase_target_surface.mjs';

const REQUIRED_ROW_FIELDS = Object.freeze([
  'id',
  'targetText',
  'targetExample',
  'literal_ru',
  'meaning_ru',
  'text_ru',
  'literal_uk',
  'meaning_uk',
  'text_uk',
]);

// `ñ`/`Ñ` is valid Spanish. Mojibake detection must never reject it merely
// because a broken UTF-8 sequence may also contain a visually similar glyph.
const PLACEHOLDER_RE = /(?:\?{2,}|\bTODO\b|�|Ð)/;
const PLACEHOLDER_WORD_RE = /\b(?:tbd|placeholder)\b/i;

function containsPlaceholder(value) {
  return PLACEHOLDER_RE.test(value) || PLACEHOLDER_WORD_RE.test(value);
}

function string(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalized(value) {
  return string(value).normalize('NFKC').toLocaleLowerCase();
}

function validateBankMetadata(bank, errors) {
  const target = bank?.studyTarget;
  const sourceLocale = bank?.sourceLocale;
  const surface = bank?.surface;

  if (!['es', 'fr', 'de', 'it'].includes(target)) errors.push('unsupported_study_target');
  if (!['ru', 'uk'].includes(sourceLocale)) errors.push('unsupported_source_locale');
  if (surface !== 'daily_phrase') errors.push('invalid_surface');
  if (bank?.activationApproved !== false) errors.push('activation_must_remain_closed');

  return { target, sourceLocale };
}

function validateRows(rows, target, sourceLocale, errors) {
  const ids = new Set();
  const targetTexts = new Set();
  const meanings = { ru: new Set(), uk: new Set() };
  for (const row of rows) {
    const id = string(row?.id) || 'unknown';
    for (const field of REQUIRED_ROW_FIELDS) {
      const value = string(row?.[field]);
      if (!value) errors.push(`row:${id}:${field}_required`);
      if (containsPlaceholder(value)) errors.push(`row:${id}:${field}_contains_placeholder`);
    }
    if (row?.studyTarget !== target) errors.push(`row:${id}:study_target_mismatch`);
    if (row?.sourceLocale !== sourceLocale) errors.push(`row:${id}:source_locale_mismatch`);
    if (row?.surface !== 'daily_phrase') errors.push(`row:${id}:surface_mismatch`);
    if (row?.allowSave !== true) errors.push(`row:${id}:allow_save_required`);
    if (!Number.isInteger(row?.order) || row.order < 1) errors.push(`row:${id}:positive_order_required`);
    if (row?.active !== false) errors.push(`row:${id}:active_must_remain_false`);
    if (row?.activationApproved !== false) errors.push(`row:${id}:activation_must_remain_closed`);

    const normalizedId = normalized(row?.id);
    const targetText = string(row?.targetText);
    const normalizedTarget = targetText ? dailyPhraseTargetLexicalSignature(targetText) : '';
    if (normalizedId && ids.has(normalizedId)) errors.push(`row:${id}:duplicate_id`);
    if (normalizedTarget && targetTexts.has(normalizedTarget)) errors.push(`row:${id}:duplicate_target_text`);
    for (const locale of ['ru', 'uk']) {
      const meaning = string(row?.[`meaning_${locale}`]);
      const normalizedMeaning = meaning ? dailyPhraseTargetLexicalSignature(meaning) : '';
      if (normalizedMeaning && meanings[locale].has(normalizedMeaning)) {
        errors.push(`row:${id}:duplicate_meaning_${locale}`);
        if (locale === sourceLocale) errors.push(`row:${id}:duplicate_meaning`);
      }
      if (normalizedMeaning) meanings[locale].add(normalizedMeaning);
    }
    ids.add(normalizedId);
    if (normalizedTarget) targetTexts.add(normalizedTarget);
  }
}

function validateCanonicalRowIdentities(rows, target, errors) {
  if (!['es', 'fr', 'de', 'it'].includes(target)) return;
  for (const [index, row] of rows.entries()) {
    const expectedOrder = index + 1;
    const expectedId = `${target}-${String(expectedOrder).padStart(3, '0')}`;
    if (row?.id !== expectedId) errors.push(`row:${expectedId}:canonical_id_required`);
    if (row?.order !== expectedOrder) errors.push(`row:${expectedId}:canonical_order_required`);
  }
}

export function validateTargetDailyPhraseBank(bank) {
  // Structural validation only. Semantic review cannot be self-declared in a
  // mutable row; `daily_phrase_quality_release_gate.mjs` accepts only external,
  // independent, hash-bound receipts.
  const errors = [];
  const rows = Array.isArray(bank?.rows) ? bank.rows : [];
  const { target, sourceLocale } = validateBankMetadata(bank, errors);
  if (rows.length !== 176) errors.push('count_must_equal_176');
  validateCanonicalRowIdentities(rows, target, errors);
  validateRows(rows, target, sourceLocale, errors);

  // This gate deliberately cannot mean that the learner-facing content is
  // publishable. Evidence, linguistic truth and prose quality are assessed
  // only by the independent, hash-bound release receipts.
  return { status: errors.length === 0 ? 'STRUCTURAL_PASS' : 'FAIL', errors };
}

export function validateTargetDailyPhraseSubset(bank, requestedIds) {
  const errors = [];
  const rows = Array.isArray(bank?.rows) ? bank.rows : [];
  const { target, sourceLocale } = validateBankMetadata(bank, errors);
  if (rows.length !== 176) errors.push('count_must_equal_176');
  validateCanonicalRowIdentities(rows, target, errors);

  const requested = Array.isArray(requestedIds) ? requestedIds : [];
  if (requested.length === 0) errors.push('requested_rows_required');

  const seenRequests = new Set();
  const selected = [];
  for (const [index, rawId] of requested.entries()) {
    const id = exactDailyPhraseRowId(rawId);
    if (!id) {
      errors.push(`requested_row:${index}:invalid_id_type`);
      continue;
    }
    if (seenRequests.has(id)) {
      errors.push(`requested_row:${id}:duplicate_request`);
      continue;
    }
    seenRequests.add(id);
    const matches = rows.filter((row) => string(row?.id) === id);
    if (matches.length === 0) {
      errors.push(`requested_row:${id}:not_found`);
      continue;
    }
    if (matches.length > 1) {
      errors.push(`requested_row:${id}:ambiguous`);
      continue;
    }
    selected.push(matches[0]);
  }

  validateRows(selected, target, sourceLocale, errors);
  return {
    status: errors.length === 0 ? 'STRUCTURAL_PASS' : 'FAIL',
    checkedRows: selected.map((row) => string(row?.id)),
    errors,
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
    console.error('Usage: node scripts/validate_target_daily_phrase_bank.mjs <bank.json> [--ids id1,id2]');
    process.exitCode = 2;
    return;
  }
  const payload = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), bankPath), 'utf8'));
  const result = ids
    ? validateTargetDailyPhraseSubset(payload, ids)
    : validateTargetDailyPhraseBank(payload);
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.status === 'STRUCTURAL_PASS' ? 0 : 1;
}

export default validateTargetDailyPhraseBank;

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectRun) runCli();
