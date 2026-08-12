import { isFuzzyCorrect } from './flashcards/fuzzy_match';
import { englishRecallSurface } from './phrase_target_utils';

/**
 * Форматы повторения (v3):
 *   word_bank   — только настоящие слова фразы, перемешаны; тап Строго по порядку (без мусорных плиток).
 *   meaning_match — крупно английская фраза; выбрать верный перевод из 4.
 *   recall_type — по переводу набрать всю фразу на английском.
 */
export type ReviewMode = 'word_bank' | 'meaning_match' | 'recall_type';

export type EvalResult = {
  ok: boolean;
  /** E6: верно с опечаткой (Левенштейн ≤1 на слово ≥5 букв) — «Почти! Правильно: …». */
  typo: boolean;
  normalizedUser: string;
  normalizedTarget: string;
};

export type WordBankTile = { slot: number; text: string };

export function cleanPhrase(phrase: string): string {
  return phrase.replace(/[.?!,;]+$/, '').trim();
}

export function tokenizeRecallPhrase(phrase: string): string[] {
  return cleanPhrase(englishRecallSurface(phrase)).split(/\s+/).filter(Boolean);
}

export function shuffleWordBankTiles(phrase: string): WordBankTile[] {
  const words = tokenizeRecallPhrase(phrase);
  return words
    .map((text, slot) => ({ slot, text }))
    .sort(() => Math.random() - 0.5);
}

/**
 * Режим на карточку: сдвиг по индексу + мягкий уклон по типу тренировки.
 */
export function pickReviewMode(
  trainerMode: string | undefined,
  idx: number,
  phrase: string,
): ReviewMode {
  const n = tokenizeRecallPhrase(phrase).length;
  if (n <= 1) {
    return idx % 2 === 0 ? 'meaning_match' : 'recall_type';
  }
  const cycle = idx % 3;
  if (trainerMode === 'fresh') {
    return cycle === 2 ? 'meaning_match' : 'word_bank';
  }
  if (trainerMode === 'hard' || trainerMode === 'weak' || trainerMode === 'mistakes') {
    return cycle === 0 ? 'recall_type' : cycle === 1 ? 'word_bank' : 'meaning_match';
  }
  return (['word_bank', 'meaning_match', 'recall_type'] as const)[cycle]!;
}

const FALLBACK_MEANING_SNIPPETS_RU = [
  'Сегодня хорошая погода.',
  'Я пока не готов отвечать.',
  'Можно повторить ещё раз?',
  'Совсем другое предложение.',
  'Это было давно и неправда.',
];

export function buildMeaningOptions(
  correctTranslation: string,
  poolTranslations: string[],
): string[] {
  const correct = correctTranslation.trim();
  const pool = poolTranslations
    .map(t => t.trim())
    .filter(t => t.length > 0 && t.toLowerCase() !== correct.toLowerCase());
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const picked: string[] = [];
  for (const t of shuffled) {
    if (picked.length >= 3) break;
    if (!picked.some(x => x.toLowerCase() === t.toLowerCase())) picked.push(t);
  }
  let fb = 0;
  while (picked.length < 3 && fb < FALLBACK_MEANING_SNIPPETS_RU.length) {
    const s = FALLBACK_MEANING_SNIPPETS_RU[fb++]!;
    if (
      s.toLowerCase() !== correct.toLowerCase()
      && !picked.some(x => x.toLowerCase() === s.toLowerCase())
    ) {
      picked.push(s);
    }
  }
  return [correct, ...picked.slice(0, 3)].sort(() => Math.random() - 0.5);
}

export function meaningChoiceIsCorrect(picked: string, correctTranslation: string): boolean {
  return picked.trim().toLowerCase() === correctTranslation.trim().toLowerCase();
}

export function evaluateRecallAnswer(userAnswer: string, phrase: string): EvalResult {
  const target = cleanPhrase(englishRecallSurface(phrase));
  // E6: fuzzy вместо строгого === — contractions-слой (don't/do not, BrE→AmE)
  // остаётся первым внутри isFuzzyCorrect, поверх — ё/е, і/ї, Левенштейн ≤1.
  const verdict = isFuzzyCorrect(userAnswer, target);
  return {
    ok: verdict.ok,
    typo: verdict.typo,
    normalizedUser: userAnswer.trim(),
    normalizedTarget: target,
  };
}

/** Разбивка на «куски» для других экранов (совместимость). */
export function buildChunks(phrase: string): string[] {
  const words = cleanPhrase(phrase).split(/\s+/).filter(Boolean);
  if (words.length <= 3) return words;
  const chunks: string[] = [];
  let i = 0;
  while (i < words.length) {
    const left = words.length - i;
    const size = left > 4 ? 2 : left > 2 ? 2 : 1;
    chunks.push(words.slice(i, i + size).join(' '));
    i += size;
  }
  return chunks;
}

export function buildMatchTask(
  phrase: string,
  correctTranslation: string,
  wrongTranslations: string[],
): { prompt: string; options: string[]; correct: string } {
  const options = [correctTranslation, ...wrongTranslations.slice(0, 3)].sort(() => Math.random() - 0.5);
  return {
    prompt: cleanPhrase(phrase),
    options,
    correct: correctTranslation,
  };
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
