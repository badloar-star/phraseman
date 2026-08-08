import { TOURNAMENT_TASK_LIMITS } from './tournament_core';

export type ParsedDisplayGloss = {
  displayTranslation: string;
  senseHint: string;
};

export type GlossRejectionReason =
  | 'empty_input'
  | 'control_character'
  | 'invalid_unicode'
  | 'unsupported_editorial_fragment'
  | 'unbalanced_brackets'
  | 'empty_primary_sense'
  | 'empty_sense'
  | 'display_word_count_exceeded'
  | 'input_bytes_exceeded'
  | 'display_bytes_exceeded'
  | 'sense_hint_bytes_exceeded';

type ParseResult = { ok: true; value: ParsedDisplayGloss } | { ok: false; reason: GlossRejectionReason };
type OpenBracket = { close: string; start: number };
type ClosedParenthetical = { start: number; end: number };

const OPEN_TO_CLOSE: Readonly<Record<string, string>> = Object.freeze({ '(': ')', '[': ']', '{': '}' });
const CLOSE_BRACKETS = new Set(Object.values(OPEN_TO_CLOSE));
const TOP_LEVEL_SEPARATORS = new Set([',', ';', '/']);
const EXACT_EDITORIAL_MARKER = /(^|[^\p{L}\p{M}])(?:sic|устар\.?|книжн\.?|ред\.?|разг\.?|букв\.?|перен\.?)(?=$|[^\p{L}\p{M}])/iu;
const CYRILLIC_EDITORIAL_ABBREVIATION = /(^|[^\p{L}\p{M}])[\p{Script=Cyrillic}]{1,6}\.(?=$|[^\p{L}\p{M}])/u;
// Extracted annotations are deliberately plain prose: letters/numbers, whitespace,
// and only ordinary dictionary punctuation. Tags, markup, and editorial abbreviations fail closed.
const PLAIN_SENSE_ANNOTATION = /^[\p{L}\p{M}\p{N}\s.,;:/!?'"«»()[\]{}\-–—]+$/u;

function utf8Bytes(value: string): number {
  return Buffer.byteLength(value, 'utf8');
}

function isForbiddenControl(codePoint: number): boolean {
  return (codePoint <= 0x1F)
    || (codePoint >= 0x7F && codePoint <= 0x9F)
    || codePoint === 0x061C
    || codePoint === 0x200B
    || codePoint === 0x200C
    || codePoint === 0x200D
    || codePoint === 0x200E
    || codePoint === 0x200F
    || codePoint === 0x2028
    || codePoint === 0x2029
    || (codePoint >= 0x202A && codePoint <= 0x202E)
    || codePoint === 0x2060
    || (codePoint >= 0x2066 && codePoint <= 0x2069)
    || codePoint === 0xFEFF;
}

function isEditorialFragment(value: string): boolean {
  return EXACT_EDITORIAL_MARKER.test(value) || CYRILLIC_EDITORIAL_ABBREVIATION.test(value);
}

function hasLexicalContent(value: string): boolean {
  return /[\p{L}\p{N}]/u.test(value);
}

function trimEndIndex(value: string, start: number, end: number): number {
  let index = end;
  while (index > start && /\s/u.test(value[index - 1])) index -= 1;
  return index;
}

export function parseDisplayGloss(raw: string): ParseResult {
  if (utf8Bytes(raw) > TOURNAMENT_TASK_LIMITS.referenceBytes) return { ok: false, reason: 'input_bytes_exceeded' };

  const stack: OpenBracket[] = [];
  const separatorIndexes: number[] = [];
  const parentheticals: ClosedParenthetical[] = [];
  let hasNonWhitespace = false;
  let hasDisallowedControl = false;
  for (let index = 0; index < raw.length;) {
    const codeUnit = raw.charCodeAt(index);
    if (codeUnit >= 0xD800 && codeUnit <= 0xDBFF) {
      const next = raw.charCodeAt(index + 1);
      if (index + 1 >= raw.length || next < 0xDC00 || next > 0xDFFF) return { ok: false, reason: 'invalid_unicode' };
      if (/\p{Cf}/u.test(raw.slice(index, index + 2))) return { ok: false, reason: 'control_character' };
      index += 2;
      hasNonWhitespace = true;
      continue;
    }
    if (codeUnit >= 0xDC00 && codeUnit <= 0xDFFF) return { ok: false, reason: 'invalid_unicode' };

    const codePoint = raw.codePointAt(index);
    if (codePoint === undefined) return { ok: false, reason: 'invalid_unicode' };
    const char = String.fromCodePoint(codePoint);
    if (/\p{Cf}/u.test(char)) return { ok: false, reason: 'control_character' };
    if (isForbiddenControl(codePoint)) {
      hasDisallowedControl = true;
      index += char.length;
      continue;
    }
    if (char === '<' || char === '>') return { ok: false, reason: 'unsupported_editorial_fragment' };
    if (!/\s/u.test(char)) hasNonWhitespace = true;

    if (Object.prototype.hasOwnProperty.call(OPEN_TO_CLOSE, char)) {
      stack.push({ close: OPEN_TO_CLOSE[char], start: index });
    } else if (CLOSE_BRACKETS.has(char)) {
      const open = stack.pop();
      if (!open || open.close !== char) return { ok: false, reason: 'unbalanced_brackets' };
      if (char === ')') parentheticals.push({ start: open.start, end: index + 1 });
    } else if (stack.length === 0 && TOP_LEVEL_SEPARATORS.has(char)) {
      separatorIndexes.push(index);
    }
    index += char.length;
  }
  if (!hasNonWhitespace) return { ok: false, reason: 'empty_input' };
  if (hasDisallowedControl) return { ok: false, reason: 'control_character' };
  if (stack.length > 0) return { ok: false, reason: 'unbalanced_brackets' };
  if (isEditorialFragment(raw)) return { ok: false, reason: 'unsupported_editorial_fragment' };

  const segmentBounds: Array<{ start: number; end: number }> = [];
  let segmentStart = 0;
  for (const separatorIndex of separatorIndexes) {
    segmentBounds.push({ start: segmentStart, end: separatorIndex });
    segmentStart = separatorIndex + 1;
  }
  segmentBounds.push({ start: segmentStart, end: raw.length });
  const segments = segmentBounds.map(({ start, end }) => raw.slice(start, end).trim());
  if (segments.some((value) => value === '')) return { ok: false, reason: 'empty_primary_sense' };

  const primaryBound = segmentBounds[0];
  const primaryEnd = trimEndIndex(raw, primaryBound.start, primaryBound.end);
  const trailingAnnotation = parentheticals.find((pair) => (
    pair.end === primaryEnd
    && pair.start > primaryBound.start
    && /\s/u.test(raw[pair.start - 1])
  ));
  const displayTranslation = trailingAnnotation
    ? raw.slice(primaryBound.start, trailingAnnotation.start).trim()
    : segments[0];
  const extractedHint = trailingAnnotation
    ? raw.slice(trailingAnnotation.start + 1, trailingAnnotation.end - 1).trim()
    : '';
  if (displayTranslation === '') return { ok: false, reason: 'empty_primary_sense' };
  if (!hasLexicalContent(displayTranslation)) return { ok: false, reason: 'empty_primary_sense' };
  if (/[\[\]{}]/u.test(displayTranslation)) return { ok: false, reason: 'unsupported_editorial_fragment' };
  if (trailingAnnotation && (extractedHint === '' || !PLAIN_SENSE_ANNOTATION.test(extractedHint))) {
    return { ok: false, reason: 'unsupported_editorial_fragment' };
  }

  const hintSegments = [extractedHint, ...segments.slice(1)].filter(Boolean);
  if (hintSegments.some((value) => !hasLexicalContent(value))) return { ok: false, reason: 'empty_sense' };
  const senseHint = hintSegments.join('; ');
  const displayWords = displayTranslation.trim().split(/\s+/u);
  if (displayWords.length < 1 || displayWords.length > 3) return { ok: false, reason: 'display_word_count_exceeded' };
  if (utf8Bytes(displayTranslation) > TOURNAMENT_TASK_LIMITS.optionBytes) {
    return { ok: false, reason: 'display_bytes_exceeded' };
  }
  if (utf8Bytes(senseHint) > TOURNAMENT_TASK_LIMITS.optionBytes) {
    return { ok: false, reason: 'sense_hint_bytes_exceeded' };
  }
  return { ok: true, value: { displayTranslation, senseHint } };
}
