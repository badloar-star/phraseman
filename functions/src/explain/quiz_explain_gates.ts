/**
 * Deterministic input gate + output parser for THEMATIC-QUIZ explanations.
 * PURE logic, no firebase-admin — unit-testable. NO AI here; this is the cheap layer that runs
 * before the paid judge. Reuses the explain-feature length limits. Sibling of choice_explain_gates.
 */
import { MAX_PHRASE_LEN, MAX_MEANING_LEN } from './explain_gates';

/** Max number of wrong options we will explain in one batch (a quiz question shows 4 = 3 wrong). */
export const MAX_QUIZ_WRONG_OPTIONS = 6;
/** UI-sized hard cap for one generated quiz line; prompts ask for 160 chars, parser enforces headroom. */
export const MAX_QUIZ_EXPLANATION_CHARS = 190;

export interface QuizInput {
  correctEn: string;
  questionPrompt: string;
  wrongOptions: string[];
  lang: string;
}

export interface QuizInputValidation {
  ok: boolean;
  reason?:
    | 'correct_empty'
    | 'correct_too_long'
    | 'meaning_empty'
    | 'meaning_too_long'
    | 'no_wrong_options'
    | 'option_too_long';
  /** Cleaned wrong-option list (trimmed, de-duped, correct-excluded, capped) when ok. */
  wrongOptions?: string[];
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export function validateQuizInput(input: Partial<QuizInput>): QuizInputValidation {
  const correctEn = asString(input.correctEn).trim();
  if (!correctEn) return { ok: false, reason: 'correct_empty' };
  if (correctEn.length > MAX_PHRASE_LEN) return { ok: false, reason: 'correct_too_long' };

  const meaning = asString(input.questionPrompt).trim();
  if (!meaning) return { ok: false, reason: 'meaning_empty' };
  if (meaning.length > MAX_MEANING_LEN) return { ok: false, reason: 'meaning_too_long' };

  const correctKey = correctEn.toLowerCase();
  const raw = Array.isArray(input.wrongOptions) ? input.wrongOptions : [];
  const cleaned: string[] = [];
  const seen = new Set<string>();
  for (const d of raw) {
    const text = asString(d).trim();
    if (!text) continue;
    if (text.length > MAX_PHRASE_LEN) return { ok: false, reason: 'option_too_long' };
    const key = text.toLowerCase();
    if (key === correctKey) continue; // never explain the correct option as a "wrong" one
    if (seen.has(key)) continue;
    seen.add(key);
    cleaned.push(text);
    if (cleaned.length >= MAX_QUIZ_WRONG_OPTIONS) break;
  }
  if (cleaned.length === 0) return { ok: false, reason: 'no_wrong_options' };

  return { ok: true, wrongOptions: cleaned };
}

export interface ParsedQuizBatch {
  ok: boolean;
  confirm: string;
  /** Keyed by the EXACT wrong-option strings requested (subset the model returned). */
  options: Record<string, string>;
}

function clampLine(text: unknown): string {
  const clean = asString(text).replace(/\s+/g, ' ').trim();
  if (clean.length <= MAX_QUIZ_EXPLANATION_CHARS) return clean;

  const clipped = clean.slice(0, MAX_QUIZ_EXPLANATION_CHARS);
  const sentenceEnd = Math.max(
    clipped.lastIndexOf('. '),
    clipped.lastIndexOf('! '),
    clipped.lastIndexOf('? '),
    clipped.lastIndexOf('… '),
  );
  const wordEnd = clipped.lastIndexOf(' ');
  const boundary = sentenceEnd >= 40 ? sentenceEnd + 1 : (wordEnd >= 40 ? wordEnd : MAX_QUIZ_EXPLANATION_CHARS - 1);
  const base = clipped
    .slice(0, boundary)
    .replace(/[\s,;:–-]+$/u, '')
    .trim();
  if (/[.!?…]["»”')\]]*$/u.test(base)) return base;
  return `${base.slice(0, MAX_QUIZ_EXPLANATION_CHARS - 1).trim()}…`;
}

/**
 * Parse the model's STRICT-JSON batch reply into { confirm, options }.
 * Tolerates code-fenced JSON. Returns ok=false if JSON is unrecoverable or confirm is empty.
 * Keys are matched to the requested wrong options case-insensitively so minor casing drift in
 * the model output still maps back to the canonical option string.
 */
export function parseQuizBatch(raw: string, requestedWrongOptions: string[]): ParsedQuizBatch {
  let body = asString(raw).trim();
  // strip a leading/trailing ```json fence if present
  const fence = body.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) body = fence[1].trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return { ok: false, confirm: '', options: {} };
  }
  if (!parsed || typeof parsed !== 'object') return { ok: false, confirm: '', options: {} };

  const obj = parsed as { confirm?: unknown; options?: unknown };
  const confirm = clampLine(obj.confirm);
  const rawMap = (obj.options && typeof obj.options === 'object'
    ? (obj.options as Record<string, unknown>)
    : {});

  // Build a case-insensitive lookup of what the model returned, then map onto requested keys.
  const lower = new Map<string, string>();
  for (const [k, v] of Object.entries(rawMap)) {
    const line = clampLine(v);
    if (line) lower.set(k.trim().toLowerCase(), line);
  }
  const options: Record<string, string> = {};
  for (const d of requestedWrongOptions) {
    const hit = lower.get(d.trim().toLowerCase());
    if (hit) options[d] = hit;
  }

  if (!confirm) return { ok: false, confirm: '', options };
  return { ok: true, confirm, options };
}
