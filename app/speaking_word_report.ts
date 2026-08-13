// Per-word speaking report for the "Устно" mode — the always-on attempt map.
//
// Combines the word-level phonetic diff (which target words came through /
// sounded off / were dropped) with the recognizer's own per-word confidence
// segments (a matched word the ENGINE was unsure about is "нечётко", not
// "чисто"). Shown after EVERY scored attempt, pass or fail, so the learner
// always sees which exact words were clean (green), fuzzy (yellow) or
// missed (red).
//
// Pure, no React/native imports, fully unit-testable.

import { diffPhonemes, type SoundHint } from './speaking_phoneme_diff';
import {
  lowConfidenceWordsFromSegments,
  normalizedComparisonWords,
  type TranscriptSegment,
} from './pronunciation_scoring_core';

export type SpokenWordStatus = 'clean' | 'fuzzy' | 'missed';

export type SpokenWordEntry = {
  /** The target word (original display form, punctuation kept). */
  target: string;
  status: SpokenWordStatus;
  /** What the recognizer heard in that slot, when it heard something off. */
  heard?: string;
  /** Concrete in-word sound contrast(s), when pinpointed (e.g. /TH/ vs /S/). */
  soundHints?: SoundHint[];
};

export type BuildSpokenWordReportInput = {
  targetText: string;
  transcript: string;
  /** Per-word recognition segments (iOS 17+/Android 14+ on-device). */
  segments?: readonly TranscriptSegment[];
};

/**
 * Build the per-target-word attempt map:
 * - 'missed'  — the word did not come through at all (red);
 * - 'fuzzy'   — it came through wrong (substitution) OR the engine matched it
 *               but flagged it low-confidence (yellow);
 * - 'clean'   — matched with normal confidence (green).
 *
 * Index-aligned with `speakingTargetTokens(targetText)` (same whitespace split).
 */
export function buildSpokenWordReport(input: BuildSpokenWordReportInput): SpokenWordEntry[] {
  const diff = diffPhonemes(input.targetText, input.transcript);
  const lowConfidence = lowConfidenceWordsFromSegments(input.segments);

  return diff.words.map((w): SpokenWordEntry => {
    if (w.status === 'missed') {
      return { target: w.target, status: 'missed' };
    }
    if (w.status === 'mispronounced') {
      return {
        target: w.target,
        status: 'fuzzy',
        ...(w.heard ? { heard: w.heard } : {}),
        ...(w.soundHints && w.soundHints.length > 0 ? { soundHints: w.soundHints } : {}),
      };
    }
    // Matched — but if the engine itself was unsure about this word, the match
    // is not trustworthy enough to paint it green.
    const normalized = normalizedComparisonWords(w.target);
    const engineUnsure = normalized.some((n) => lowConfidence.has(n));
    return { target: w.target, status: engineUnsure ? 'fuzzy' : 'clean' };
  });
}

/**
 * Анти-чит маска пропущенного (красного) слова: видна только первая буква,
 * остальные буквы/цифры → «_», пунктуация (апострофы, дефисы) остаётся.
 * "think" → "t____", "don't" → "d__'_". Полный текст missed-слов после
 * неудачной попытки не показываем — иначе эталон читается с экрана и вторая
 * попытка превращается в чтение вслух (фидбек бета-теста).
 */
export function maskSpokenWordKeepInitial(word: string): string {
  let initialShown = false;
  return Array.from(word)
    .map((ch) => {
      if (!/[\p{L}\p{N}]/u.test(ch)) return ch;
      if (initialShown) return '_';
      initialShown = true;
      return ch;
    })
    .join('');
}

/** Маскирует каждое слово фразы, сохраняя пробелы и первую букву каждого слова. */
export function maskSpokenPhraseKeepInitial(phrase: string): string {
  return phrase
    .split(/(\s+)/)
    .map((part) => (/^\s+$/u.test(part) ? part : maskSpokenWordKeepInitial(part)))
    .join('');
}

/** First concrete sound hint in the report, for the "/TH/ instead of /S/" line. */
export function firstSoundHint(
  report: readonly SpokenWordEntry[],
): { word: string; hint: SoundHint } | null {
  for (const entry of report) {
    const hint = entry.soundHints?.[0];
    if (entry.status === 'fuzzy' && hint) return { word: entry.target, hint };
  }
  return null;
}

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function __RouteShim() {
  return null;
}
