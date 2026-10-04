import { useCallback, useEffect, useRef, useState } from 'react';

import type { AccountGenerationToken } from '../app/account_generation';
import { readUnifiedLevelSpinStars } from '../app/level_spin_star_grants';
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
import { noteSwallowedHandler } from '../app/swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее

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
  const [runeBalance, setRuneBalance] = useState<number | null>(null);
  const [hydrated, setHydrated] = useState(false);
  /**
   * Достоверно ли прочитано состояние попыток и ресурсов.
   *
   * зачем (D09/D148, 04.10): подарки убраны, остался один способ вернуть сердечки — сжечь руны сессии. Флаг остался, потому что
   * по-прежнему нужен: `hydrated` отвечает на вопрос «можно ли уже действовать» (экран обязан ожить даже после сбоя), а этот флаг —
   * «можно ли верить прочитанному». При недостоверном чтении («не знаем») попытки возвращаем, но руны сессии не сжигаем.
   */
  const [hydrationTrusted, setHydrationTrusted] = useState(false);
  const [recoveryBusy, setRecoveryBusy] = useState(false);
  const recoveryBusyRef = useRef(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);

  const adoptState = useCallback((next: SessionAttemptsStateV1): void => {
    stateRef.current = next;
    setState(next);
  }, []);

  const persist = useCallback((next: SessionAttemptsStateV1): void => {
    if (input.persistenceEnabled === false) return;
    // The active screen keeps its local reducer state. Remount recovery stays
    // fail-closed and never invents a resource debit. PM-229: the failure reason is logged.
    void persistSessionAttemptsState(input.token, next).catch(noteSwallowedHandler('useSessionAttempts:promise_1'));
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
    setRuneBalance(null);
    setHydrated(false);
    setRecoveryBusy(false);
    recoveryBusyRef.current = false;
    setRecoveryError(null);
  }, [adoptState, input.initialQuestionId, input.sessionId]);

  const refreshResources = useCallback(async (): Promise<void> => {
    const stars = await readUnifiedLevelSpinStars(input.token);
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
      /**
       * зачем (владелец 2026-09-15): сердечки обязаны держаться до конца
       * занятия — потратил два, вышел, вернулся в ТО ЖЕ занятие, там одно.
       * Но ЗАВЕРШЁННОЕ занятие восстанавливать нельзя: из фазы 'ended' у
       * редьюсера нет выхода (verdict требует 'active', восстановление —
       * 'awaiting_recovery'), и экран залип бы навсегда. Раньше это было
       * невозможно только потому, что ключ содержал случайное число и
       * сохранённое состояние вообще никогда не читалось. Сделав ключ
       * стабильным, мы обязаны закрыть и эту дверь — здесь, в одной точке,
       * а не на каждом из девяти экранов.
       */
      if (stored && stored.phase !== 'ended') adoptState(stored);
      // Состояние прочитано без сбоя — только теперь ему можно верить.
      setHydrationTrusted(true);
    } catch (error) {
      /*
       * зачем (аудит 2026-09-03): при сбое чтения это НЕ значит «ресурсов нет» — значит «мы не знаем». Автосброс не должен принимать
       * незнание за отсутствие и СЖИГАТЬ заработанные за сессию руны.
       *
       * `hydrated` при этом поднимается всё равно (ниже, в `finally`): экран обязан ожить, иначе вернётся то самое зависание.
       * Разницу несёт отдельный флаг достоверности.
       */
      setHydrationTrusted(false);
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

  const recover = useCallback(async (source: 'runes'): Promise<void> => {
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

  const recoverWithRunes = useCallback(() => recover('runes'), [recover]);

  const restoreAfterSessionRuneForfeit = useCallback((): SessionAttemptsEffect => {
    const transition = reduceSessionAttempts(stateRef.current, {
      type: 'restore_after_session_rune_forfeit',
    });
    if (transition.state !== stateRef.current) {
      adoptState(transition.state);
      persist(transition.state);
    }
    return transition.effect;
  }, [adoptState, persist]);

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
    runeBalance,
    hydrated,
    hydrationTrusted,
    recoveryBusy,
    recoveryError,
    registerVerdict,
    updateQuestion,
    recoverWithRunes,
    restoreAfterSessionRuneForfeit,
    endAttemptsSession,
    hydrate,
  });
}

export default useSessionAttempts;
