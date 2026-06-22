import { MAX_WRONG_SCRIPT_RATIO, wrongScriptRatio } from './explain/explain_gates';

export type GeneratedLanguageRejectReason = 'mojibake' | 'non_target_language';

const ENGLISH_STOPWORDS = new Set([
  'the',
  'and',
  'you',
  'your',
  'are',
  'is',
  'to',
  'of',
  'in',
  'that',
  'this',
  'with',
  'for',
  'today',
  'practice',
  'keep',
  'try',
  'good',
  'small',
  'step',
  'phrase',
  'phrases',
  'words',
  'week',
]);

function hasMojibake(text: string): boolean {
  return text.includes('\uFFFD') || text.includes('Ð');
}

function englishStopwordRatio(text: string): number {
  const words = text
    .toLowerCase()
    .match(/[a-z]{2,}/g) ?? [];
  if (words.length < 6) return 0;
  const hits = words.filter((word) => ENGLISH_STOPWORDS.has(word)).length;
  return hits / words.length;
}

function hasTrackedLetters(text: string): boolean {
  return /[A-Za-z\u00c0-\u024f\u0400-\u052f]/.test(text);
}

function stripQuotedEnglishExamples(text: string): string {
  return text
    .replace(/"[^"\n]*[A-Za-z][^"\n]*"/g, ' ')
    .replace(/“[^”\n]*[A-Za-z][^”\n]*”/g, ' ')
    .replace(/«[^»\n]*[A-Za-z][^»\n]*»/g, ' ');
}

function textForLanguageCheck(text: string, lang: string): string {
  const code = String(lang ?? '').slice(0, 2).toLowerCase();
  if (code === 'en') return text;
  const stripped = stripQuotedEnglishExamples(text);
  return hasTrackedLetters(stripped) ? stripped : text;
}

function looksLikeEnglishLeak(text: string, lang: string): boolean {
  const code = String(lang ?? '').slice(0, 2).toLowerCase();
  if (code === 'en') return false;
  const words = text.toLowerCase().match(/[a-z]{2,}/g) ?? [];
  if (words.length < 8) return false;
  const hits = words.filter((word) => ENGLISH_STOPWORDS.has(word)).length;
  return hits >= 4 && englishStopwordRatio(text) >= 0.25;
}

export function rejectGeneratedLanguageText(
  text: string,
  lang: string,
): GeneratedLanguageRejectReason | null {
  const trimmed = String(text ?? '').trim();
  if (!trimmed) return null;
  if (hasMojibake(trimmed)) return 'mojibake';
  const checkText = textForLanguageCheck(trimmed, lang);
  if (wrongScriptRatio(checkText, lang) > MAX_WRONG_SCRIPT_RATIO) return 'non_target_language';
  if (looksLikeEnglishLeak(checkText, lang)) return 'non_target_language';
  return null;
}
