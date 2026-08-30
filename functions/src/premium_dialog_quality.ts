export type DialogRepeatReason = 'none' | 'exact' | 'near';

export interface DialogHistoryMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface DialogRepeatAssessment {
  repeated: boolean;
  reason: DialogRepeatReason;
  score: number;
  bucket: 'none' | 'medium' | 'high' | 'exact';
}

export interface DialogQualityMeta {
  repeatDetected: boolean;
  repeatReason: DialogRepeatReason;
  similarityBucket: DialogRepeatAssessment['bucket'];
  regenerationAttempted: boolean;
  regenerationSucceeded: boolean;
  gameModeAvailable: boolean;
}

export class DialogRepeatedReplyError extends Error {
  readonly code = 'dialog_repeated_reply';

  constructor() {
    super('dialog_repeated_reply');
    this.name = 'DialogRepeatedReplyError';
  }
}

export interface SanitizedDialogGameState {
  exchangeIndex: number;
  mood: number;
  objectivesMet: string[];
  noProgressTurns: number;
}

export interface CanonicalDialogTurnState {
  mood: number;
  objectivesMet: string[];
  outcome: 'ongoing' | 'success' | 'lost_patience' | 'stalled';
  characterReaction: unknown;
  coachTips: unknown;
}

const NEAR_REPEAT_THRESHOLD = 0.8;
const MIN_NEAR_REPEAT_WORDS = 6;
const MIN_REPEATED_OPENING_WORDS = 4;

export const DIALOG_REPEAT_RETRY_INSTRUCTION =
  'QUALITY RETRY: Your previous draft repeated an earlier assistant reply. '
  + 'Use a clearly different formulation, acknowledge the learner’s newest message, '
  + 'and move to the next unfinished objective. Do not restart the scene.';

function clampInteger(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.round(parsed)));
}

export function sanitizeDialogGameState(
  value: unknown,
  objectiveIds: readonly string[],
  seedMood: number,
): SanitizedDialogGameState {
  const raw = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const allowedObjectives = new Set(objectiveIds);
  const suppliedObjectives = Array.isArray(raw.objectivesMet) ? raw.objectivesMet : [];
  const objectivesMet = [...new Set(suppliedObjectives.map(String))]
    .filter((id) => allowedObjectives.has(id))
    .slice(0, 12);

  return {
    exchangeIndex: clampInteger(raw.exchangeIndex, 1, 32, 1),
    mood: clampInteger(raw.mood, 0, 100, clampInteger(seedMood, 0, 100, 70)),
    objectivesMet,
    noProgressTurns: clampInteger(raw.noProgressTurns, 0, 32, 0),
  };
}

export function canonicalizeDialogTurnState(
  raw: Record<string, unknown>,
  prior: SanitizedDialogGameState,
  objectiveIds: readonly string[],
): CanonicalDialogTurnState {
  const allowedObjectives = new Set(objectiveIds);
  const currentObjectives = Array.isArray(raw.objectivesMet)
    ? raw.objectivesMet.map(String)
    : [];
  const objectivesMet = [...new Set([...prior.objectivesMet, ...currentObjectives])]
    .filter((id) => allowedObjectives.has(id));
  const mood = clampInteger(raw.mood, 0, 100, prior.mood);
  const allObjectivesMet =
    objectiveIds.length > 0 && objectiveIds.every((id) => objectivesMet.includes(id));
  const outcome =
    raw.outcome === 'lost_patience' || mood === 0
      ? 'lost_patience'
      : allObjectivesMet
        ? 'success'
        : prior.exchangeIndex >= 8
          ? 'stalled'
          : 'ongoing';

  return {
    mood,
    objectivesMet,
    outcome,
    characterReaction: raw.characterReaction,
    coachTips: raw.coachTips,
  };
}

export function normalizeDialogReply(value: unknown): string {
  return String(value ?? '')
    .replace(/\[\[|\]\]/g, '')
    .normalize('NFKC')
    .toLocaleLowerCase('en-US')
    .replace(/[’‘]/g, "'")
    .replace(/[^\p{L}\p{N}'’]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function meaningfulLead(value: string): string {
  const sentences = value.match(/[^.!?]+[.!?]?/gu)?.map((sentence) => sentence.trim()) ?? [];
  const question = sentences.find((sentence) => sentence.endsWith('?'));
  if (question) return question;
  return sentences.find((sentence) => words(sentence).length >= MIN_REPEATED_OPENING_WORDS)
    ?? sentences[0]
    ?? value;
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

  const candidateOpening = meaningfulLead(candidate);
  const normalizedOpening = normalizeDialogReply(candidateOpening);
  let bestScore = 0;

  for (const item of history) {
    if (item.role !== 'assistant') continue;
    const previous = normalizeDialogReply(item.content);
    if (!previous) continue;
    if (normalized === previous) {
      return { repeated: true, reason: 'exact', score: 1, bucket: 'exact' };
    }

    const previousOpening = meaningfulLead(item.content);
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

/**
 * Проверяет полный готовый ответ и допускает ровно одну внутреннюю регенерацию.
 * Первый кандидат никогда не возвращается вызывающему, если признан повтором.
 */
export async function generateDialogWithRepeatGuard<
  TGenerate extends (attempt: 0 | 1) => Promise<{ reply: string }>,
>(
  generate: TGenerate,
  history: readonly DialogHistoryMessage[],
): Promise<{ value: Awaited<ReturnType<TGenerate>>; quality: DialogQualityMeta }> {
  type GeneratedValue = Awaited<ReturnType<TGenerate>>;
  const first = await generate(0) as GeneratedValue;
  const firstAssessment = assessDialogRepeat(first.reply, history);
  if (!firstAssessment.repeated) {
    return {
      value: first,
      quality: {
        repeatDetected: false,
        repeatReason: 'none',
        similarityBucket: firstAssessment.bucket,
        regenerationAttempted: false,
        regenerationSucceeded: false,
        gameModeAvailable: true,
      },
    };
  }

  const second = await generate(1) as GeneratedValue;
  const secondAssessment = assessDialogRepeat(second.reply, history);
  if (secondAssessment.repeated) throw new DialogRepeatedReplyError();

  return {
    value: second,
    quality: {
      repeatDetected: true,
      repeatReason: firstAssessment.reason,
      similarityBucket: firstAssessment.bucket,
      regenerationAttempted: true,
      regenerationSucceeded: true,
      gameModeAvailable: true,
    },
  };
}
