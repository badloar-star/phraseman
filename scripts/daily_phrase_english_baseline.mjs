import { createHash } from 'node:crypto';

export const DAILY_PHRASE_ENGLISH_BASELINE_COUNT = 176;
export const CANONICAL_DAILY_PHRASE_ENGLISH_BASELINE_SHA256 =
  'A2A744254CEA2080EA44326335DF573AE828D465AC721F696B1E1F2235873321';

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function issue(code, message) {
  return { rowId: '__baseline__', code, message };
}

export function evaluateDailyPhraseEnglishBaseline(value, options = {}) {
  if (value === undefined || value === null) {
    return {
      verdict: 'HOLD',
      rows: [],
      issues: [issue('english_baseline.missing', 'Canonical English Daily Phrase baseline is required')],
    };
  }

  const rows = Array.isArray(value)
    ? value
    : value && typeof value === 'object' && !Array.isArray(value)
      ? value.rows
      : null;
  if (!Array.isArray(rows)) {
    return {
      verdict: 'HOLD',
      rows: [],
      issues: [issue(
        'english_baseline.invalid_shape',
        'English baseline must be an array or a plain object with a rows array',
      )],
    };
  }
  if (rows.length !== DAILY_PHRASE_ENGLISH_BASELINE_COUNT) {
    return {
      verdict: 'HOLD',
      rows: [],
      issues: [issue(
        'english_baseline.wrong_count',
        `English baseline must contain exactly ${DAILY_PHRASE_ENGLISH_BASELINE_COUNT} rows`,
      )],
    };
  }
  let invalidRow = false;
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    if (!Object.prototype.hasOwnProperty.call(rows, index)
      || !row || typeof row !== 'object' || Array.isArray(row)
      || !text(row.meaning) || !text(row.meaning_uk)) {
      invalidRow = true;
      break;
    }
  }
  if (invalidRow) {
    return {
      verdict: 'HOLD',
      rows: [],
      issues: [issue(
        'english_baseline.invalid_shape',
        'Every English baseline row must contain nonblank Russian and Ukrainian meaning strings',
      )],
    };
  }

  if (options.requireCanonical === true) {
    const canonicalBytes = `${JSON.stringify(rows, null, 2)}\n`;
    const actualSha256 = createHash('sha256').update(canonicalBytes).digest('hex').toUpperCase();
    if (actualSha256 !== CANONICAL_DAILY_PHRASE_ENGLISH_BASELINE_SHA256) {
      return {
        verdict: 'HOLD',
        rows: [],
        issues: [issue(
          'english_baseline.authority_mismatch',
          'English baseline content does not match the canonical Daily Phrase authority',
        )],
      };
    }
  }

  return { verdict: 'PASS', rows, issues: [] };
}
