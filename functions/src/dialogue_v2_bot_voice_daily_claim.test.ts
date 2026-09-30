import {
  dialogueV2BotVoiceUtcDayKey,
  transitionDialogueV2BotVoiceDailyClaim,
  type DialogueV2BotVoiceDailyClaimState,
} from './dialogue_v2_bot_voice_daily_claim';

const NOW_MS = Date.UTC(2026, 8, 26, 12, 0, 0);
const OPERATION_FINGERPRINT = 'a'.repeat(64);

function state(
  overrides: Partial<DialogueV2BotVoiceDailyClaimState> = {},
): DialogueV2BotVoiceDailyClaimState {
  return {
    dayKey: '2026-09-26',
    claimedCount: 1,
    claimedRequestId: 'voice-request-1',
    claimedOperationFingerprint: OPERATION_FINGERPRINT,
    ...overrides,
  };
}

describe('dialogue V2 bot voice daily claim transition', () => {
  it('derives the calendar key strictly in UTC', () => {
    expect(dialogueV2BotVoiceUtcDayKey(Date.UTC(2026, 8, 26, 23, 59, 59, 999)))
      .toBe('2026-09-26');
    expect(dialogueV2BotVoiceUtcDayKey(Date.UTC(2026, 8, 27, 0, 0, 0)))
      .toBe('2026-09-27');
  });

  it('claims the first slot and returns the state the transaction must write', () => {
    expect(transitionDialogueV2BotVoiceDailyClaim({
      nowMs: NOW_MS,
      requestId: 'voice-request-1',
      operationFingerprint: OPERATION_FINGERPRINT,
      trustedAccountState: null,
    })).toEqual({
      kind: 'first_claim',
      dayKey: '2026-09-26',
      nextState: state(),
    });
  });

  it('returns an idempotent replay for the same request without incrementing', () => {
    const current = state();

    expect(transitionDialogueV2BotVoiceDailyClaim({
      nowMs: NOW_MS,
      requestId: 'voice-request-1',
      operationFingerprint: OPERATION_FINGERPRINT,
      trustedAccountState: current,
    })).toEqual({
      kind: 'replay',
      dayKey: '2026-09-26',
      nextState: current,
    });
  });

  it('rejects a different request after the daily slot was claimed', () => {
    const current = state();

    expect(transitionDialogueV2BotVoiceDailyClaim({
      nowMs: NOW_MS,
      requestId: 'voice-request-2',
      operationFingerprint: OPERATION_FINGERPRINT,
      trustedAccountState: current,
    })).toEqual({
      kind: 'daily_slot_already_claimed',
      dayKey: '2026-09-26',
      nextState: current,
    });
  });

  it('opens a fresh slot on the next UTC day', () => {
    expect(transitionDialogueV2BotVoiceDailyClaim({
      nowMs: Date.UTC(2026, 8, 27, 0, 0, 0),
      requestId: 'voice-request-2',
      operationFingerprint: OPERATION_FINGERPRINT,
      trustedAccountState: state(),
    })).toEqual({
      kind: 'first_claim',
      dayKey: '2026-09-27',
      nextState: {
        dayKey: '2026-09-27',
        claimedCount: 1,
        claimedRequestId: 'voice-request-2',
        claimedOperationFingerprint: OPERATION_FINGERPRINT,
      },
    });
  });

  it.each([-1, 1.5, 2, Number.MAX_SAFE_INTEGER + 1, Number.NaN])(
    'fails closed for an unsafe persisted count: %p',
    (claimedCount) => {
      expect(() => transitionDialogueV2BotVoiceDailyClaim({
        nowMs: NOW_MS,
        requestId: 'voice-request-2',
        operationFingerprint: OPERATION_FINGERPRINT,
        trustedAccountState: state({ claimedCount }),
      })).toThrow('invalid_dialogue_v2_bot_voice_daily_state');
    },
  );

  it('fails closed when a claimed state has no matching request id', () => {
    expect(() => transitionDialogueV2BotVoiceDailyClaim({
      nowMs: NOW_MS,
      requestId: 'voice-request-2',
      operationFingerprint: OPERATION_FINGERPRINT,
      trustedAccountState: state({ claimedRequestId: null }),
    })).toThrow('invalid_dialogue_v2_bot_voice_daily_state');
  });

  it('fails closed for an impossible persisted UTC calendar date', () => {
    expect(() => transitionDialogueV2BotVoiceDailyClaim({
      nowMs: NOW_MS,
      requestId: 'voice-request-2',
      operationFingerprint: OPERATION_FINGERPRINT,
      trustedAccountState: state({ dayKey: '2026-99-99' }),
    })).toThrow('invalid_dialogue_v2_bot_voice_daily_state');
  });

  it('fails closed instead of rolling a future persisted day backwards', () => {
    expect(() => transitionDialogueV2BotVoiceDailyClaim({
      nowMs: NOW_MS,
      requestId: 'voice-request-2',
      operationFingerprint: OPERATION_FINGERPRINT,
      trustedAccountState: state({ dayKey: '2026-09-27' }),
    })).toThrow('invalid_dialogue_v2_bot_voice_daily_state');
  });

  it('rejects invalid trusted-server transition inputs', () => {
    expect(() => dialogueV2BotVoiceUtcDayKey(Number.NaN))
      .toThrow('invalid_dialogue_v2_bot_voice_claim_time');
    expect(() => transitionDialogueV2BotVoiceDailyClaim({
      nowMs: NOW_MS,
      requestId: '  ',
      operationFingerprint: OPERATION_FINGERPRINT,
      trustedAccountState: null,
    })).toThrow('invalid_dialogue_v2_bot_voice_request_id');
  });

  it('does not replay the same request id for another operation fingerprint', () => {
    const current = state();
    expect(transitionDialogueV2BotVoiceDailyClaim({
      nowMs: NOW_MS,
      requestId: 'voice-request-1',
      operationFingerprint: 'b'.repeat(64),
      trustedAccountState: current,
    })).toEqual({
      kind: 'daily_slot_already_claimed',
      dayKey: '2026-09-26',
      nextState: current,
    });
  });

  it('rejects a malformed server operation fingerprint', () => {
    expect(() => transitionDialogueV2BotVoiceDailyClaim({
      nowMs: NOW_MS,
      requestId: 'voice-request-1',
      operationFingerprint: 'caller-controlled',
      trustedAccountState: null,
    })).toThrow('invalid_dialogue_v2_bot_voice_operation_fingerprint');
  });
});
