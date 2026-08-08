import type { LevelExamLevel } from './level_exam_types';
import type { SourceLocale } from './source_locales';

export type PersistedLevelExamAnswer =
  | { kind: 'choice'; optionId: string }
  | { kind: 'translate_build'; tokenIds: string[] }
  | { kind: 'speed_match'; targetScoreUnitId: string }
  | { kind: 'skipped' };

export type LevelExamFinishReason = 'submitted' | 'timeout';

export type LevelExamAttemptSnapshot = {
  schemaVersion: 2;
  ownerStableUid: string;
  attemptId: string;
  finishToken: string;
  level: LevelExamLevel;
  studyTarget: 'en';
  sourceLocale: SourceLocale;
  blueprintVersion: 3;
  seed: string;
  orderedTaskIds: string[];
  scoredUnitIds: string[];
  answers: Record<string, PersistedLevelExamAnswer>;
  currentTaskIndex: number;
  startedAtMs: number;
  deadlineAtMs: number;
  status: 'active' | 'finishing' | 'completed';
  finishReason?: LevelExamFinishReason;
  finishedAtMs?: number;
};

export type CreateLevelExamAttemptInput = {
  energySpent: boolean;
  ownerStableUid: string;
  startToken: string;
  level: LevelExamLevel;
  studyTarget: 'en';
  sourceLocale: SourceLocale;
  blueprintVersion: 3;
  seed: string;
  orderedTaskIds: string[];
  scoredUnitIds: string[];
  startedAtMs: number;
  durationMs: number;
};

export type RestoreLevelExamAttemptContext = {
  ownerStableUid: string;
  level: LevelExamLevel;
  studyTarget: 'en';
  sourceLocale: SourceLocale;
  blueprintVersion: 3;
  nowMs: number;
};

export type RestoreLevelExamAttemptDecision =
  | { kind: 'resume'; attempt: LevelExamAttemptSnapshot }
  | { kind: 'finish_timeout'; attempt: LevelExamAttemptSnapshot }
  | { kind: 'finish_pending'; attempt: LevelExamAttemptSnapshot }
  | { kind: 'completed'; attempt: LevelExamAttemptSnapshot }
  | { kind: 'quarantine'; reason: 'invalid_snapshot' | 'owner_mismatch' | 'context_mismatch' | 'blueprint_mismatch' };

function nonEmptyStrings(value: unknown): value is string[] {
  return Array.isArray(value) && value.length > 0
    && value.every((item) => typeof item === 'string' && item.trim() !== '');
}

function finiteInteger(value: unknown, min = 0): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= min;
}

function isPersistedAnswer(value: unknown): value is PersistedLevelExamAnswer {
  if (!value || typeof value !== 'object') return false;
  const answer = value as Partial<PersistedLevelExamAnswer> & Record<string, unknown>;
  if (answer.kind === 'skipped') return true;
  if (answer.kind === 'choice') return typeof answer.optionId === 'string' && answer.optionId.trim() !== '';
  if (answer.kind === 'translate_build') return Array.isArray(answer.tokenIds)
    && answer.tokenIds.every((tokenId) => typeof tokenId === 'string' && tokenId.trim() !== '');
  if (answer.kind === 'speed_match') {
    return typeof answer.targetScoreUnitId === 'string' && answer.targetScoreUnitId.trim() !== '';
  }
  return false;
}

function isAttemptSnapshot(value: unknown): value is LevelExamAttemptSnapshot {
  if (!value || typeof value !== 'object') return false;
  const attempt = value as Partial<LevelExamAttemptSnapshot> & Record<string, unknown>;
  if (attempt.schemaVersion !== 2
    || typeof attempt.ownerStableUid !== 'string' || attempt.ownerStableUid.trim() === ''
    || typeof attempt.attemptId !== 'string' || attempt.attemptId.trim() === ''
    || typeof attempt.finishToken !== 'string' || attempt.finishToken !== `${attempt.attemptId}:finish`
    || !['A1', 'A2', 'B1', 'B2'].includes(String(attempt.level))
    || attempt.studyTarget !== 'en'
    || typeof attempt.sourceLocale !== 'string'
    || attempt.blueprintVersion !== 3
    || typeof attempt.seed !== 'string' || attempt.seed.trim() === ''
    || !nonEmptyStrings(attempt.orderedTaskIds)
    || !nonEmptyStrings(attempt.scoredUnitIds)
    || new Set(attempt.scoredUnitIds).size !== attempt.scoredUnitIds.length
    || !finiteInteger(attempt.currentTaskIndex)
    || attempt.currentTaskIndex > attempt.orderedTaskIds.length
    || !finiteInteger(attempt.startedAtMs)
    || !finiteInteger(attempt.deadlineAtMs)
    || attempt.deadlineAtMs <= attempt.startedAtMs
    || !['active', 'finishing', 'completed'].includes(String(attempt.status))
    || !attempt.answers || typeof attempt.answers !== 'object' || Array.isArray(attempt.answers)) return false;
  const scored = new Set(attempt.scoredUnitIds);
  if (!Object.entries(attempt.answers).every(([scoreUnitId, answer]) => scored.has(scoreUnitId) && isPersistedAnswer(answer))) {
    return false;
  }
  if (attempt.status !== 'active' && attempt.finishReason !== 'submitted' && attempt.finishReason !== 'timeout') {
    return false;
  }
  if (attempt.status === 'completed' && !finiteInteger(attempt.finishedAtMs)) return false;
  return true;
}

export function parseLevelExamAttemptSnapshot(raw: unknown): LevelExamAttemptSnapshot | null {
  return isAttemptSnapshot(raw) ? raw : null;
}

