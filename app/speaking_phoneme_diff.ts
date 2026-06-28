// Word-level phonetic diff for speaking feedback — "which word sounded off".
//
// Fully local, zero bundle cost: built on the inlined Double Metaphone. After a
// FAILED/borderline attempt we align the target words to what the recognizer
// heard and flag the target words that didn't come through — distinguishing a
// word that sounded WRONG (engine heard a different-sounding word) from one that
// was simply MISSED (dropped / not heard at all).
//
// NOTE (honesty): this is WORD-level, not in-word phoneme level. When the engine
// transcribed the correct word we cannot tell which sound inside it was off (the
// recognizer gives no sub-word signal). So feedback only appears on FAIL/borderline
// and only for words the engine wrote differently or dropped. Pure, testable.

import { soundsAlike } from './double_metaphone';
import { comparePhonemes } from './g2p_arpabet';

export type PhonemeWordStatus = 'ok' | 'mispronounced' | 'missed';

/** Concrete in-word sound feedback, e.g. expected 'TH' but said 'S'. */
export type SoundHint = {
  expected: string;
  said: string;
};

export type PhonemeWordDiff = {
  /** The target word (original display form). */
  target: string;
  status: PhonemeWordStatus;
  /** What the recognizer heard in that slot, when it heard something wrong. */
  heard?: string;
  /** For a mispronounced word: the specific sound(s) that differed (best-effort). */
  soundHints?: SoundHint[];
};

export type PhonemeDiffResult = {
  words: PhonemeWordDiff[];
  /** True when at least one word is mispronounced or missed. */
  hasIssues: boolean;
};

function normalizeWord(value: string): string {
  return value
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/[^a-z0-9']+/g, '')
    .trim();
}

function tokens(value: string): string[] {
  return value.split(/\s+/).map((w) => w.trim()).filter((w) => w.length > 0);
}

/**
 * Diff the target phrase against the recognized transcript at the word level.
 * Uses a simple LCS-style alignment with phonetic equality so spelling variants
 * (center/centre) count as OK, while truly different-sounding words are flagged.
 */
export function diffPhonemes(targetText: string, transcript: string): PhonemeDiffResult {
  const targetTokens = tokens(targetText);
  const heardNorm = tokens(transcript).map(normalizeWord).filter(Boolean);

  // Phonetic-aware equality for alignment.
  const equal = (a: string, b: string): boolean => {
    const na = normalizeWord(a);
    const nb = normalizeWord(b);
    if (!na || !nb) return na === nb;
    if (na === nb) return true;
    return soundsAlike(na, nb);
  };

  // LCS over (targetTokens, heardNorm) with phonetic equality → which target
  // words were matched. Backtrack to mark matched targets.
  const n = targetTokens.length;
  const m = heardNorm.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 1; i <= n; i += 1) {
    for (let j = 1; j <= m; j += 1) {
      dp[i]![j] = equal(targetTokens[i - 1]!, heardNorm[j - 1]!)
        ? dp[i - 1]![j - 1]! + 1
        : Math.max(dp[i - 1]![j]!, dp[i]![j - 1]!);
    }
  }
  const matchedTarget = new Array<boolean>(n).fill(false);
  const matchedHeard = new Array<boolean>(m).fill(false);
  let i = n;
  let j = m;
  while (i > 0 && j > 0) {
    if (equal(targetTokens[i - 1]!, heardNorm[j - 1]!)) {
      matchedTarget[i - 1] = true;
      matchedHeard[j - 1] = true;
      i -= 1;
      j -= 1;
    } else if (dp[i - 1]![j]! >= dp[i]![j - 1]!) {
      i -= 1;
    } else {
      j -= 1;
    }
  }

  // For each UNmatched target word, decide mispronounced vs missed: if some
  // unused heard word is phonetically CLOSE (the learner attempted it but said
  // it wrong, e.g. sink for think), it's a substitution; else the word was
  // dropped (missed). Closeness uses phoneme-level similarity, not spelling.
  const usedHeard = new Set<number>();
  const words: PhonemeWordDiff[] = targetTokens.map((tok) => ({ target: tok, status: 'ok' as PhonemeWordStatus }));
  const SUBSTITUTION_MIN_SIMILARITY = 0.5;

  for (let t = 0; t < n; t += 1) {
    if (matchedTarget[t]) continue;
    // Pick the closest unused, unmatched heard word by phoneme similarity.
    let subIdx = -1;
    let bestSim = -1;
    for (let h = 0; h < m; h += 1) {
      if (usedHeard.has(h) || matchedHeard[h]) continue;
      const sim = comparePhonemes(targetTokens[t]!, heardNorm[h]!).similarity;
      if (sim > bestSim) {
        bestSim = sim;
        subIdx = h;
      }
    }
    if (subIdx >= 0 && bestSim >= SUBSTITUTION_MIN_SIMILARITY) {
      usedHeard.add(subIdx);
      const heardWord = heardNorm[subIdx]!;
      // In-word phoneme diff: which specific sound(s) differed. Best-effort —
      // only real substitutions (both sides non-empty), capped to keep the hint
      // readable. Empty when the diff is too noisy to be useful.
      const cmp = comparePhonemes(targetTokens[t]!, heardWord);
      const soundHints = cmp.mismatches
        .filter((mm) => mm.expected && mm.said)
        .slice(0, 2)
        .map((mm) => ({ expected: mm.expected, said: mm.said }));
      words[t] = {
        target: targetTokens[t]!,
        status: 'mispronounced',
        heard: heardWord,
        ...(soundHints.length > 0 ? { soundHints } : {}),
      };
    } else {
      words[t] = { target: targetTokens[t]!, status: 'missed' };
    }
  }

  const hasIssues = words.some((w) => w.status !== 'ok');
  return { words, hasIssues };
}

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function __RouteShim() {
  return null;
}
