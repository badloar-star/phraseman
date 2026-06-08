export type PronunciationScoreBreakdown = {
  wordAccuracy: number;
  orderAccuracy: number;
  completeness: number;
};

export type PronunciationScoreResult = {
  score: number;
  passed: boolean;
  threshold: number;
  normalizedTarget: string;
  normalizedTranscript: string;
  breakdown: PronunciationScoreBreakdown;
};

export const PRONUNCIATION_PASS_THRESHOLD = 90;

function normalizePhrase(value: string): string {
  return value
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/[^a-z0-9'\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function words(value: string): string[] {
  const normalized = normalizePhrase(value);
  return normalized ? normalized.split(' ') : [];
}

function levenshtein<T>(a: readonly T[], b: readonly T[]): number {
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  const current = Array.from({ length: b.length + 1 }, () => 0);

  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const substitutionCost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + substitutionCost,
      );
    }
    for (let j = 0; j <= b.length; j += 1) previous[j] = current[j];
  }

  return previous[b.length] ?? 0;
}

function longestCommonSubsequence<T>(a: readonly T[], b: readonly T[]): number {
  const previous = Array.from({ length: b.length + 1 }, () => 0);
  const current = Array.from({ length: b.length + 1 }, () => 0);

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      current[j] = a[i - 1] === b[j - 1]
        ? previous[j - 1] + 1
        : Math.max(previous[j], current[j - 1]);
    }
    for (let j = 0; j <= b.length; j += 1) previous[j] = current[j];
  }

  return previous[b.length] ?? 0;
}

function pct(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value * 100)));
}

export function scorePronunciationTranscript(input: {
  targetText: string;
  transcript: string;
  threshold?: number;
}): PronunciationScoreResult {
  const targetWords = words(input.targetText);
  const transcriptWords = words(input.transcript);
  const normalizedTarget = targetWords.join(' ');
  const normalizedTranscript = transcriptWords.join(' ');
  const threshold = Math.max(1, Math.min(100, Math.round(input.threshold ?? PRONUNCIATION_PASS_THRESHOLD)));

  if (targetWords.length === 0 || transcriptWords.length === 0) {
    return {
      score: 0,
      passed: false,
      threshold,
      normalizedTarget,
      normalizedTranscript,
      breakdown: { wordAccuracy: 0, orderAccuracy: 0, completeness: 0 },
    };
  }

  const distance = levenshtein(targetWords, transcriptWords);
  const wordAccuracy = pct(1 - distance / Math.max(targetWords.length, transcriptWords.length));
  const orderedMatches = longestCommonSubsequence(targetWords, transcriptWords);
  const orderAccuracy = pct(orderedMatches / targetWords.length);
  const completeness = pct(Math.min(1, transcriptWords.length / targetWords.length));
  const score = Math.round((wordAccuracy * 0.62) + (orderAccuracy * 0.28) + (completeness * 0.10));

  return {
    score,
    passed: score >= threshold,
    threshold,
    normalizedTarget,
    normalizedTranscript,
    breakdown: { wordAccuracy, orderAccuracy, completeness },
  };
}
