import { useCallback, useEffect, useRef, useState } from 'react';

import type { AccountGenerationToken } from '../app/account_generation';
import { readUnifiedLevelSpinStars } from '../app/level_spin_star_grants';
import { readAttemptRestoreGiftCount } from '../app/session_attempts/session_attempt_restore_inventory';
import {
  commitSessionAttemptRecovery,
  hydrateSessionAttemptsState,
  persistSessionAttemptsState,
  recoverPreparedSessionAttemptRecoveries,
} from '../app/session_attempts/session_attempt_recovery';
import {
  createSessionAttemptsState,
  reduceSessionAttempts,
  type SessionAttemptsEffect,
  type SessionAttemptsStateV1,
  type SessionAttemptVerdict,
} from '../app/session_attempts/session_attempts_domain';

export type UseSessionAttemptsInput = Readonly<{
  token: AccountGenerationToken;
  sessionId: string;
  initialQuestionId: string;
  autoHydrate?: boolean;
  /** Preview/sandbox surfaces may exercise the reducer without learner writes. */
  persistenceEnabled?: boolean;
}>;

export function useSessionAttempts(input: UseSessionAttemptsInput) {
  const [state, setState] = useState<SessionAttemptsStateV1>(() => createSessionAttemptsState({
    sessionId: input.sessionId,
    questionId: input.initialQuestionId,
  }));
  const stateRef = useRef(state);
  const sessionIdRef = useRef(input.sessionId);
  const [lossSequence, setLossSequence] = useState(0);
  const [giftCount, setGiftCount] = useState(0);
  const [runeBalance, setRuneBalance] = useState<number | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [recoveryBusy, setRecoveryBusy] = useState(false);
  const recoveryBusyRef = useRef(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);

  const adoptState = useCallback((next: SessionAttemptsStateV1): void => {
    stateRef.current = next;
    setState(next);
  }, []);

  const persist = useCallback((next: SessionAttemptsStateV1): void => {
    if (input.persistenceEnabled === false) return;
    void persistSessionAttemptsState(input.token, next).catch(() => {
      // The active screen keeps its local reducer state. Remount recovery stays
      // fail-closed and never invents a resource debit.
    });
  }, [input.persistenceEnabled, input.token]);

  useEffect(() => {
    if (sessionIdRef.current === input.sessionId) return;
    sessionIdRef.current = input.sessionId;
    const next = createSessionAttemptsState({
      sessionId: input.sessionId,
      questionId: input.initialQuestionId,
    });
    adoptState(next);
    setLossSequence(0);
    setGiftCount(0);
    setRuneBalance(null);
    setHydrated(false);
    setRecoveryBusy(false);
    recoveryBusyRef.current = false;
    setRecoveryError(null);
  }, [adoptState, input.initialQuestionId, input.sessionId]);

  const refreshResources = useCallback(async (): Promise<void> => {
    const [nextGiftCount, stars] = await Promise.all([
      readAttemptRestoreGiftCount(input.token),
      readUnifiedLevelSpinStars(input.token),
    ]);
    setGiftCount(nextGiftCount);
    setRuneBalance(stars.balance);
  }, [input.token]);

  const hydrate = useCallback(async (): Promise<void> => {
    setRecoveryError(null);
    if (input.persistenceEnabled === false) {
      setHydrated(true);
      return;
    }
    try {
      await recoverPreparedSessionAttemptRecoveries(input.token);
      const [stored] = await Promise.all([
        hydrateSessionAttemptsState(input.token, input.sessionId),
        refreshResources(),
      ]);
      if (stored) adoptState(stored);
    } catch (error) {
      setRecoveryError(error instanceof Error ? error.message : 'session_attempts_hydrate_failed');
    } finally {
      setHydrated(true);
    }
  }, [adoptState, input.persistenceEnabled, input.sessionId, input.token, refreshResources]);

  useEffect(() => {
    if (input.autoHydrate === false) {
      setHydrated(true);
      return;
    }
    void hydrate();
  }, [hydrate, input.autoHydrate]);

  const registerVerdict = useCallback((verdictInput: Readonly<{
    answerAttemptId: string;
    verdict: SessionAttemptVerdict;
  }>): SessionAttemptsEffect => {
    const transition = reduceSessionAttempts(stateRef.current, {
      type: 'verdict',
      answerAttemptId: verdictInput.answerAttemptId,
      verdict: verdictInput.verdict,
    });
    if (transition.state !== stateRef.current) {
      adoptState(transition.state);
      persist(transition.state);
    }
    if (transition.effect === 'attempt_consumed' || transition.effect === 'attempts_exhausted') {
      setLossSequence((current) => current + 1);
    }
    return transition.effect;
  }, [adoptState, persist]);

  const updateQuestion = useCallback((questionId: string): SessionAttemptsEffect => {
    const transition = reduceSessionAttempts(stateRef.current, { type: 'question_changed', questionId });
    if (transition.state !== stateRef.current) {
      adoptState(transition.state);
      persist(transition.state);
    }
    return transition.effect;
  }, [adoptState, persist]);

  const recover = useCallback(async (source: 'gift' | 'runes'): Promise<void> => {
    if (recoveryBusyRef.current) return;
    recoveryBusyRef.current = true;
    setRecoveryBusy(true);
    setRecoveryError(null);
    try {
      const result = await commitSessionAttemptRecovery({
        source,
        token: input.token,
        sessionState: stateRef.current,
      });
      adoptState(result.attemptsState);
      await refreshResources();
    } catch (error) {
      setRecoveryError(error instanceof Error ? error.message : 'session_attempt_recovery_failed');
      throw error;
    } finally {
      recoveryBusyRef.current = false;
      setRecoveryBusy(false);
    }
  }, [adoptState, input.token, refreshResources]);

  const recoverWithGift = useCallback(() => recover('gift'), [recover]);
  const recoverWithRunes = useCallback(() => recover('runes'), [recover]);

  const endAttemptsSession = useCallback((): SessionAttemptsEffect => {
    const transition = reduceSessionAttempts(stateRef.current, { type: 'end_session' });
    if (transition.state !== stateRef.current) {
      adoptState(transition.state);
      persist(transition.state);
    }
    return transition.effect;
  }, [adoptState, persist]);

  return Object.freeze({
    state,
    lossSequence,
    giftCount,
    runeBalance,
    hydrated,
    recoveryBusy,
    recoveryError,
    registerVerdict,
    updateQuestion,
    recoverWithGift,
    recoverWithRunes,
    endAttemptsSession,
    hydrate,
  });
}

export default useSessionAttempts;
