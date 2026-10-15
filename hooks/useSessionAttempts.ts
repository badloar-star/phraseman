import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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
import { chargesEnergyOnMistake, energyActivityForAttemptsSessionId, useEnergyMode } from '../app/energy_mode';
import { createEnergySessionIntent } from '../app/energy_session_operation_ledger';
import { useEnergy } from '../components/EnergyContext';

/** Вердикт, пришедший до гидратации: привязан к занятию и поколению аккаунта, чтобы ответы урока A не списали сердца урока B. */
type QueuedVerdict = Readonly<{
  answerAttemptId: string;
  verdict: SessionAttemptVerdict;
  sessionId: string;
  accountGeneration: number;
}>;

/**
 * Потолок гидратации сердец.
 * зачем (Ревизор 2.80, 15.10): если чтение восстановления/кошелька повиснет, все вердикты остались бы в очереди, а сердца — 3/3. После потолка
 * экран оживает (`hydrated=true`), но прочитанному не верим (`hydrationTrusted=false`) — руны сессии не сжигаются; поздний ответ отбрасывается.
 */
export const SESSION_ATTEMPTS_HYDRATE_CEILING_MS = 3000;

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

  // зачем (владелец 11.10, режим энергии Б): ошибка снимает 1 энергию вместо сердечка; на последней энергии занятие
  // останавливается (фаза stopped_no_energy). Решение принимается здесь, в одной точке, — 10 экранов не правятся.
  const energyContext = useEnergy();
  const energyRef = useRef(energyContext);
  energyRef.current = energyContext;
  const liveEnergyMode = useEnergyMode();
  // зачем (ревью Opus 11.10): режим фиксируется на занятие. Переключение в админке посреди занятия не делает остаток
  // бесплатным (Б→А) и не берёт двойную плату (А→Б): новый режим действует со следующего занятия.
  const sessionEnergyModeRef = useRef<{ sessionId: string; mode: typeof liveEnergyMode } | null>(null);
  if (sessionEnergyModeRef.current?.sessionId !== input.sessionId) {
    sessionEnergyModeRef.current = { sessionId: input.sessionId, mode: liveEnergyMode };
  }
  const energyMode = sessionEnergyModeRef.current.mode;
  const energyActivity = useMemo(() => energyActivityForAttemptsSessionId(input.sessionId), [input.sessionId]);
  const mistakeChargeActive = energyActivity !== null && chargesEnergyOnMistake(energyActivity, energyMode);
  const [energyLossSeq, setEnergyLossSeq] = useState(0);
  // зачем (ревью Opus 11.10): энергия в контексте уменьшается только после записи в журнал. Две быстрые ошибки при
  // энергии 2 обе считались «не последней». Считаем ещё не записанные списания сами.
  const pendingMistakeSpendsRef = useRef(0);

  const pendingVerdictsRef = useRef<QueuedVerdict[]>([]);
  /** Состояние до первой проекции очереди — база для честного повтора, если сохранённого состояния нет. */
  const queuedBaseRef = useRef<SessionAttemptsStateV1 | null>(null);
  /** Номер прогона гидратации: поздний ответ прошлого прогона (смена занятия, потолок) не трогает текущее состояние. */
  const hydrateRunRef = useRef(0);
  /** Поднимает синхронно settleQueue (чтобы живой ответ не вклинился между базой и повтором), опускает смена занятия. */
  const hydratedRef = useRef(false);
  const registerVerdictNowRef = useRef<((verdictInput: Readonly<{ answerAttemptId: string; verdict: SessionAttemptVerdict }>, source: 'live' | 'replayed_after_hydration') => SessionAttemptsEffect) | null>(null);

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
    // зачем (Ревизор 2.80): очередь вердиктов принадлежит занятию — при смене занятия она не переходит в следующее
    if (pendingVerdictsRef.current.length > 0) {
      console.warn('[ATTEMPTS-VERDICT]', JSON.stringify({ source: 'dropped_on_session_change', from: sessionIdRef.current, to: input.sessionId, dropped: pendingVerdictsRef.current.length })); // guard-ok: сброс очереди с причиной
    }
    pendingVerdictsRef.current = [];
    queuedBaseRef.current = null;
    hydratedRef.current = false;
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

  /**
   * Гидратация закончилась (прочитано / потолок / сбой): база — сохранённое состояние, иначе состояние до первой проекции очереди; затем
   * синхронно повторяем очередь СВОЕГО занятия и поколения аккаунта. Синхронно — чтобы живой ответ не вклинился между базой и повтором.
   */
  const settleQueue = useCallback((restored: SessionAttemptsStateV1 | null, reason: 'hydrated' | 'ceiling' | 'failed'): void => {
    const base = restored ?? queuedBaseRef.current;
    queuedBaseRef.current = null;
    if (base && base !== stateRef.current) adoptState(base);
    hydratedRef.current = true;
    const queued = pendingVerdictsRef.current.splice(0);
    if (queued.length === 0) return;
    const own = queued.filter((item) => item.sessionId === input.sessionId && item.accountGeneration === input.token.generation);
    console.log('[ATTEMPTS-VERDICT]', JSON.stringify({ sessionId: input.sessionId, source: 'replay_after_hydration', reason, count: own.length, skippedForeign: queued.length - own.length, base: restored ? 'stored' : 'before_queue' })); // guard-ok: применяем очередь после гидратации
    for (const item of own) registerVerdictNowRef.current?.({ answerAttemptId: item.answerAttemptId, verdict: item.verdict }, 'replayed_after_hydration');
  }, [adoptState, input.sessionId, input.token.generation]);

  const hydrate = useCallback(async (): Promise<void> => {
    setRecoveryError(null);
    if (input.persistenceEnabled === false) {
      setHydrated(true);
      return;
    }
    const run = hydrateRunRef.current + 1;
    hydrateRunRef.current = run;
    const startedAt = Date.now();
    let ceilingTimer: ReturnType<typeof setTimeout> | null = null;
    const work = (async () => {
      await recoverPreparedSessionAttemptRecoveries(input.token);
      const [stored] = await Promise.all([
        hydrateSessionAttemptsState(input.token, input.sessionId),
        refreshResources(),
      ]);
      return stored;
    })();
    const ceiling = new Promise<'timeout'>((resolve) => {
      ceilingTimer = setTimeout(() => resolve('timeout'), SESSION_ATTEMPTS_HYDRATE_CEILING_MS);
    });
    try {
      const outcome = await Promise.race([
        work.then((stored) => ({ kind: 'ok' as const, stored })),
        ceiling.then(() => ({ kind: 'timeout' as const })),
      ]);
      if (run !== hydrateRunRef.current) {
        console.log('[ATTEMPTS-HYDRATE]', JSON.stringify({ sessionId: input.sessionId, outcome: 'stale_run_ignored', ms: Date.now() - startedAt })); // guard-ok: ранний выход называет причину
        return;
      }
      if (outcome.kind === 'timeout') {
        console.warn('[ATTEMPTS-HYDRATE]', JSON.stringify({ sessionId: input.sessionId, outcome: 'ceiling', ceilingMs: SESSION_ATTEMPTS_HYDRATE_CEILING_MS, queued: pendingVerdictsRef.current.length })); // guard-ok: потолок гидратации
        setHydrationTrusted(false);
        setRecoveryError('session_attempts_hydrate_timeout');
        void work.then(() => {
          console.warn('[ATTEMPTS-HYDRATE]', JSON.stringify({ sessionId: input.sessionId, outcome: 'late_result_ignored', ms: Date.now() - startedAt })); // guard-ok: поздний ответ не затирает вердикты
        }).catch(noteSwallowedHandler('useSessionAttempts:hydrate_late'));
        settleQueue(null, 'ceiling');
        return;
      }
      const stored = outcome.stored;
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
      let restored: SessionAttemptsStateV1 | null = null;
      if (stored && stored.phase === 'stopped_no_energy' && !mistakeChargeActive) {
        // зачем: владелец вернул режим А, пока занятие стояло в остановке режима Б, — не держим человека взаперти.
        console.log('[ENERGY-MODE] restored stopped session in mode A → active', JSON.stringify({ sessionId: input.sessionId }));
        restored = { ...stored, phase: 'active' };
      } else if (stored && stored.phase !== 'ended') restored = stored;
      // Состояние прочитано без сбоя — только теперь ему можно верить.
      setHydrationTrusted(true);
      settleQueue(restored, 'hydrated');
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
      if (run === hydrateRunRef.current) settleQueue(null, 'failed');
    } finally {
      if (ceilingTimer) clearTimeout(ceilingTimer);
      if (run === hydrateRunRef.current) setHydrated(true);
    }
  }, [input.persistenceEnabled, input.sessionId, input.token, mistakeChargeActive, refreshResources, settleQueue]);

  useEffect(() => {
    if (input.autoHydrate === false) {
      setHydrated(true);
      return;
    }
    void hydrate();
  }, [hydrate, input.autoHydrate]);

  const applyVerdict = useCallback((verdictInput: Readonly<{
    answerAttemptId: string;
    verdict: SessionAttemptVerdict;
  }>): SessionAttemptsEffect => {
    if (mistakeChargeActive && energyActivity && verdictInput.verdict === 'pedagogical_wrong') {
      const energyNow = energyRef.current;
      const available = energyNow.energy + energyNow.bonusEnergy - pendingMistakeSpendsRef.current;
      const outcome = energyNow.isUnlimited ? 'free' : available <= 1 ? 'exhausted' : 'charged';
      const mistakeTransition = reduceSessionAttempts(stateRef.current, {
        type: 'energy_mistake',
        answerAttemptId: verdictInput.answerAttemptId,
        outcome,
      });
      console.log('[ENERGY-MODE] mistake', JSON.stringify({
        sessionId: input.sessionId, activity: energyActivity, answerAttemptId: verdictInput.answerAttemptId,
        available, unlimited: energyNow.isUnlimited, outcome, effect: mistakeTransition.effect,
      }));
      if (mistakeTransition.state !== stateRef.current) {
        adoptState(mistakeTransition.state);
        persist(mistakeTransition.state);
      }
      if (mistakeTransition.effect === 'energy_consumed' || mistakeTransition.effect === 'energy_exhausted') {
        setEnergyLossSeq((current) => current + 1);
        // Списание — фоном (интерфейс уже отреагировал). Идемпотентно по номеру ответа: двойной тап не снимет дважды.
        // Номер операции журнала допускает только [A-Za-z0-9_:-] — точка и прочее молча отменили бы списание.
        const attemptToken = `${input.sessionId}:${verdictInput.answerAttemptId}`.replace(/[^A-Za-z0-9_:-]/g, '_');
        const intent = createEnergySessionIntent(`${energyActivity}_mistake`, input.sessionId, attemptToken);
        pendingMistakeSpendsRef.current += 1;
        void energyNow.spendMistakeEnergy(energyActivity, intent)
          .then((result) => {
            if (result !== 'spent') {
              console.warn('[ENERGY-MODE] mistake spend not applied', JSON.stringify({ sessionId: input.sessionId, result })); // guard-ok: итог списания логируется
            }
          })
          .catch(noteSwallowedHandler('useSessionAttempts:mistake_spend'))
          .finally(() => {
            pendingMistakeSpendsRef.current = Math.max(0, pendingMistakeSpendsRef.current - 1);
          });
      }
      return mistakeTransition.effect;
    }
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
  }, [adoptState, energyActivity, input.sessionId, mistakeChargeActive, persist]);

  // зачем (Ревизор 2.75, Сверка: сердца 3/3 при ошибках — подозрение на немой ранний выход редьюсера phase !== 'active' / дубликат id): каждый вердикт пишет [ATTEMPTS-VERDICT]
  // с состоянием ДО и ПОСЛЕ — видно, какая ветка сработала. Ранний выход без эффекта (duplicate/phase) теперь не немой.
  // поднимает и settleQueue (синхронно, раньше рендера), и любой путь, где hydrated=true без гидратации (autoHydrate=false, без записи);
  // опускает только смена занятия
  if (hydrated) hydratedRef.current = true;
  const hydrationTrustedRef = useRef(hydrationTrusted);
  hydrationTrustedRef.current = hydrationTrusted;
  const registerVerdictNow = useCallback((verdictInput: Readonly<{
    answerAttemptId: string;
    verdict: SessionAttemptVerdict;
  }>, source: 'live' | 'replayed_after_hydration' = 'live'): SessionAttemptsEffect => {
    const before = stateRef.current;
    const duplicate = before.processedAnswerAttemptIds.includes(verdictInput.answerAttemptId);
    const effect = applyVerdict(verdictInput);
    const after = stateRef.current;
    console.log('[ATTEMPTS-VERDICT]', JSON.stringify({ // guard-ok: журнал вердикта и раннего выхода редьюсера
      sessionId: input.sessionId, source, answerAttemptId: verdictInput.answerAttemptId, verdict: verdictInput.verdict,
      phaseBefore: before.phase, phaseAfter: after.phase, remainingBefore: before.remainingAttempts, remainingAfter: after.remainingAttempts,
      duplicate, effect, mistakeChargeActive, hydrated: hydratedRef.current, hydrationTrusted: hydrationTrustedRef.current,
      earlyExit: effect === 'none' && after === before ? (before.phase !== 'active' ? 'phase_not_active' : duplicate ? 'duplicate_answer_id' : 'none_effect') : null,
    }));
    return effect;
  }, [applyVerdict, input.sessionId, mistakeChargeActive]);

  // зачем (Сверка 4b2f7ac3c: вероятная причина — очень быстрый первый ответ пришёл ДО гидратации сердец, и редьюсер отбросил вердикт): вердикт до гидратации не отбрасываем,
  // а ставим в очередь и применяем после неё, по порядку, с логом.
  // зачем (Ревизор 2.80, 15.10): вызывающие (lesson1 и ещё ~22 места) решают «остаться на вопросе» по эффекту — 'none' из очереди пролистывал
  // вопрос на третьей быстрой ошибке. Теперь вердикт до гидратации сразу применяется к ЛОКАЛЬНОМУ состоянию (без записи на диск и без списания
  // энергии) и возвращает честный эффект. После гидратации очередь повторяется по-настоящему (запись, энергия) поверх сохранённого состояния
  // или состояния до первой проекции (settleQueue) — проекция отбрасывается, двойного счёта нет.
  registerVerdictNowRef.current = registerVerdictNow;
  const projectVerdict = useCallback((verdictInput: Readonly<{ answerAttemptId: string; verdict: SessionAttemptVerdict }>): SessionAttemptsEffect => {
    if (mistakeChargeActive && energyActivity && verdictInput.verdict === 'pedagogical_wrong') {
      const energyNow = energyRef.current;
      // ещё не списанные ошибки очереди (кроме этой) — как pendingMistakeSpendsRef для живых ответов
      const priorQueuedMistakes = Math.max(0, pendingVerdictsRef.current.filter((item) => item.verdict === 'pedagogical_wrong').length - 1);
      const available = energyNow.energy + energyNow.bonusEnergy - pendingMistakeSpendsRef.current - priorQueuedMistakes;
      const outcome = energyNow.isUnlimited ? 'free' : available <= 1 ? 'exhausted' : 'charged';
      const projected = reduceSessionAttempts(stateRef.current, { type: 'energy_mistake', answerAttemptId: verdictInput.answerAttemptId, outcome });
      if (projected.state !== stateRef.current) adoptState(projected.state);
      return projected.effect;
    }
    const projected = reduceSessionAttempts(stateRef.current, { type: 'verdict', answerAttemptId: verdictInput.answerAttemptId, verdict: verdictInput.verdict });
    if (projected.state !== stateRef.current) adoptState(projected.state);
    return projected.effect;
  }, [adoptState, energyActivity, mistakeChargeActive]);
  const registerVerdict = useCallback((verdictInput: Readonly<{
    answerAttemptId: string;
    verdict: SessionAttemptVerdict;
  }>): SessionAttemptsEffect => {
    if (!hydratedRef.current && input.persistenceEnabled !== false) {
      if (pendingVerdictsRef.current.length === 0) queuedBaseRef.current = stateRef.current;
      pendingVerdictsRef.current.push({ answerAttemptId: verdictInput.answerAttemptId, verdict: verdictInput.verdict, sessionId: input.sessionId, accountGeneration: input.token.generation });
      const projectedEffect = projectVerdict(verdictInput);
      console.log('[ATTEMPTS-VERDICT]', JSON.stringify({ sessionId: input.sessionId, source: 'queued_before_hydration', answerAttemptId: verdictInput.answerAttemptId, verdict: verdictInput.verdict, queued: pendingVerdictsRef.current.length, projectedEffect, remainingProjected: stateRef.current.remainingAttempts })); // guard-ok: вердикт до гидратации поставлен в очередь
      return projectedEffect;
    }
    return registerVerdictNow(verdictInput, 'live');
  }, [input.persistenceEnabled, input.sessionId, input.token.generation, projectVerdict, registerVerdictNow]);

  /** Режим Б: можно ли продолжить остановленное занятие — Plus или хотя бы 1 энергия восстановилась. */
  // Ожидающие списания вычитаем: сразу после остановки энергия в контексте ещё 1 (журнал не записан) — без этого
  // занятие тут же «продолжилось» бы само.
  // energyReady (ревью Opus 11.10): до настоящего чтения энергия может быть из быстрого кэша — не продолжаем по нему.
  const canResume = state.phase === 'stopped_no_energy'
    && energyContext.energyReady
    && (energyContext.isUnlimited
      || energyContext.energy + energyContext.bonusEnergy - pendingMistakeSpendsRef.current >= 1);

  const resumeAfterPlus = useCallback((): SessionAttemptsEffect => {
    const energyNow = energyRef.current;
    const allowed = energyNow.isUnlimited
      || energyNow.energy + energyNow.bonusEnergy - pendingMistakeSpendsRef.current >= 1;
    if (stateRef.current.phase !== 'stopped_no_energy' || !allowed) {
      console.warn('[ENERGY-MODE] resume refused', JSON.stringify({ // guard-ok: ранний выход логируется
        sessionId: input.sessionId, phase: stateRef.current.phase, unlimited: energyNow.isUnlimited,
        available: energyNow.energy + energyNow.bonusEnergy,
      }));
      return 'none';
    }
    const transition = reduceSessionAttempts(stateRef.current, { type: 'resume_after_energy' });
    if (transition.state !== stateRef.current) {
      adoptState(transition.state);
      persist(transition.state);
    }
    console.log('[ENERGY-MODE] resumed', JSON.stringify({ sessionId: input.sessionId, unlimited: energyNow.isUnlimited }));
    return transition.effect;
  }, [adoptState, input.sessionId, persist]);

  // зачем (ревью Opus 11.10, владелец: «надо ждать восстановления энергии»): без этого человек без Plus оставался в
  // остановке навсегда — ключ занятия постоянный, фаза сохраняется на диск. Как только энергия ≥ 1 (восстановилась
  // или пришёл Plus), занятие продолжается с того же места.
  useEffect(() => {
    if (!hydrated || state.phase !== 'stopped_no_energy' || !canResume) return;
    console.log('[ENERGY-MODE] auto-resume', JSON.stringify({
      sessionId: input.sessionId, unlimited: energyContext.isUnlimited,
      available: energyContext.energy + energyContext.bonusEnergy,
    }));
    resumeAfterPlus();
  }, [canResume, energyContext.bonusEnergy, energyContext.energy, energyContext.isUnlimited, hydrated, input.sessionId, resumeAfterPlus, state.phase]);

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
    energyMode,
    mistakeChargeActive,
    energyLossSeq,
    canResume,
    resumeAfterPlus,
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