function cloneAnswer(answer: PersistedLevelExamAnswer): PersistedLevelExamAnswer {
  return answer.kind === 'translate_build' ? { ...answer, tokenIds: [...answer.tokenIds] } : { ...answer };
}

export function createLevelExamAttempt(input: CreateLevelExamAttemptInput): LevelExamAttemptSnapshot {
  if (!input.energySpent) throw new Error('level_exam_energy_not_spent');
  if (!input.ownerStableUid.trim() || !input.startToken.trim() || !input.seed.trim()) {
    throw new Error('level_exam_attempt_identity_invalid');
  }
  if (!nonEmptyStrings(input.orderedTaskIds)
    || !nonEmptyStrings(input.scoredUnitIds)
    || new Set(input.scoredUnitIds).size !== input.scoredUnitIds.length
    || !finiteInteger(input.startedAtMs)
    || !finiteInteger(input.durationMs, 1)) {
    throw new Error('level_exam_attempt_input_invalid');
  }
  const attemptId = `level_exam_attempt_v2:${input.ownerStableUid}:${input.level}:${input.startToken}`;
  return {
    schemaVersion: 2,
    ownerStableUid: input.ownerStableUid,
    attemptId,
    finishToken: `${attemptId}:finish`,
    level: input.level,
    studyTarget: input.studyTarget,
    sourceLocale: input.sourceLocale,
    blueprintVersion: input.blueprintVersion,
    seed: input.seed,
    orderedTaskIds: [...input.orderedTaskIds],
    scoredUnitIds: [...input.scoredUnitIds],
    answers: {},
    currentTaskIndex: 0,
    startedAtMs: input.startedAtMs,
    deadlineAtMs: input.startedAtMs + input.durationMs,
    status: 'active',
  };
}

export function applyLevelExamAnswer(
  attempt: LevelExamAttemptSnapshot,
  scoreUnitId: string,
  answer: PersistedLevelExamAnswer,
  currentTaskIndex: number,
): LevelExamAttemptSnapshot {
  if (attempt.status !== 'active') throw new Error('level_exam_attempt_not_active');
  if (!attempt.scoredUnitIds.includes(scoreUnitId)) throw new Error('level_exam_score_unit_unknown');
  if (!isPersistedAnswer(answer)) throw new Error('level_exam_answer_invalid');
  if (!finiteInteger(currentTaskIndex) || currentTaskIndex > attempt.orderedTaskIds.length) {
    throw new Error('level_exam_task_index_invalid');
  }
  return {
    ...attempt,
    answers: { ...attempt.answers, [scoreUnitId]: cloneAnswer(answer) },
    currentTaskIndex,
  };
}

export function remainingLevelExamMs(attempt: LevelExamAttemptSnapshot, nowMs: number): number {
  if (!Number.isFinite(nowMs)) return 0;
  return Math.max(0, attempt.deadlineAtMs - nowMs);
}

export function beginLevelExamQuiz(
  attempt: LevelExamAttemptSnapshot,
  startedAtMs: number,
): LevelExamAttemptSnapshot {
  if (attempt.status !== 'active' || !finiteInteger(startedAtMs) || startedAtMs < attempt.startedAtMs) {
    throw new Error('level_exam_quiz_start_invalid');
  }
  const durationMs = attempt.deadlineAtMs - attempt.startedAtMs;
  return {
    ...attempt,
    startedAtMs,
    deadlineAtMs: startedAtMs + durationMs,
  };
}

export function restoreLevelExamAttempt(
  raw: unknown,
  context: RestoreLevelExamAttemptContext,
): RestoreLevelExamAttemptDecision {
  if (!raw || typeof raw !== 'object') return { kind: 'quarantine', reason: 'invalid_snapshot' };
  const partial = raw as Partial<LevelExamAttemptSnapshot>;
  if (partial.ownerStableUid !== context.ownerStableUid) return { kind: 'quarantine', reason: 'owner_mismatch' };
  if (partial.blueprintVersion !== context.blueprintVersion) {
    return { kind: 'quarantine', reason: 'blueprint_mismatch' };
  }
  if (partial.level !== context.level
    || partial.studyTarget !== context.studyTarget
    || partial.sourceLocale !== context.sourceLocale) {
    return { kind: 'quarantine', reason: 'context_mismatch' };
  }
  if (!isAttemptSnapshot(raw)) return { kind: 'quarantine', reason: 'invalid_snapshot' };
  if (raw.status === 'completed') return { kind: 'completed', attempt: raw };
  if (raw.status === 'finishing') return { kind: 'finish_pending', attempt: raw };
  if (remainingLevelExamMs(raw, context.nowMs) === 0) return { kind: 'finish_timeout', attempt: raw };
  return { kind: 'resume', attempt: raw };
}

export function markLevelExamFinishing(
  attempt: LevelExamAttemptSnapshot,
  reason: LevelExamFinishReason,
): LevelExamAttemptSnapshot {
  if (attempt.status !== 'active') return attempt;
  return { ...attempt, status: 'finishing', finishReason: reason };
}

export function completeLevelExamAttempt(
  attempt: LevelExamAttemptSnapshot,
  finishedAtMs: number,
): LevelExamAttemptSnapshot {
  if (attempt.status === 'completed') return attempt;
  if (!finiteInteger(finishedAtMs) || finishedAtMs < attempt.startedAtMs) {
    throw new Error('level_exam_finished_at_invalid');
  }
  const finishing = attempt.status === 'finishing'
    ? attempt
    : markLevelExamFinishing(attempt, remainingLevelExamMs(attempt, finishedAtMs) === 0 ? 'timeout' : 'submitted');
  return { ...finishing, status: 'completed', finishedAtMs };
}
