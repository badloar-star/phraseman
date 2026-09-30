/**
 * Persisted server-owned state for one account's daily bot-voice slot.
 *
 * The caller MUST read this state, apply this transition, and write nextState
 * in one Firestore transaction. Never construct trustedAccountState from
 * client request data; it must come from the authenticated account-scoped
 * server document read by that transaction.
 *
 * This module deliberately does not decide reply text or prepared-audio
 * eligibility and performs no Firestore, TTS, OpenAI, or network work.
 */
export interface DialogueV2BotVoiceDailyClaimState {
  readonly dayKey: string;
  readonly claimedCount: number;
  readonly claimedRequestId: string | null;
  readonly claimedOperationFingerprint: string | null;
}

export interface DialogueV2BotVoiceDailyClaimInput {
  readonly nowMs: number;
  readonly requestId: string;
  readonly operationFingerprint: string;
  readonly trustedAccountState: DialogueV2BotVoiceDailyClaimState | null;
}

export type DialogueV2BotVoiceDailyClaimResult =
  | {
      readonly kind: 'first_claim';
      readonly dayKey: string;
      readonly nextState: DialogueV2BotVoiceDailyClaimState;
    }
  | {
      readonly kind: 'replay';
      readonly dayKey: string;
      readonly nextState: DialogueV2BotVoiceDailyClaimState;
    }
  | {
      readonly kind: 'daily_slot_already_claimed';
      readonly dayKey: string;
      readonly nextState: DialogueV2BotVoiceDailyClaimState;
    };

const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;
const REQUEST_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;
const OPERATION_FINGERPRINT_RE = /^[a-f0-9]{64}$/;

function isCanonicalUtcDayKey(dayKey: string): boolean {
  if (!DAY_KEY_RE.test(dayKey)) return false;

  const parsedMs = Date.parse(`${dayKey}T00:00:00.000Z`);
  return Number.isFinite(parsedMs)
    && new Date(parsedMs).toISOString().slice(0, 10) === dayKey;
}

export function dialogueV2BotVoiceUtcDayKey(nowMs: number): string {
  if (!Number.isSafeInteger(nowMs) || nowMs < 0) {
    throw new Error('invalid_dialogue_v2_bot_voice_claim_time');
  }

  try {
    return new Date(nowMs).toISOString().slice(0, 10);
  } catch {
    throw new Error('invalid_dialogue_v2_bot_voice_claim_time');
  }
}

function validateRequestId(requestId: string): void {
  if (!REQUEST_ID_RE.test(requestId)) {
    throw new Error('invalid_dialogue_v2_bot_voice_request_id');
  }
}

function validateTrustedState(state: DialogueV2BotVoiceDailyClaimState): void {
  const validCount = Number.isSafeInteger(state.claimedCount)
    && state.claimedCount >= 0
    && state.claimedCount <= 1;
  const validRequest = state.claimedCount === 0
    ? state.claimedRequestId === null && state.claimedOperationFingerprint === null
    : typeof state.claimedRequestId === 'string'
      && REQUEST_ID_RE.test(state.claimedRequestId)
      && typeof state.claimedOperationFingerprint === 'string'
      && OPERATION_FINGERPRINT_RE.test(state.claimedOperationFingerprint);

  if (!isCanonicalUtcDayKey(state.dayKey) || !validCount || !validRequest) {
    throw new Error('invalid_dialogue_v2_bot_voice_daily_state');
  }
}

function firstClaim(
  dayKey: string,
  requestId: string,
  operationFingerprint: string,
): DialogueV2BotVoiceDailyClaimResult {
  return {
    kind: 'first_claim',
    dayKey,
    nextState: {
      dayKey,
      claimedCount: 1,
      claimedRequestId: requestId,
      claimedOperationFingerprint: operationFingerprint,
    },
  };
}

export function transitionDialogueV2BotVoiceDailyClaim(
  input: DialogueV2BotVoiceDailyClaimInput,
): DialogueV2BotVoiceDailyClaimResult {
  const dayKey = dialogueV2BotVoiceUtcDayKey(input.nowMs);
  validateRequestId(input.requestId);
  if (!OPERATION_FINGERPRINT_RE.test(input.operationFingerprint)) {
    throw new Error('invalid_dialogue_v2_bot_voice_operation_fingerprint');
  }

  const current = input.trustedAccountState;
  if (current === null) return firstClaim(dayKey, input.requestId, input.operationFingerprint);

  validateTrustedState(current);
  if (current.dayKey > dayKey) {
    throw new Error('invalid_dialogue_v2_bot_voice_daily_state');
  }
  if (current.dayKey < dayKey || current.claimedCount === 0) {
    return firstClaim(dayKey, input.requestId, input.operationFingerprint);
  }

  if (current.claimedRequestId === input.requestId
    && current.claimedOperationFingerprint === input.operationFingerprint) {
    return { kind: 'replay', dayKey, nextState: current };
  }

  return { kind: 'daily_slot_already_claimed', dayKey, nextState: current };
}
