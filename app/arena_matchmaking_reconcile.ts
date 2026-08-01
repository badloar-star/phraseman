export type ArenaReconcileInput = {
  authoritativeSessionId: string | null;
  searchStillAuthoritative: boolean;
  rangeExpandDue: boolean;
  rangeExpanded: boolean;
  botFallbackDue: boolean;
  timeoutDue: boolean;
};

export type ArenaReconcileDecision =
  | { kind: 'match'; sessionId: string }
  | { kind: 'expand_range' | 'bot_fallback' | 'timeout' | 'stop' | 'none' };

export function decideArenaReconcile(input: ArenaReconcileInput): ArenaReconcileDecision {
  if (input.authoritativeSessionId) {
    return { kind: 'match', sessionId: input.authoritativeSessionId };
  }
  if (!input.searchStillAuthoritative) return { kind: 'stop' };
  if (input.rangeExpandDue && !input.rangeExpanded) return { kind: 'expand_range' };
  if (input.botFallbackDue) return { kind: 'bot_fallback' };
  if (input.timeoutDue) return { kind: 'timeout' };
  return { kind: 'none' };
}
