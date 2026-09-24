/**
 * Локальная машина ступени Шпиля — чистый редьюсер, без React/Firebase/часов.
 *
 * зачем: владелец (T6–T9, T18) — ступень идёт полностью на устройстве, вердикт
 * мгновенный, без обращения к серверу; 10 заданий, ОБЩИЙ таймер на всю ступень
 * (не на задание, как в Арене), 3 сердца, пауза при сворачивании, «назад» —
 * провал. Модель списана с `modules/arena/match_machine.ts` (тот же принцип:
 * план не хранится в состоянии, каждое событие несёт своё время), но это НЕ
 * копия — у Арены таймер на задание и нет паузы/провала по «назад».
 *
 * Голосовые задания сюда не входят: проверка ответа для choice/translate/
 * dictate/match идёт через modules/arena/answer_check.ts (тот же формат
 * answerFingerprints, что в пакете недели), а voice — отдельный путь
 * (spire_voice_check.ts, ещё не написан, см. PM-273 preflight §1) и не снимает
 * сердце (T22): его правильность решается вне этого редьюсера, сюда попадает
 * уже готовый verdict.
 */

import type { ArenaAnswerCheckTask } from '../arena/answer_check';
import { arenaAnswerIsCorrect, arenaPairIsCorrect } from '../arena/answer_check';

export const SPIRE_STEP_SCHEMA_VERSION = 'spire-step-local.v1' as const;

/** Сколько ошибок роняет ступень (T6). */
export const SPIRE_STEP_MAX_HEARTS = 3;
/** Заданий в ступени (T5). */
export const SPIRE_STEP_TASK_COUNT = 10;
/**
 * Доп. попытки на голосовое задание перед пропуском без штрафа (T22).
 * Пропуск засчитывает задание как непройденное для прогресса, но НЕ трогает
 * сердца — отличие от обычной ошибки.
 */
export const SPIRE_VOICE_MAX_RETRIES = 2;
/** Пауза перед следующим заданием после показа правильного ответа (T20). */
export const SPIRE_STEP_REVEAL_MS = 1_200;

export type SpireStepTask = ArenaAnswerCheckTask & Readonly<{
  taskIndex: number;
  /** Отдельная соль от Арены: пакет недели, не matchId — см. preflight §1. */
}>;

export type SpireStepPlan = Readonly<{
  packHash: string;
  saltId: string;
  lang: string;
  tier: number;
  floor: number;
  step: number;
  /** Бюджет ступени целиком, из конфига (T8), не пересчитывается клиентом. */
  budgetMs: number;
  tasks: readonly SpireStepTask[];
}>;

export type SpireStepPhaseKind =
  | 'active'
  | 'revealing'
  /** Свёрнуто/звонок — таймер стоит, задание скрыто (T18). */
  | 'paused'
  | 'passed'
  | 'failed';

/** Почему ступень провалена — нужно для честного экрана и для «Мои ошибки». */
export type SpireStepFailReason = 'hearts' | 'timeout' | 'backed_out';

export type SpireTaskOutcome = Readonly<{
  taskIndex: number;
  /** true для голосового пропуска без штрафа — см. SPIRE_VOICE_MAX_RETRIES. */
  skippedNoPenalty: boolean;
  correct: boolean;
  elapsedMs: number;
}>;

export type SpireStepState = Readonly<{
  schemaVersion: typeof SPIRE_STEP_SCHEMA_VERSION;
  packHash: string;
  step: number;

  phase: SpireStepPhaseKind;
  taskIndex: number;
  hearts: number;
  /** Сколько бюджета ступени уже израсходовано (не «осталось» — проще редьюсить). */
  elapsedBudgetMs: number;
  budgetMs: number;

  /** Куда встать при возврате из paused: то, что было ДО сворачивания. */
  phaseBeforePauseKind: 'active' | 'revealing' | null;
  pausedAtElapsedMs: number;

  voiceRetriesByTask: Readonly<Record<number, number>>;
  outcomes: readonly SpireTaskOutcome[];
  failReason: SpireStepFailReason | null;
}>;

export function createSpireStepState(plan: SpireStepPlan): SpireStepState {
  return {
    schemaVersion: SPIRE_STEP_SCHEMA_VERSION,
    packHash: plan.packHash,
    step: plan.step,
    phase: 'active',
    taskIndex: 0,
    hearts: SPIRE_STEP_MAX_HEARTS,
    elapsedBudgetMs: 0,
    budgetMs: plan.budgetMs,
    phaseBeforePauseKind: null,
    pausedAtElapsedMs: 0,
    voiceRetriesByTask: {},
    outcomes: [],
    failReason: null,
  };
}

/**
 * Тик таймера. Прирост elapsedMs приходит от вызывающего кода (requestAnimationFrame
 * дельта или интервал) — здесь нет чтения часов, как в match_machine.
 */
