// Per-word drill judging for the "Скажи вслух" (speaking) mode.
//
// After a scored phrase attempt the panel shows a per-word map (clean / fuzzy /
// missed). This module powers the WORD DRILL: when the learner taps a yellow/red
// word and re-says it ALONE, we judge that single re-attempt against the one
// target word and answer "clean or still off" — plus, when off, the concrete
// sound(s) that differ and what we heard.
//
// Reuses the exact phonetic machinery the phrase path already uses
// (double_metaphone for phonetic equality, comparePhonemes for the in-word sound
// diff) — NO new phonetic logic here, only the single-word assembly + the
// "clean for a word" threshold. Pure, no React/native imports, fully unit-testable.

import { soundsAlike } from './double_metaphone';
import { comparePhonemes } from './g2p_arpabet';
import { normalizeSpokenWord } from './speaking_word_match';
import type { SoundHint } from './speaking_phoneme_diff';

/**
 * "Clean" for a SINGLE word means the learner nailed it — the whole point of the
 * drill is reaching 100% on this word, so a word with one clearly wrong sound must
 * stay fuzzy and keep them practising. A word is clean when it is phonetically
 * equal to the target (double_metaphone `soundsAlike`, which already forgives real
 * accent/spelling variants like center/centre and three/tree) OR its phoneme
 * similarity clears this bar. The bar sits ABOVE a single-mismatch-in-a-short-word
 * (e.g. think→sink scores 0.75) so such near-misses remain fuzzy; genuine variants
 * pass via `soundsAlike` regardless. Tunable in one place.
 */
export const WORD_DRILL_CLEAN_SIMILARITY = 0.85;

export type WordDrillStatus = 'clean' | 'fuzzy';

export interface JudgeSingleWordInput {
  /** The one target word being drilled (display form; punctuation is stripped). */
  target: string;
  /**
   * What the recognizer heard for the single-word re-attempt. May contain more
   * than one token (engine noise / filler) — we pick the token closest to the
   * target so a stray "uh" before the word doesn't fail a clean attempt.
   */
  heardTranscript: string;
}

export interface WordDrillVerdict {
  status: WordDrillStatus;
  /** The heard token we judged against, when it differed from the target. */
  heard?: string;
  /** Concrete in-word sound contrast(s) for a fuzzy result (e.g. /f/ vs /p/). */
  soundHints?: SoundHint[];
}

/** Pick the heard token phonetically closest to the target (empty → ''). */
function closestHeardToken(target: string, heardTranscript: string): string {
  const heard = heardTranscript
    .split(/\s+/)
    .map(normalizeSpokenWord)
    .filter((w) => w.length > 0);
  if (heard.length === 0) return '';
  if (heard.length === 1) return heard[0]!;
  let best = heard[0]!;
  let bestSim = -1;
  for (const h of heard) {
    const sim = comparePhonemes(target, h).similarity;
    if (sim > bestSim) {
      bestSim = sim;
      best = h;
    }
  }
  return best;
}

/**
 * Judge a single-word drill re-attempt against its target word.
 *
 * Returns `clean` when the said word is phonetically the target (or clears the
 * word similarity bar), else `fuzzy` with the heard token and the specific
 * sound contrast(s) when we can pinpoint them.
 *
 * Callers treat an EMPTY `heardTranscript` (engine heard nothing) as a separate
 * "no_speech" UI state — NOT a fuzzy failure — and must not pass it here as a
 * verdict; but if it is passed, we report `fuzzy` with no heard token so the
 * caller never crashes on missing data.
 */
export function judgeSingleWord(input: JudgeSingleWordInput): WordDrillVerdict {
  const targetNorm = normalizeSpokenWord(input.target);
  const heardWord = closestHeardToken(input.target, input.heardTranscript);

  if (!heardWord) return { status: 'fuzzy' };

  // Exact (normalized) or phonetic match → clean, no hints needed.
  if (targetNorm && (heardWord === targetNorm || soundsAlike(targetNorm, heardWord))) {
    return { status: 'clean' };
  }

  const cmp = comparePhonemes(input.target, heardWord);
  if (cmp.similarity >= WORD_DRILL_CLEAN_SIMILARITY) {
    return { status: 'clean' };
  }

  const soundHints: SoundHint[] = cmp.mismatches
    .filter((mm) => mm.expected && mm.said)
    .slice(0, 2)
    .map((mm) => ({ expected: mm.expected, said: mm.said }));

  return {
    status: 'fuzzy',
    heard: heardWord,
    ...(soundHints.length > 0 ? { soundHints } : {}),
  };
}

/**
 * The word statuses the drill can act on. Clean words are never drillable; only
 * fuzzy/missed words become tappable (mirrors the design: green stays green).
 */
export function isDrillableStatus(status: 'clean' | 'fuzzy' | 'missed'): boolean {
  return status === 'fuzzy' || status === 'missed';
}

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function __RouteShim() {
  return null;
}
