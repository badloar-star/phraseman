import { TOURNAMENT_TASK_LIMITS } from './tournament_core';

export type ParsedDisplayGloss = {
  displayTranslation: string;
  senseHint: string;
};

export type GlossRejectionReason =
  | 'empty_input'
  | 'control_character'
  | 'unsupported_editorial_fragment'
  | 'unbalanced_brackets'
  | 'empty_primary_sense'
  | 'display_word_count_exceeded'
  | 'input_bytes_exceeded'
  | 'display_bytes_exceeded'
  | 'sense_hint_bytes_exceeded';

type ParseResult = { ok: true; value: ParsedDisplayGloss } | { ok: false; reason: GlossRejectionReason };

const OPEN_TO_CLOSE: Readonly<Record<string, string>> = Object.freeze({ '(': ')', '[': ']', '{': '}' });
const CLOSE_BRACKETS = new Set(Object.values(OPEN_TO_CLOSE));
const TOP_LEVEL_SEPARATORS = new Set([',', ';', '/']);
const UNSUPPORTED_EDITORIAL_FRAGMENT = /<\/?[^>]+>|\[(?:sic|ред\.?|устар\.?|разг\.?)\]/iu;

function utf8Bytes(value: string): number {
  return Buffer.byteLength(value, 'utf8');
}

export function parseDisplayGloss(raw: string): ParseResult {
  if (raw.trim() === '') return { ok: false, reason: 'empty_input' };
  if (/[\u0000-\u001F\u007F-\u009F]/u.test(raw)) return { ok: false, reason: 'control_character' };
  if (utf8Bytes(raw) > TOURNAMENT_TASK_LIMITS.optionBytes) return { ok: false, reason: 'input_bytes_exceeded' };

  const stack: string[] = [];
  const separatorIndexes: number[] = [];
  let displayWords = 0;
  let displayInWord = false;
  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index];
    if (Object.prototype.hasOwnProperty.call(OPEN_TO_CLOSE, char)) {
      stack.push(OPEN_TO_CLOSE[char]);
      if (separatorIndexes.length === 0) displayInWord = false;
    } else if (CLOSE_BRACKETS.has(char)) {
      if (stack.pop() !== char) return { ok: false, reason: 'unbalanced_brackets' };
      if (separatorIndexes.length === 0) displayInWord = false;
    } else if (stack.length === 0 && TOP_LEVEL_SEPARATORS.has(char)) {
      separatorIndexes.push(index);
      displayInWord = false;
    } else if (stack.length === 0 && separatorIndexes.length === 0 && /\s/u.test(char)) {
      displayInWord = false;
    } else if (stack.length === 0 && separatorIndexes.length === 0 && !displayInWord) {
      displayWords += 1;
      displayInWord = true;
    }
  }
  if (stack.length > 0) return { ok: false, reason: 'unbalanced_brackets' };
  const segments: string[] = [];
  let segmentStart = 0;
  for (const separatorIndex of separatorIndexes) {
    segments.push(raw.slice(segmentStart, separatorIndex).trim());
    segmentStart = separatorIndex + 1;
  }
  segments.push(raw.slice(segmentStart).trim());
  if (segments.some((value) => value === '')) return { ok: false, reason: 'empty_primary_sense' };
  if (UNSUPPORTED_EDITORIAL_FRAGMENT.test(raw)) return { ok: false, reason: 'unsupported_editorial_fragment' };

  const [displayTranslation, ...hints] = segments;
  const senseHint = hints.join('; ');
  if (displayWords > 3) return { ok: false, reason: 'display_word_count_exceeded' };
  if (utf8Bytes(displayTranslation) > TOURNAMENT_TASK_LIMITS.optionBytes) {
    return { ok: false, reason: 'display_bytes_exceeded' };
  }
  if (utf8Bytes(senseHint) > TOURNAMENT_TASK_LIMITS.optionBytes) {
    return { ok: false, reason: 'sense_hint_bytes_exceeded' };
  }
  return { ok: true, value: { displayTranslation, senseHint } };
}
