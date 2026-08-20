import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  arenaLocalMatchInit,
  arenaLocalMatchReduce,
  arenaLocalMatchReport,
  type ArenaLocalEvent,
  type ArenaLocalMatchState,
  type ArenaMatchReport,
  type ArenaOpponentTick,
} from '../modules/arena/match_machine';
import { arenaLocalNextBoundaryMs, arenaLocalPhase, type ArenaLocalPhase } from '../modules/arena/local_clock';
import { arenaMonotonicEpochId, arenaMonotonicNowMs } from '../modules/arena/monotonic';
import { arenaAnswerIsCorrect, arenaPairIsCorrect, type ArenaAnswerCheckTask } from '../modules/arena/answer_check';
import { arenaMachinePlan, type ArenaMatchPlanWire, type ArenaPlanTaskWire } from '../modules/arena/duel_plan';
import { arenaSaveMatch, type ArenaKeyValueStore } from '../modules/arena/match_store';
import type { ArenaOutboxOwnerScope } from '../modules/arena/result_outbox';
import { arenaPendingOpponentTicks } from '../modules/arena/live_channel';

/**
 * Единственное место во всей Арене, где есть эффекты: таймеры, часы, хранилище,
 * подписка на переход в фон. Вся арифметика матча остаётся в чистом редьюсере,
 * а здесь только то, что нельзя посчитать.
 *
 * Ключевое решение — ТОЧНЫЙ таймер на границу фазы, а не тик раз в секунду.
 * Тик по расписанию промахивается мимо конца восьмисекундного окна на половину
 * своего периода: игрок увидел бы «время вышло» на полсекунды позже, чем оно
 * вышло на самом деле, и владелец назвал это недопустимым прямо. Видимый
 * счётчик рисуется анимацией на UI-потоке и к этому таймеру отношения не
 * имеет — перерисовка ради цифры на экране здесь не нужна.
 *
 * Никаких обращений к серверу за ход матча тоже нет: план уже на руках,
 * вердикт считается отпечатками локально.
 */

/** Кадр, который отдаётся экрану. Всё, что нужно нарисовать, — здесь. */
export type ArenaLocalMatchFrame = Readonly<{
  state: ArenaLocalMatchState;
  phase: ArenaLocalPhase;
  task: ArenaPlanTaskWire | null;
  /** Готовый отчёт. Появляется ровно один раз, когда матч доигран. */
  report: ArenaMatchReport | null;
}>;

export type ArenaLocalMatchApi = ArenaLocalMatchFrame & Readonly<{
  /** Обычный ответ. Вердикт возвращается СРАЗУ — сеть не участвует. */
  answer(answer: unknown): boolean;
  /** Тык по паре. Вердикт тоже мгновенный. */
  tapPair(pairIndex: number, selectedIndex: number): boolean;
  /** Задание не отрисовалось. Закрывается сбоем, а не неверным ответом. */
  reportBroken(taskIndex: number): void;
  /** Явный выход из матча. */
  abandon(): void;
}>;

type Dispatchable = ArenaLocalEvent;
type ReducerEvent = Dispatchable | Readonly<{
  type: 'hydrate';
  state: ArenaLocalMatchState;
}>;

function reducerFor(plan: ArenaMatchPlanWire) {
  const machinePlan = arenaMachinePlan(plan);
  return (state: ArenaLocalMatchState, event: Dispatchable): ArenaLocalMatchState =>
    arenaLocalMatchReduce(machinePlan, state, event);
}

function checkTask(task: ArenaPlanTaskWire): ArenaAnswerCheckTask {
  return {
    taskId: task.taskId,
    mode: task.mode,
    kind: (task.kind || 'choice') as ArenaAnswerCheckTask['kind'],
    answerFingerprints: task.answerFingerprints,
  };
}

