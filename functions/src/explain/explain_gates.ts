/**
 * Deterministic input gate + output sanitizer for the "Explain like I'm five" feature.
 * PURE logic, no firebase-admin dependency (mirrors pronunciation_scoring_core.ts) — so it is
 * unit-testable without mocks and reusable by the future ai_content platform.
 *
 * NO AI here. This is the cheap, deterministic layer that runs BEFORE the paid judge.
 */

/** Max length of the source English phrase the client may send. */
export const MAX_PHRASE_LEN = 200;
/** Max length of the native-language gloss (feeds the fallback text). */
export const MAX_MEANING_LEN = 500;
/** Below this many non-space chars an explanation is "too short" to be real. */
export const MIN_OUTPUT_LEN = 5;
/** If more than this fraction of LETTERS are outside the expected script, reject as wrong-language. */
export const MAX_WRONG_SCRIPT_RATIO = 0.4;

export interface ExplainInput {
  phraseEn: string;
  phraseMeaning: string;
  lang: string;
}

export interface InputValidation {
  ok: boolean;
  reason?: 'phrase_empty' | 'phrase_too_long' | 'meaning_empty' | 'meaning_too_long';
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/**
 * Validate what the client sent. phraseMeaning is REQUIRED because the server builds the
 * fallback from it — an undefined/oversized meaning must be rejected (→ generic fallback upstream).
 */
export function validateExplainInput(input: Partial<ExplainInput>): InputValidation {
  const phraseEn = asString(input.phraseEn).trim();
  if (!phraseEn) return { ok: false, reason: 'phrase_empty' };
  if (phraseEn.length > MAX_PHRASE_LEN) return { ok: false, reason: 'phrase_too_long' };

  const meaning = asString(input.phraseMeaning).trim();
  if (!meaning) return { ok: false, reason: 'meaning_empty' };
  if (meaning.length > MAX_MEANING_LEN) return { ok: false, reason: 'meaning_too_long' };

  return { ok: true };
}

/**
 * Strip markdown / stage-directions / excess whitespace from a model reply, leaving plain text.
 * Mirrors the "output ONLY plain text" rule used by premium_dialog's GLOBAL_RULES.
 */
export function sanitizeExplanationOutput(raw: string): string {
  let s = asString(raw);
  // code fences and inline code
  s = s.replace(/```[\s\S]*?```/g, ' ').replace(/`+/g, '');
  // bold/italic/strikethrough markers
  s = s.replace(/[*_~]+/g, '');
  // leading heading hashes and list bullets at the start of a line
  s = s.replace(/^\s{0,3}#{1,6}\s*/gm, '');
  s = s.replace(/^\s{0,3}[-*+]\s+/gm, '');
  // collapse 3+ newlines to a paragraph break, collapse runs of spaces/tabs
  s = s.replace(/[ \t]+/g, ' ');
  s = s.replace(/\n{3,}/g, '\n\n');
  // trim each line's trailing spaces, then trim the whole thing
  s = s.split('\n').map((line) => line.trim()).join('\n').trim();
  return s;
}

export type Script = 'cyrillic' | 'latin';

const CYRILLIC_LANGS = new Set(['ru', 'uk', 'be', 'bg', 'sr', 'kk']);

/** Which script the explanation is expected to be in for a given UI language. */
export function expectedScriptFor(lang: string): Script {
  const code = asString(lang).slice(0, 2).toLowerCase();
  return CYRILLIC_LANGS.has(code) ? 'cyrillic' : 'latin';
}

function isCyrillic(ch: string): boolean {
  const c = ch.codePointAt(0) ?? 0;
  // Cyrillic + Cyrillic Supplement
  return (c >= 0x0400 && c <= 0x04ff) || (c >= 0x0500 && c <= 0x052f);
}

function isLatin(ch: string): boolean {
  const c = ch.codePointAt(0) ?? 0;
  return (c >= 0x41 && c <= 0x5a) || (c >= 0x61 && c <= 0x7a) ||
    // Latin-1 Supplement + Latin Extended-A letters (accented chars for es/de/etc.)
    (c >= 0x00c0 && c <= 0x024f);
}

/**
 * Fraction of LETTERS in `text` that are NOT in the expected script for `lang`.
 * Digits, punctuation and whitespace are ignored. A 0 result means "all letters are the
 * expected script". CRITICAL: this is language-aware — a Cyrillic Russian explanation is the
 * EXPECTED script for lang=ru and must score ~0, not be flagged as "non-Latin".
 */
export function wrongScriptRatio(text: string, lang: string): number {
  const expected = expectedScriptFor(lang);
  const inExpected = expected === 'cyrillic' ? isCyrillic : isLatin;
  let letters = 0;
  let wrong = 0;
  for (const ch of asString(text)) {
    if (!isCyrillic(ch) && !isLatin(ch)) continue; // not a letter we track
    letters += 1;
    if (!inExpected(ch)) wrong += 1;
  }
  if (letters === 0) return 0;
  return wrong / letters;
}

export type HeuristicReason = 'empty' | 'too_short' | 'non_target_language';

/**
 * Cheap pre-filter run on the GENERATED text BEFORE the paid judge call.
 * Returns a reject reason for obvious garbage (so we skip the judge = 0 tokens), or null to
 * let the text proceed to the AI judge.
 */
export function heuristicReject(text: string, lang: string): HeuristicReason | null {
  const trimmed = asString(text).trim();
  if (trimmed.length === 0) return 'empty';
  if (trimmed.replace(/\s+/g, '').length < MIN_OUTPUT_LEN) return 'too_short';
  if (wrongScriptRatio(trimmed, lang) > MAX_WRONG_SCRIPT_RATIO) return 'non_target_language';
  return null;
}
