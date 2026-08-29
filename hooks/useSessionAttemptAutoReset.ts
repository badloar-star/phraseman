import { useEffect, useRef } from 'react';

import type { SessionAttemptsPhase } from '../app/session_attempts/session_attempts_domain';

type Input = Readonly<{
  phase: SessionAttemptsPhase;
  /** Persists clearing unclaimed runes belonging only to this session. */
  forfeitSessionRunes?: () => Promise<void> | void;
  /** Restores the three hearts without a gift or wallet operation. */
  restoreAttempts: () => void;
  /** Re-enables the current card/activity after the state becomes active. */
  onRestored?: () => void;
}>;

/**
 * Converts the old zero-heart recovery stop into an automatic local retry.
 *
 * The rune buffer is awaited first so closing and reopening the session cannot
 * resurrect unclaimed runes. A storage failure still must not strand the
 * learner behind a modal: the buffer has already been cleared in memory, the
 * hearts return, and the next mount retries persistence through its own buffer.
 */
export function useSessionAttemptAutoReset({
  phase,
  forfeitSessionRunes,
  restoreAttempts,
  onRestored,
}: Input): void {
  const handlingRef = useRef(false);
  const callbacksRef = useRef({ forfeitSessionRunes, restoreAttempts, onRestored });
  callbacksRef.current = { forfeitSessionRunes, restoreAttempts, onRestored };

  useEffect(() => {
    if (phase !== 'awaiting_recovery' || handlingRef.current) return;
    handlingRef.current = true;
    let cancelled = false;

    const callbacks = callbacksRef.current;
    void Promise.resolve(callbacks.forfeitSessionRunes?.()).catch(() => {
      // Never replace a completed learning action with the retired recovery
      // modal. The local rune state has already been cleared before storage.
    }).finally(() => {
      if (cancelled) return;
      callbacks.restoreAttempts();
      callbacks.onRestored?.();
      handlingRef.current = false;
    });

    return () => { cancelled = true; };
  }, [phase]);
}

export default useSessionAttemptAutoReset;
