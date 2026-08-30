export type DialogRepeatReason = 'none' | 'exact' | 'near';

export interface DialogHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface DialogRepeatAssessment {
  repeated: boolean;
  reason: DialogRepeatReason;
  score: number;
  bucket: 'none' | 'medium' | 'high' | 'exact';
}

const NEAR_REPEAT_THRESHOLD = 0.8;
const MIN_NEAR_REPEAT_WORDS = 6;
const MIN_REPEATED_OPENING_WORDS = 4;

export function normalizeDialogReply(value: unknown): string {
  return String(value ?? '')
    .replace(/\[\[|\]\]/g, '')
    .normalize('NFKC')
    .toLocaleLowerCase('en-US')
    .replace(/[^\p{L}\p{N}'’]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function firstSentence(value: string): string {
  return value.split(/(?<=[.!?])\s+/u)[0] ?? value;
}

function words(value: string): string[] {
  const normalized = normalizeDialogReply(value);
  return normalized ? normalized.split(' ') : [];
}

function tokenBigrams(value: string): Set<string> {
  const tokens = words(value);
  const result = new Set<string>();
  for (let index = 0; index + 1 < tokens.length; index += 1) {
    result.add(`${tokens[index]} ${tokens[index + 1]}`);
  }
  return result;
}

function jaccard(left: Set<string>, right: Set<string>): number {
  if (left.size === 0 || right.size === 0) return 0;
  let intersection = 0;
  left.forEach((item) => {
    if (right.has(item)) intersection += 1;
  });
  return intersection / (left.size + right.size - intersection);
}

function comparableScore(candidate: string, previous: string): number {
  if (Math.min(words(candidate).length, words(previous).length) < MIN_NEAR_REPEAT_WORDS) {
    return 0;
  }
  return jaccard(tokenBigrams(candidate), tokenBigrams(previous));
}

export function assessDialogRepeat(
  candidate: string,
  history: readonly DialogHistoryMessage[],
): DialogRepeatAssessment {
  const normalized = normalizeDialogReply(candidate);
  if (!normalized) {
    return { repeated: false, reason: 'none', score: 0, bucket: 'none' };
  }

  const candidateOpening = firstSentence(candidate);
  const normalizedOpening = normalizeDialogReply(candidateOpening);
  let bestScore = 0;

  for (const item of history) {
    if (item.role !== 'assistant') continue;
    const previous = normalizeDialogReply(item.content);
    if (!previous) continue;
    if (normalized === previous) {
      return { repeated: true, reason: 'exact', score: 1, bucket: 'exact' };
    }

    const previousOpening = firstSentence(item.content);
    const normalizedPreviousOpening = normalizeDialogReply(previousOpening);
    if (
      normalizedOpening === normalizedPreviousOpening &&
      words(normalizedOpening).length >= MIN_REPEATED_OPENING_WORDS
    ) {
      return { repeated: true, reason: 'exact', score: 1, bucket: 'exact' };
    }

    bestScore = Math.max(
      bestScore,
      comparableScore(candidate, item.content),
      comparableScore(candidateOpening, previousOpening),
    );
  }

  const repeated = bestScore >= NEAR_REPEAT_THRESHOLD;
  return {
    repeated,
    reason: repeated ? 'near' : 'none',
    score: bestScore,
    bucket: bestScore >= NEAR_REPEAT_THRESHOLD ? 'high' : bestScore >= 0.5 ? 'medium' : 'none',
  };
}
