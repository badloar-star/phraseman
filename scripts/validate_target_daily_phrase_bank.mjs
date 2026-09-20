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
const PLACEHOLDER_RE = /(?:\?{2,}|\b(?:todo|tbd|placeholder)\b|�|Ð)/i;

function string(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalized(value) {
  return string(value).normalize('NFKC').toLocaleLowerCase();
}

export function validateTargetDailyPhraseBank(bank) {
  // Structural validation only. Semantic review cannot be self-declared in a
  // mutable row; `daily_phrase_quality_release_gate.mjs` accepts only external,
  // independent, hash-bound receipts.
  const errors = [];
  const target = string(bank?.studyTarget);
  const sourceLocale = string(bank?.sourceLocale);
  const surface = string(bank?.surface);
  const rows = Array.isArray(bank?.rows) ? bank.rows : [];

  if (!['es', 'fr', 'de'].includes(target)) errors.push('unsupported_study_target');
  if (!['ru', 'uk'].includes(sourceLocale)) errors.push('unsupported_source_locale');
  if (surface !== 'daily_phrase') errors.push('invalid_surface');
  if (bank?.activationApproved !== false) errors.push('activation_must_remain_closed');
  if (rows.length !== 176) errors.push('count_must_equal_176');

  const ids = new Set();
  const targetTexts = new Set();
  const meanings = new Set();
  for (const row of rows) {
    const id = string(row?.id) || 'unknown';
    for (const field of REQUIRED_ROW_FIELDS) {
      const value = string(row?.[field]);
      if (!value) errors.push(`row:${id}:${field}_required`);
      if (PLACEHOLDER_RE.test(value)) errors.push(`row:${id}:${field}_contains_placeholder`);
    }
    if (row?.studyTarget !== target) errors.push(`row:${id}:study_target_mismatch`);
    if (row?.sourceLocale !== sourceLocale) errors.push(`row:${id}:source_locale_mismatch`);
    if (row?.surface !== 'daily_phrase') errors.push(`row:${id}:surface_mismatch`);
    if (row?.allowSave !== true) errors.push(`row:${id}:allow_save_required`);
    if (!Number.isInteger(row?.order) || row.order < 1) errors.push(`row:${id}:positive_order_required`);
    if (row?.active !== false) errors.push(`row:${id}:active_must_remain_false`);
    if (row?.activationApproved !== false) errors.push(`row:${id}:activation_must_remain_closed`);

    const normalizedId = normalized(row?.id);
    const normalizedTarget = normalized(row?.targetText);
    const normalizedMeaning = normalized(row?.[`meaning_${sourceLocale}`]);
    if (normalizedId && ids.has(normalizedId)) errors.push(`row:${id}:duplicate_id`);
    if (normalizedTarget && targetTexts.has(normalizedTarget)) errors.push(`row:${id}:duplicate_target_text`);
    if (normalizedMeaning && meanings.has(normalizedMeaning)) errors.push(`row:${id}:duplicate_meaning`);
    ids.add(normalizedId);
    targetTexts.add(normalizedTarget);
    meanings.add(normalizedMeaning);

  }

  // This gate deliberately cannot mean that the learner-facing content is
  // publishable. Evidence, linguistic truth and prose quality are assessed
  // only by the independent, hash-bound release receipts.
  return { status: errors.length === 0 ? 'STRUCTURAL_PASS' : 'FAIL', errors };
}

export default validateTargetDailyPhraseBank;
