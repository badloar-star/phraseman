export type DialogueReplyMode = 'scenario' | 'companion';
export type DialogueReplyAccessDecision = 'allow' | 'plus_required';

/**
 * Free accounts receive the ranked-scenario monthly allowance. The open-ended
 * companion is a separate Plus entitlement and must be rejected server-side,
 * even when an old client calls the endpoint directly.
 */
export function dialogueReplyAccessDecision(
  mode: DialogueReplyMode,
  isPremium: boolean,
): DialogueReplyAccessDecision {
  return mode === 'companion' && !isPremium ? 'plus_required' : 'allow';
}
