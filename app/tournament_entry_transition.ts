type TournamentEntryTransition = {
  state: 'pending' | 'cancelled' | 'advanced';
  createdAtMs: number;
  onCancel?: () => void;
};

const ENTRY_TRANSITION_TTL_MS = 2 * 60 * 1000;
const MAX_ENTRY_TRANSITIONS = 8;
const entryTransitions = new Map<string, TournamentEntryTransition>();
let entryTransitionSequence = 0;

function pruneTournamentEntryTransitions(nowMs: number): void {
  for (const [key, transition] of entryTransitions) {
    if (nowMs - transition.createdAtMs > ENTRY_TRANSITION_TTL_MS) {
      entryTransitions.delete(key);
    }
  }
  while (entryTransitions.size >= MAX_ENTRY_TRANSITIONS) {
    const oldestKey = entryTransitions.keys().next().value as string | undefined;
    if (!oldestKey) break;
    entryTransitions.delete(oldestKey);
  }
}

export function beginTournamentEntryTransition(onCancel?: () => void): string {
  const nowMs = Date.now();
  pruneTournamentEntryTransitions(nowMs);
  entryTransitionSequence = (entryTransitionSequence + 1) % Number.MAX_SAFE_INTEGER;
  const key = `entry-${nowMs.toString(36)}-${entryTransitionSequence.toString(36)}`;
  entryTransitions.set(key, { state: 'pending', createdAtMs: nowMs, onCancel });
  return key;
}

export function cancelTournamentEntryTransition(key: string): boolean {
  const transition = entryTransitions.get(key);
  if (!transition || transition.state !== 'pending') return false;
  transition.state = 'cancelled';
  const onCancel = transition.onCancel;
  transition.onCancel = undefined;
  onCancel?.();
  return true;
}

/** Records that the provisional lobby already handed this entry to a live route. */
export function markTournamentEntryTransitionAdvanced(key: string): boolean {
  const transition = entryTransitions.get(key);
  if (!transition || transition.state !== 'pending') return false;
  transition.state = 'advanced';
  transition.onCancel = undefined;
  return true;
}

export function settleTournamentEntryTransition(
  key: string,
): 'active' | 'cancelled' | 'advanced' | 'missing' {
  const transition = entryTransitions.get(key);
  if (!transition) return 'missing';
  entryTransitions.delete(key);
  if (transition.state === 'cancelled') return 'cancelled';
  if (transition.state === 'advanced') return 'advanced';
  return 'active';
}
