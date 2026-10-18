// ═══════════════════════════════════════════════════════════════════════════
// use_spire_step_runner.ts — живая ступень Шпиля: энергия, таймер, ответы, пауза (пакет D).
//
// зачем (владелец T6–T9, T18, T20, D72, D87):
//   • энергия списывается ОДИН раз, когда показывается первое задание ступени
//     (confirmSpendOne) — до этого момента ничего не тратится; если после списания
//     первое задание так и не показалось (экран закрылся, упал) — возврат (refundOne);
//   • 10 заданий, ОБЩИЙ таймер на ступень, 3 сердца — чистый редьюсер step_machine;
//     вердикт мгновенный, без сети (отпечатки ответов из пакета недели);
//   • ошибка: таймер стоит, показан правильный ответ до кнопки «Дальше» (владелец 30.09);
//     сворачивание/звонок — пауза, «назад» — шторка, выход = провал.
// Таймер тикает по реальной разнице часов раз в 250 мс, но перерисовывается
// ТОЛЬКО кольцо (подписка clock), а не весь экран — без setState в каждом кадре.
// ═══════════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { useEnergy, useEnergySessionIntent } from '../../components/EnergyContext';
import { spireRevealChoiceIndex, spireRevealItemIndexes, spireRevealTokens } from '../../modules/spire/answer_reveal';
import type { SpireStepPick } from '../../modules/spire/pack_plan';
import { spireReportFromStepState, type SpireLang, type SpireStepReport } from '../../modules/spire/report_queue';
import {
  advanceAfterReveal,
  backOutSpireStep,
  createSpireStepState,
  pauseSpireStep,
  resumeSpireStep,
  skipReportedSpireTask,
  submitSpireAnswer,
  tickSpireBudget,
  type SpireStepState,
} from '../../modules/spire/step_machine';
import { DebugLogger } from '../debug-logger';
import { spireBumpStepAttempt } from './spire_local_store';
import { spireCaptureMistakeOutcome } from './spire_mistake_capture';
import { useSpireCountdown } from './use_spire_countdown';

const LOG = '[SPIRE]';
const TICK_MS = 250;
const CORRECT_FLASH_MS = 280;

export type SpireStepContext = Readonly<{ lang: SpireLang; weekKey: string; tier: number; floor: number; stepInFloor: number }>;

export type SpireStepFinish = Readonly<{ state: SpireStepState; report: SpireStepReport }>;

export type SpireFeedback = Readonly<{
  taskIndex: number;
  ok: boolean;
  /** Выбранный вариант (выбор) или номер пары, где ошиблись. */
  picked: number | null;
  itemIndex: number | null;
  /** Верный вариант / порядок слов, восстановленный по отпечатку; null — не нашли. */
  correctIndex: number | null;
  correctText: string | null;
  /** null — ещё пишем; true — журнал «Мои ошибки» подтвердил запись. */
  mistakeSaved: boolean | null;
}>;

/** Живой бюджет для кольца: подписка без перерисовки всего экрана. */
export type SpireClock = Readonly<{ get: () => number; subscribe: (fn: () => void) => () => void }>;

export type SpireRunnerPhase = 'countdown' | 'charging' | 'playing' | 'finished'; // зачем (18.10): 'countdown' — отсчёт 3-2-1 до списания энергии и старта таймера, время человеку не тратится

export type SpireStepRunnerInput = Readonly<{
  pick: SpireStepPick;
  ctx: SpireStepContext;
  uid: string;
  studyTarget: string;
  attempt: number;
  runId: string;
  onFinish: (finish: SpireStepFinish) => void;
  onAbort: (reason: 'no_energy' | 'cancelled') => void;
}>;

function createClock(): SpireClock & { set: (v: number) => void } {
  let value = 0;
  const listeners = new Set<() => void>();
  return {
    get: () => value,
    set: (v: number) => { value = v; listeners.forEach((fn) => fn()); },
    subscribe: (fn) => { listeners.add(fn); return () => { listeners.delete(fn); }; },
  };
}