export type UseArenaLocalMatchInput = Readonly<{
  plan: ArenaMatchPlanWire | null;
  /** Аккаунт, которому принадлежит локальный снимок и итог матча. */
  ownerScope: ArenaOutboxOwnerScope | null;
  /** Снимок с диска. Передаётся один раз — матч продолжается с него. */
  restored?: ArenaLocalMatchState | null;
  /** Сколько осталось от отсчёта на момент входа в экран. */
  countdownRemainingMs?: number;
  /** Подменяется в тестах. По умолчанию — диск устройства. */
  store?: ArenaKeyValueStore;
  /**
   * Ходы соперника из обоих источников сразу: выданные вместе с планом и
   * пришедшие по живому каналу. Хук их только скармливает машине и нигде не
   * спрашивает, откуда они, — иначе бот отличался бы от человека поведением.
   */
  opponentTicks?: readonly ArenaOpponentTick[];
}>;

export function useArenaLocalMatch(input: UseArenaLocalMatchInput): ArenaLocalMatchApi | null {
  const { plan, ownerScope, restored, countdownRemainingMs, store, opponentTicks } = input;
  const keyValue = store ?? (AsyncStorage as unknown as ArenaKeyValueStore);

  const initial = useMemo(() => {
    if (!plan) return null;
    if (restored) return restored;
    return arenaLocalMatchInit(arenaMachinePlan(plan), {
      monoNowMs: arenaMonotonicNowMs(),
      wallNowMs: Date.now(),
      monoEpochId: arenaMonotonicEpochId(),
      countdownRemainingMs: countdownRemainingMs ?? plan.countdownMs,
    });
    // Матч начинается один раз. Пересборка начального состояния из-за смены
    // ссылки на план обнулила бы ход игры.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan?.matchId]);

  const reduce = useMemo(() => (plan ? reducerFor(plan) : null), [plan]);
  const [state, dispatch] = useReducer(
    (current: ArenaLocalMatchState | null, event: ReducerEvent) => {
      // Экран монтируется до ответа arenaV2MatchPlan, поэтому первый initial
      // закономерно равен null. useReducer не применяет новый initial при
      // следующем рендере: без явной гидратации корректный серверный план
      // приходил, но локальный матч так и оставался null навсегда.
      if (event.type === 'hydrate') {
        return current?.matchId === event.state.matchId ? current : event.state;
      }
      return current && reduce ? reduce(current, event) : current;
    },
    initial,
  );
  const [report, setReport] = useState<ArenaMatchReport | null>(null);

  const stateRef = useRef(state);
  stateRef.current = state;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedPhaseRef = useRef<string>('');
  const reportedRef = useRef(false);
  const deliveredTicksRef = useRef<number[]>([]);

  useEffect(() => {
    if (initial === null || state?.matchId === initial.matchId) return;
    dispatch({ type: 'hydrate', state: initial });
  }, [initial, state]);

  /* ---- новый matchId не наследует защёлки предыдущего матча ---- */
  useEffect(() => {
    if (!plan) return;
    deliveredTicksRef.current = [];
    savedPhaseRef.current = '';
    reportedRef.current = false;
    setReport(null);
  }, [plan?.matchId]);

  /* ---- точный таймер на границу фазы ---- */
  useEffect(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (!state || (plan && state.matchId !== plan.matchId) || state.phase === 'finished') return;
    const remaining = arenaLocalNextBoundaryMs(state, arenaMonotonicNowMs());
    if (remaining === null) return;
    // Ноль означает «граница уже позади»: ставим на следующий кадр, а не
    // считаем прямо здесь, иначе редьюсер вызовется во время отрисовки.
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      dispatch({ type: 'tick', monoNowMs: arenaMonotonicNowMs() });
    }, Math.max(0, remaining));
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
    // Перевзвод на любое изменение состояния безопасен и намеренен: остаток
    // считается заново от `phaseStartedAtMonoMs + phaseBudgetMs`, поэтому
    // накопления ошибки не бывает, сколько бы раз таймер ни переставили.
  }, [plan, state]);

  /* ---- возврат из фона ---- */
  useEffect(() => {
    const onChange = (status: AppStateStatus) => {
      if (status !== 'active') return;
      // Эпоха монотонных часов могла смениться (холодный старт процесса).
      // Редьюсер сам решит, доверять ли прошедшему времени.
      dispatch({
        type: 'resume',
        monoNowMs: arenaMonotonicNowMs(),
        wallNowMs: Date.now(),
        monoEpochId: arenaMonotonicEpochId(),
      });
    };
    const subscription = AppState.addEventListener('change', onChange);
    return () => subscription.remove();
  }, []);

  /* ---- ходы соперника ---- */
  useEffect(() => {
    if (!plan || state?.matchId !== plan.matchId || !opponentTicks?.length) return;
    // Скармливаем ТОЛЬКО новое. Машина и сама игнорирует повторный ход по тому
    // же заданию, но лишнее событие означает лишнюю перерисовку в разгар матча.
    const pending = arenaPendingOpponentTicks(opponentTicks, deliveredTicksRef.current);
    if (!pending.length) return;
    const monoNowMs = arenaMonotonicNowMs();
    for (const tick of pending) {
      deliveredTicksRef.current.push(tick.taskIndex);
      dispatch({ type: 'opponent_answered', monoNowMs, tick });
    }
  }, [opponentTicks, plan, state?.matchId]);

  /* ---- снимок на каждой границе задания, а не на каждом кадре ---- */
  useEffect(() => {
    if (!plan || !ownerScope || !state || state.matchId !== plan.matchId) return;
    const key = `${state.phase}:${state.taskIndex}`;
    if (key === savedPhaseRef.current) return;
    savedPhaseRef.current = key;
    void arenaSaveMatch(keyValue, ownerScope, plan, state, Date.now());
  }, [plan, ownerScope, state, keyValue]);

  /* ---- отчёт ровно один раз ---- */
  useEffect(() => {
    if (!plan || !state || state.matchId !== plan.matchId
      || state.phase !== 'finished' || reportedRef.current) return;
    reportedRef.current = true;
    setReport(arenaLocalMatchReport(arenaMachinePlan(plan), state));
    // Финальный снимок НЕ удаляем здесь. Сначала экран обязан записать отчёт
    // в долговечный outbox либо получить подтверждение сервера. Иначе убийство
    // приложения между последним заданием и записью очереди теряло весь матч.
  }, [plan, state]);

  const task = useMemo(
    () => (plan && state && state.matchId === plan.matchId && state.phase !== 'finished'
      ? plan.tasks[state.taskIndex] ?? null : null),
    [plan, state],
  );

  const answer = useCallback((value: unknown): boolean => {
    const current = stateRef.current;
    if (!plan || !current || current.matchId !== plan.matchId || current.phase !== 'answer') return false;
    const planTask = plan.tasks[current.taskIndex];
    if (!planTask) return false;
    // Вердикт считается ЗДЕСЬ и возвращается вызывающему сразу же: экран красит
    // вариант в тот же кадр, в котором игрок его нажал.
    const correct = arenaAnswerIsCorrect(plan.matchId, checkTask(planTask), value);
    const monoNowMs = arenaMonotonicNowMs();
    dispatch({ type: 'answer', monoNowMs, wallNowMs: Date.now(), correct, answer: value });
    return correct;
  }, [plan]);

  const tapPair = useCallback((pairIndex: number, selectedIndex: number): boolean => {
    const current = stateRef.current;
    if (!plan || !current || current.matchId !== plan.matchId || current.phase !== 'answer') return false;
    const planTask = plan.tasks[current.taskIndex];
    if (!planTask) return false;
    const correct = arenaPairIsCorrect(plan.matchId, checkTask(planTask), pairIndex, selectedIndex);
    dispatch({
      type: 'speed_attempt',
      monoNowMs: arenaMonotonicNowMs(),
      pairIndex,
      selectedIndex,
      correct,
    });
    return correct;
  }, [plan]);

  const reportBroken = useCallback((taskIndex: number) => {
    dispatch({ type: 'task_broken', monoNowMs: arenaMonotonicNowMs(), taskIndex });
  }, []);

  const abandon = useCallback(() => {
    dispatch({ type: 'abandon', monoNowMs: arenaMonotonicNowMs(), wallNowMs: Date.now() });
  }, []);

  const phase = useMemo(
    () => (state ? arenaLocalPhase(state, arenaMonotonicNowMs()) : null),
    [state],
  );

  if (!plan || !state || state.matchId !== plan.matchId || !phase) return null;
  return { state, phase, task, report, answer, tapPair, reportBroken, abandon };
}