export function tickSpireBudget(state: SpireStepState, deltaMs: number): SpireStepState {
  if (state.phase !== 'active' && state.phase !== 'revealing') return state;
  const elapsedBudgetMs = state.elapsedBudgetMs + Math.max(0, deltaMs);
  if (elapsedBudgetMs >= state.budgetMs) {
    return { ...state, phase: 'failed', failReason: 'timeout', elapsedBudgetMs: state.budgetMs };
  }
  return { ...state, elapsedBudgetMs };
}

/** Приложение свернулось / пришёл звонок (T18): таймер стоит, задание скрыто. */
export function pauseSpireStep(state: SpireStepState): SpireStepState {
  if (state.phase !== 'active' && state.phase !== 'revealing') return state;
  return {
    ...state,
    phase: 'paused',
    phaseBeforePauseKind: state.phase,
    pausedAtElapsedMs: state.elapsedBudgetMs,
  };
}

/** Вернулись на передний план: продолжаем ровно с той же точки бюджета. */
export function resumeSpireStep(state: SpireStepState): SpireStepState {
  if (state.phase !== 'paused' || !state.phaseBeforePauseKind) return state;
  return { ...state, phase: state.phaseBeforePauseKind, phaseBeforePauseKind: null };
}

/**
 * «Назад» с подтверждением пользователя (T18) — НЕ то же самое, что pause.
 * Вызывать только после явного подтверждения в UI, не на голый blur.
 */
export function backOutSpireStep(state: SpireStepState): SpireStepState {
  if (state.phase === 'passed' || state.phase === 'failed') return state;
  return { ...state, phase: 'failed', failReason: 'backed_out' };
}

function withOutcome(state: SpireStepState, outcome: SpireTaskOutcome): SpireStepState {
  const outcomes = [...state.outcomes, outcome];
  const nextIndex = state.taskIndex + 1;
  if (!outcome.correct && !outcome.skippedNoPenalty) {
    const hearts = state.hearts - 1;
    if (hearts <= 0) {
      return { ...state, outcomes, hearts: 0, phase: 'failed', failReason: 'hearts', taskIndex: nextIndex };
    }
    return { ...state, outcomes, hearts, phase: 'revealing', taskIndex: nextIndex };
  }
  if (nextIndex >= SPIRE_STEP_TASK_COUNT) {
    return { ...state, outcomes, phase: 'passed', taskIndex: nextIndex };
  }
  return { ...state, outcomes, phase: outcome.correct ? 'active' : 'revealing', taskIndex: nextIndex };
}

/** Обычный ответ (choice/translate/dictate) — правильность через answer_check.ts. */
export function submitSpireAnswer(
  state: SpireStepState,
  plan: SpireStepPlan,
  answer: unknown,
  elapsedMs: number,
): SpireStepState {
  if (state.phase !== 'active') return state;
  const task = plan.tasks[state.taskIndex];
  if (!task) return state;
  const correct = arenaAnswerIsCorrect(plan.saltId, task, answer);
  return withOutcome(state, { taskIndex: state.taskIndex, correct, elapsedMs, skippedNoPenalty: false });
}

/** Пара (match-режим) — та же честность отпечатков, что у Арены. */
export function submitSpirePair(
  state: SpireStepState,
  plan: SpireStepPlan,
  pairIndex: number,
  selectedIndex: number,
  elapsedMs: number,
): SpireStepState {
  if (state.phase !== 'active') return state;
  const task = plan.tasks[state.taskIndex];
  if (!task) return state;
  const correct = arenaPairIsCorrect(plan.saltId, task, pairIndex, selectedIndex);
  return withOutcome(state, { taskIndex: state.taskIndex, correct, elapsedMs, skippedNoPenalty: false });
}

/**
 * Голосовой вердикт приходит готовым извне (распознавание уже произошло).
 * T22: неверно — ещё попытка, пока не исчерпан SPIRE_VOICE_MAX_RETRIES;
 * после исчерпания — пропуск БЕЗ потери сердца.
 */
export function submitSpireVoiceVerdict(
  state: SpireStepState,
  correct: boolean,
  elapsedMs: number,
): SpireStepState {
  if (state.phase !== 'active') return state;
  if (correct) {
    return withOutcome(state, { taskIndex: state.taskIndex, correct: true, elapsedMs, skippedNoPenalty: false });
  }
  const usedRetries = state.voiceRetriesByTask[state.taskIndex] ?? 0;
  if (usedRetries < SPIRE_VOICE_MAX_RETRIES) {
    return {
      ...state,
      voiceRetriesByTask: { ...state.voiceRetriesByTask, [state.taskIndex]: usedRetries + 1 },
    };
  }
  return withOutcome(state, { taskIndex: state.taskIndex, correct: false, elapsedMs, skippedNoPenalty: true });
}

/** После показа правильного ответа (T20) — переход к следующему заданию. */
export function advanceAfterReveal(state: SpireStepState): SpireStepState {
  if (state.phase !== 'revealing') return state;
  return { ...state, phase: 'active' };
}