function textOf(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export function useSpireStepRunner(input: SpireStepRunnerInput) {
  const { pick, ctx } = input;
  const { confirmSpendOne, acknowledgeSessionStart, refundOne } = useEnergy();
  const intent = useEnergySessionIntent('spire_step', `${ctx.weekKey}:${ctx.lang}:f${ctx.floor}:s${ctx.stepInFloor + 1}`, input.runId);
  const [phase, setPhase] = useState<SpireRunnerPhase>('countdown');
  const [state, setState] = useState<SpireStepState>(() => createSpireStepState(pick.plan));
  const [feedback, setFeedbackState] = useState<SpireFeedback | null>(null);
  // зачем (обзор R1 п.2): canAnswer читал feedback из замыкания — после ВЕРНОГО ответа фаза остаётся 'active', и второй
  // тап в том же кадре прошёл бы в следующее задание. Ref пишется синхронно вместе с состоянием.
  const feedbackRef = useRef<SpireFeedback | null>(null);
  const setFeedback = useCallback((next: SpireFeedback | null | ((cur: SpireFeedback | null) => SpireFeedback | null)) => {
    const value = typeof next === 'function' ? next(feedbackRef.current) : next;
    feedbackRef.current = value;
    setFeedbackState(value);
  }, []);
  const [exitOpen, setExitOpen] = useState(false);
  const countdownDigit = useSpireCountdown({ paused: exitOpen, onDone: () => setPhase('charging') }); // зачем: отсчёт 3-2-1, энергия/таймер/первое задание — только после «1»; шторка выхода и фон ставят паузу
  const stateRef = useRef(state);
  const clock = useMemo(() => createClock(), []);
  const lastTickRef = useRef(0);
  const chargeStartedRef = useRef(false);
  const chargedRef = useRef<'none' | 'spent' | 'acked'>('none');
  const finishedRef = useRef(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const inputRef = useRef(input);
  inputRef.current = input;
  const exitOpenRef = useRef(false);
  exitOpenRef.current = exitOpen;
  const phaseRef = useRef<SpireRunnerPhase>(phase);
  phaseRef.current = phase;
  const aliveRef = useRef(true);

  const commit = useCallback((next: SpireStepState) => {
    stateRef.current = next;
    clock.set(next.elapsedBudgetMs);
    setState(next);
  }, [clock]);

  const later = useCallback((fn: () => void, ms: number) => {
    const t = setTimeout(fn, ms);
    timersRef.current.push(t);
  }, []);

  // ── 1. Списание энергии на первом задании (D72); стартует после отсчёта ──
  useEffect(() => {
    if (phase !== 'charging') return; if (chargeStartedRef.current) return;
    chargeStartedRef.current = true;
    DebugLogger.info(LOG, `step: старт этаж=${ctx.floor} ступень=${ctx.stepInFloor + 1} попытка=${input.attempt} набор=${pick.setIndex} бюджет=${pick.plan.budgetMs}мс op=${intent.operationId}`);
    void (async () => {
      const result = await confirmSpendOne(intent);
      DebugLogger.info(LOG, `step: энергия result=${result}`);
      if (result === 'insufficient' || result === 'cancelled') {
        inputRef.current.onAbort(result === 'insufficient' ? 'no_energy' : 'cancelled');
        return;
      }
      if (!aliveRef.current) {
        // зачем (D87): экран закрыли, пока шло списание — первого задания не было, возвращаем.
        DebugLogger.warn(LOG, `step: экран закрыт во время списания (result=${result}) — возврат`);
        if (result === 'spent') {
          void refundOne(intent.operationId, 'spire_closed_during_charge').catch((error: unknown) => {
            DebugLogger.warn(LOG, `step: возврат энергии не удался (${String(error)})`);
          });
        }
        return;
      }
      chargedRef.current = result === 'spent' ? 'spent' : 'acked';
      void spireBumpStepAttempt(input.uid, ctx.lang, ctx.weekKey, ctx.floor, ctx.stepInFloor + 1);
      lastTickRef.current = Date.now();
      setPhase('playing');
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ── 2. Первое задание на экране → подтверждаем старт; не показалось → возврат (D87) ──
  useEffect(() => {
    if (phase !== 'playing' || chargedRef.current !== 'spent') return;
    chargedRef.current = 'acked';
    void acknowledgeSessionStart(intent.operationId).then((ok) => {
      DebugLogger.info(LOG, `step: первое задание показано, старт подтверждён ok=${String(ok)}`);
    });
  }, [phase, acknowledgeSessionStart, intent.operationId]);

  useEffect(() => {
    // зачем: StrictMode в dev прогоняет эффект дважды — флаг жизни восстанавливаем здесь.
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      timersRef.current.forEach(clearTimeout);
      if (chargedRef.current === 'spent') {
        DebugLogger.warn(LOG, 'step: экран закрыт после списания, до первого задания — возвращаем энергию');
        void refundOne(intent.operationId, 'spire_first_task_not_shown').catch((error: unknown) => {
          DebugLogger.warn(LOG, `step: возврат энергии не удался (${String(error)})`);
        });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 3. Финал ступени → отчёт наверх (один раз) ──
  const finish = useCallback((final: SpireStepState) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const report = spireReportFromStepState(final, { ...ctx, completedAtMs: Date.now() });
    if (!report) {
      DebugLogger.warn(LOG, `step: финал без отчёта phase=${final.phase} — не должно случаться`);
      return;
    }
    DebugLogger.info(LOG, `step: финал outcome=${report.outcome} причина=${final.failReason ?? '-'} сердца=${final.hearts} потрачено=${final.elapsedBudgetMs}мс`);
    setPhase('finished');
    inputRef.current.onFinish({ state: final, report });
  }, [ctx]);

  // ── 4. Тик таймера: только в активной фазе (при показе ошибки таймер стоит, макет §5) ──
  useEffect(() => {
    if (phase !== 'playing') return undefined;
    const id = setInterval(() => {
      const now = Date.now();
      const delta = now - lastTickRef.current;
      lastTickRef.current = now;
      const cur = stateRef.current;
      if (cur.phase !== 'active' || exitOpenRef.current) return;
      const next = tickSpireBudget(cur, delta);
      if (next.phase === 'failed') {
        DebugLogger.info(LOG, 'step: время вышло');
        commit(next);
        finish(next);
        return;
      }
      stateRef.current = next;
      clock.set(next.elapsedBudgetMs);
    }, TICK_MS);
    return () => clearInterval(id);
  }, [phase, clock, commit, finish]);

  // «Дальше» после ошибки → следующее задание (или финал).
  // зачем (владелец 30.09): правильный ответ висит, пока человек сам не нажмёт
  // «Дальше» (вместо автоперехода через 1,2 с) — таймер всё это время стоит
  // (тикает только фаза 'active'). Если нажали, пока приложение на паузе, — ждём.
  const continueAfterReveal = useCallback(() => {
    const cur = stateRef.current;
    if (cur.phase === 'failed' || cur.phase === 'passed') {
      DebugLogger.info(LOG, `step: «Дальше» после последней ошибки — финал (${cur.phase})`);
      setFeedback(null);
      finish(cur);
      return;
    }
    if (cur.phase !== 'revealing') {
      DebugLogger.info(LOG, `step: «Дальше» в фазе ${cur.phase} — игнорируем`);
      return;
    }
    lastTickRef.current = Date.now();
    const next = advanceAfterReveal(cur);
    DebugLogger.info(LOG, `step: «Дальше» → фаза ${next.phase}, задание ${next.taskIndex + 1}`);
    commit(next);
    setFeedback(null);
    if (next.phase === 'passed') finish(next);
  }, [commit, finish]);

  // ── 5. Сворачивание / звонок — пауза, возврат — продолжение (T18) ──
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      const cur = stateRef.current;
      if (next === 'active') {
        lastTickRef.current = Date.now();
        if (cur.phase === 'paused' && !exitOpenRef.current) {
          const resumed = resumeSpireStep(cur);
          DebugLogger.info(LOG, `step: вернулись — продолжаем с той же точки бюджета (фаза ${resumed.phase})`);
          commit(resumed);
        }
      } else if (cur.phase === 'active' || cur.phase === 'revealing') {
        DebugLogger.info(LOG, `step: приложение ушло в ${next} — пауза`);
        commit(pauseSpireStep(cur));
      }
    });
    return () => sub.remove();
  }, [commit]);

  // ── 6. Ответ ──
  const afterAnswer = useCallback((next: SpireStepState, fb: SpireFeedback, given: string, correct: string | readonly string[] | null) => {
    commit(next);
    setFeedback(fb);
    if (fb.ok) {
      later(() => setFeedback((cur) => (cur === fb ? null : cur)), CORRECT_FLASH_MS);
      if (next.phase === 'passed') later(() => finish(next), CORRECT_FLASH_MS);
      return;
    }
    const task = pick.tasks[fb.taskIndex];
    // зачем (обзор R1 п.4): «не сохранилось» человеку — только при настоящем сбое записи (false); штатный пропуск
    // (пары, «найди лишнее», язык без журнала) оставляет null и ничего не показывает.
    void spireCaptureMistakeOutcome({ studyTarget: inputRef.current.studyTarget, attemptKey: `${inputRef.current.runId}:${fb.taskIndex}`, task, correct, given })
      .then((outcome) => {
        const mistakeSaved = outcome === 'saved' ? true : outcome === 'failed' ? false : null;
        DebugLogger.info(LOG, `step: «Мои ошибки» задание ${fb.taskIndex + 1} → ${outcome} (строка: ${mistakeSaved === true ? 'сохранена' : mistakeSaved === false ? 'не удалось' : 'нет'})`);
        setFeedback((cur) => (cur && cur.taskIndex === fb.taskIndex && !cur.ok ? { ...cur, mistakeSaved } : cur));
      });
    // Правильный ответ висит до «Дальше» (continueAfterReveal), автоперехода нет.
  }, [commit, finish, later, pick.tasks]);

  const canAnswer = (): boolean => {
    const ok = phaseRef.current === 'playing' && stateRef.current.phase === 'active' && feedbackRef.current === null && !exitOpenRef.current;
    if (!ok) {
      DebugLogger.info(LOG, `step: ответ отклонён (runner=${phaseRef.current} step=${stateRef.current.phase} feedback=${feedbackRef.current ? (feedbackRef.current.ok ? 'верный' : 'ошибка') : 'нет'} exit=${String(exitOpenRef.current)}) — двойной тап или ответ не ко времени`);
    }
    return ok;
  };

  const submitChoice = useCallback((optionIndex: number) => {
    if (!canAnswer()) return;
    const cur = stateRef.current;
    const task = pick.tasks[cur.taskIndex];
    const next = submitSpireAnswer(cur, pick.plan, { selectedIndex: optionIndex }, cur.elapsedBudgetMs);
    const ok = next.hearts === cur.hearts;
    const options = Array.isArray(task.payload.options) ? task.payload.options.map(textOf) : [];
    const correctIndex = ok ? optionIndex : spireRevealChoiceIndex(pick.plan.saltId, task.taskId, options.length, pick.plan.tasks[cur.taskIndex].answerFingerprints[0] ?? '');
    const correctText = correctIndex === null ? null : options[correctIndex] ?? null;
    DebugLogger.info(LOG, `step: задание ${cur.taskIndex + 1} выбор=${optionIndex} ok=${String(ok)} верный=${String(correctIndex)}`);
    afterAnswer(next, { taskIndex: cur.taskIndex, ok, picked: optionIndex, itemIndex: null, correctIndex, correctText, mistakeSaved: null }, options[optionIndex] ?? '', correctText);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [afterAnswer, pick, phase, feedback, exitOpen]);

  const submitTokens = useCallback((tokens: readonly string[]) => {
    if (!canAnswer()) return;
    const cur = stateRef.current;
    const task = pick.tasks[cur.taskIndex];
    const next = submitSpireAnswer(cur, pick.plan, { tokens: [...tokens] }, cur.elapsedBudgetMs);
    const ok = next.hearts === cur.hearts;
    const bank = Array.isArray(task.payload.wordBank) ? task.payload.wordBank.map(textOf) : [];
    const count = Number(task.payload.correctTokenCount) || tokens.length;
    const correct = ok ? tokens : spireRevealTokens(pick.plan.saltId, task.taskId, bank, count, pick.plan.tasks[cur.taskIndex].answerFingerprints[0] ?? '');
    DebugLogger.info(LOG, `step: задание ${cur.taskIndex + 1} сборка ok=${String(ok)} верный порядок ${correct ? 'найден' : 'не найден'}`);
    afterAnswer(next, { taskIndex: cur.taskIndex, ok, picked: null, itemIndex: null, correctIndex: null, correctText: correct ? correct.join(' ') : null, mistakeSaved: null }, tokens.join(' '), correct);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [afterAnswer, pick, phase, feedback, exitOpen]);

  /** Пары/подвопросы: selections — выбранный вариант по каждому пункту (все пункты заполнены). */
  const submitItems = useCallback((selections: readonly number[]) => {
    if (!canAnswer()) return;
    const cur = stateRef.current;
    const task = pick.tasks[cur.taskIndex];
    const next = submitSpireAnswer(cur, pick.plan, { selectedIndexes: [...selections] }, cur.elapsedBudgetMs);
    const ok = next.hearts === cur.hearts;
    const items = Array.isArray(task.payload.items) ? task.payload.items as Record<string, unknown>[] : [];
    const counts = items.map((it) => (Array.isArray(it.options) ? it.options.length : 0));
    const correctIdx = ok ? selections : spireRevealItemIndexes(pick.plan.saltId, task.taskId, counts, pick.plan.tasks[cur.taskIndex].answerFingerprints);
    const wrongAt = correctIdx.findIndex((c, i) => c !== selections[i]);
    const wrongItem = wrongAt >= 0 ? items[wrongAt] : null;
    const correctOption = wrongItem && correctIdx[wrongAt] !== null && Array.isArray(wrongItem.options) ? textOf(wrongItem.options[correctIdx[wrongAt] as number]) : '';
    const correctText = wrongItem && correctOption ? `${textOf(wrongItem.prompt)} — ${correctOption}` : null;
    DebugLogger.info(LOG, `step: задание ${cur.taskIndex + 1} пары ok=${String(ok)} ошибка в пункте=${wrongAt}`);
    afterAnswer(next, { taskIndex: cur.taskIndex, ok, picked: null, itemIndex: wrongAt >= 0 ? wrongAt : null, correctIndex: null, correctText, mistakeSaved: null }, '', null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [afterAnswer, pick, phase, feedback, exitOpen]);

  // ── 7. «Назад» → шторка; пока шторка открыта, таймер стоит ──
  const requestExit = useCallback(() => {
    if (finishedRef.current) return;
    DebugLogger.info(LOG, `step: запрошен выход (phase=${stateRef.current.phase})`);
    exitOpenRef.current = true; // зачем (R1 п.2): тап по ответу в том же кадре, что «назад», уже не пройдёт
    setExitOpen(true);
  }, []);
  const cancelExit = useCallback(() => {
    lastTickRef.current = Date.now();
    exitOpenRef.current = false;
    setExitOpen(false);
    // Пока шторка была открыта, приложение могло уйти в фон — снимаем паузу здесь.
    const cur = stateRef.current;
    if (cur.phase === 'paused') {
      const resumed = resumeSpireStep(cur);
      DebugLogger.info(LOG, `step: шторка закрыта — снимаем паузу (фаза ${resumed.phase})`);
      commit(resumed);
    }
  }, [commit]);
  const confirmExit = useCallback(() => {
    exitOpenRef.current = false;
    setExitOpen(false);
    const cur = stateRef.current;
    if (phase === 'charging' || phase === 'countdown') {
      DebugLogger.info(LOG, `step: выход до первого задания (${phase}) — энергия не тратится`);
      inputRef.current.onAbort('cancelled');
      return;
    }
    DebugLogger.info(LOG, `step: выход подтверждён — ступень провалена (задание ${cur.taskIndex + 1})`);
    const next = backOutSpireStep(cur);
    commit(next);
    finish(next);
  }, [commit, finish, phase]);

  const reportCurrentTask = useCallback((taskId: string) => {
    const cur = stateRef.current;
    const task = pick.tasks[cur.taskIndex];
    if (phase !== 'playing' || cur.phase !== 'active' || !task || task.taskId !== taskId) {
      DebugLogger.warn(LOG, `step: жалоба не совпала с текущим заданием (${taskId})`);
      return;
    }
    const next = skipReportedSpireTask(cur, cur.elapsedBudgetMs);
    DebugLogger.info(LOG, `step: задание ${cur.taskIndex + 1} снято по жалобе без штрафа`);
    setFeedback(null);
    commit(next);
    if (next.phase === 'passed') finish(next);
  }, [commit, finish, phase, pick.tasks]);

  const displayTaskIndex = feedback ? feedback.taskIndex : Math.min(state.taskIndex, pick.tasks.length - 1);

  return {
    phase, state, clock, feedback, exitOpen, displayTaskIndex, countdownDigit,
    submitChoice, submitTokens, submitItems, reportCurrentTask, requestExit, cancelExit, confirmExit, continueAfterReveal,
  };
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
