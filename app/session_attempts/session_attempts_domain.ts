export const SESSION_ATTEMPTS_MAX = 3 as const;
export const SESSION_ATTEMPT_RUNE_COST = 25 as const;
export const ATTEMPT_RESTORE_GIFT_ID = 'attempt_restore_all' as const;

const MAX_PROCESSED_ANSWER_ATTEMPT_IDS = 256;
const MAX_RECOVERY_RECEIPT_IDS = 64;
const MAX_STABLE_ID_LENGTH = 256;

export type SessionAttemptsPhase = 'active' | 'awaiting_recovery' | 'ended';
export type SessionAttemptVerdict =
  | 'correct'
  | 'pedagogical_wrong'
  | 'no_speech'
  | 'technical_error'
  | 'cancelled';
export type SessionAttemptsRemaining = 0 | 1 | 2 | 3;

export type SessionAttemptsStateV1 = Readonly<{
  schemaVersion: 'session-attempts-state.v1';
  sessionId: string;
  questionId: string;
  maxAttempts: 3;
  remainingAttempts: SessionAttemptsRemaining;
  phase: SessionAttemptsPhase;
  recoveryOrdinal: number;
  processedAnswerAttemptIds: readonly string[];
  recoveryReceiptIds: readonly string[];
}>;

export type SessionAttemptsEvent =
  | Readonly<{
    type: 'verdict';
    answerAttemptId: string;
    verdict: SessionAttemptVerdict;
  }>
  | Readonly<{ type: 'question_changed'; questionId: string }>
  | Readonly<{ type: 'recover_all'; recoveryReceiptId: string }>
  /** Экран уже сжёг только временную копилку рун текущей сессии. */
  | Readonly<{ type: 'restore_after_session_rune_forfeit' }>
  | Readonly<{ type: 'end_session' }>;

export type SessionAttemptsEffect =
  | 'none'
  | 'attempt_consumed'
  | 'attempts_exhausted'
  | 'attempts_restored'
  | 'session_ended';

export type SessionAttemptsTransition = Readonly<{
  state: SessionAttemptsStateV1;
  effect: SessionAttemptsEffect;
}>;

function stableId(value: string): string {
  const normalized = value.trim();
  if (
    normalized.length === 0
    || normalized.length > MAX_STABLE_ID_LENGTH
    || /[\u0000-\u001F\u007F]/u.test(normalized)
  ) {
    throw new Error('session_attempts_id_invalid');
  }
  return normalized;
}
function boundedAppend(
  values: readonly string[],
  value: string,
  limit: number,
): readonly string[] {
  const next = [...values, value];
  return Object.freeze(next.length > limit ? next.slice(next.length - limit) : next);
}

function freezeState(
  state: Omit<SessionAttemptsStateV1, 'processedAnswerAttemptIds' | 'recoveryReceiptIds'>
  & Readonly<{
    processedAnswerAttemptIds: readonly string[];
    recoveryReceiptIds: readonly string[];
  }>,
): SessionAttemptsStateV1 {
  return Object.freeze({
    ...state,
    processedAnswerAttemptIds: Object.freeze([...state.processedAnswerAttemptIds]),
    recoveryReceiptIds: Object.freeze([...state.recoveryReceiptIds]),
  });
}

function transition(
  state: SessionAttemptsStateV1,
  effect: SessionAttemptsEffect = 'none',
): SessionAttemptsTransition {
  return Object.freeze({ state, effect });
}

export function createSessionAttemptsState(input: Readonly<{
  sessionId: string;
  questionId: string;
}>): SessionAttemptsStateV1 {
  return freezeState({
    schemaVersion: 'session-attempts-state.v1',
    sessionId: stableId(input.sessionId),
    questionId: stableId(input.questionId),
    maxAttempts: SESSION_ATTEMPTS_MAX,
    remainingAttempts: SESSION_ATTEMPTS_MAX,
    phase: 'active',
    recoveryOrdinal: 0,
    processedAnswerAttemptIds: [],
    recoveryReceiptIds: [],
  });
}

export function reduceSessionAttempts(
  state: SessionAttemptsStateV1,
  event: SessionAttemptsEvent,
): SessionAttemptsTransition {
  if (event.type === 'end_session') {
    if (state.phase === 'ended') return transition(state);
    return transition(freezeState({ ...state, phase: 'ended' }), 'session_ended');
  }

  if (event.type === 'question_changed') {
    const questionId = stableId(event.questionId);
    if (state.phase === 'ended' || questionId === state.questionId) return transition(state);
    return transition(freezeState({ ...state, questionId }));
  }

  if (event.type === 'recover_all') {
    const recoveryReceiptId = stableId(event.recoveryReceiptId);
    if (state.recoveryReceiptIds.includes(recoveryReceiptId)) return transition(state);
    if (state.phase !== 'awaiting_recovery' || state.remainingAttempts !== 0) {
      return transition(state);
    }
    return transition(freezeState({
      ...state,
      remainingAttempts: SESSION_ATTEMPTS_MAX,
      phase: 'active',
      recoveryOrdinal: state.recoveryOrdinal + 1,
      recoveryReceiptIds: boundedAppend(
        state.recoveryReceiptIds,
        recoveryReceiptId,
        MAX_RECOVERY_RECEIPT_IDS,
      ),
    }), 'attempts_restored');
  }

  if (event.type === 'restore_after_session_rune_forfeit') {
    if (state.phase !== 'awaiting_recovery' || state.remainingAttempts !== 0) {
      return transition(state);
    }
    return transition(freezeState({
      ...state,
      remainingAttempts: SESSION_ATTEMPTS_MAX,
      phase: 'active',
      recoveryOrdinal: state.recoveryOrdinal + 1,
    }), 'attempts_restored');
  }

  const answerAttemptId = stableId(event.answerAttemptId);
  if (
    state.phase !== 'active'
    || state.processedAnswerAttemptIds.includes(answerAttemptId)
  ) {
    return transition(state);
  }

  const processedAnswerAttemptIds = boundedAppend(
    state.processedAnswerAttemptIds,
    answerAttemptId,
    MAX_PROCESSED_ANSWER_ATTEMPT_IDS,
  );
  if (event.verdict !== 'pedagogical_wrong') {
    return transition(freezeState({ ...state, processedAnswerAttemptIds }));
  }

  const remainingAttempts = (state.remainingAttempts - 1) as SessionAttemptsRemaining;
  const exhausted = remainingAttempts === 0;
  return transition(freezeState({
    ...state,
    processedAnswerAttemptIds,
    remainingAttempts,
    phase: exhausted ? 'awaiting_recovery' : 'active',
  }), exhausted ? 'attempts_exhausted' : 'attempt_consumed');
}
