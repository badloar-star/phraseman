import type { MistakeExerciseSupport } from './exercise_mode_registry';

/**
 * Правило исправления ошибки «Мои ошибки 3.0» (решение владельца D203, 2026-11-11).
 *
 * зачем: один верный ответ на лёгкий вопрос не отличает «угадал» от «понял». Ошибка считается исправленной после
 * трёх шагов от лёгкого к самостоятельному, сразу уходит из списка «Ждут», а через несколько дней приходит одна
 * проверка: верно — закреплена навсегда, промах — возвращается в список с нуля.
 *
 * Чистая функция без хранилища и часов: состояние и событие на входе, новое состояние на выходе.
 * ⚠️ В проекцию журнала (projection.ts) пока НЕ подключено: тот файл 11.11 правился другой сессией. При подключении
 * нужен рубеж по времени события — ответы до включения правила читаются по прежнему правилу, иначе давно
 * исправленные ошибки «воскреснут» при пересчёте журнала.
 */

/** Сколько верных шагов подряд по лестнице нужно, чтобы ошибка ушла из списка. */
export const MISTAKE_STEPS_REQUIRED = 3;
/** Через сколько после третьего шага приходит проверка. */
export const MISTAKE_CHECK_DELAY_MS = 3 * 24 * 60 * 60 * 1000;
/** Сколько промахов подряд делают ошибку «упрямой» (задания прекращаются, открывается разбор). */
export const MISTAKE_STUBBORN_AFTER_MISSES = 3;

/**
 * На сколько упрямая ошибка уходит из занятий. зачем (владелец 11.11, D203): после трёх промахов подряд экран говорит
 * «Вернёмся к этой фразе завтра» — раньше за этими словами ничего не стояло, ошибка оставалась доступной сразу.
 * Теперь обещание исполняется: сутки ошибка не попадает в занятия. Новый промах в уроке возвращает её сразу.
 */
export const MISTAKE_STUBBORN_REST_MS = 24 * 60 * 60 * 1000;

/** steps — идёт отработка; check — ждёт проверку; done — закреплена. */
export type MistakeStepPhase = 'steps' | 'check' | 'done';

export interface MistakeStepState {
  readonly phase: MistakeStepPhase;
  readonly stepsDone: number;
  readonly checkDueAtMs: number | null;
  readonly missesInRow: number;
  readonly stubborn: boolean;
}

export interface MistakeStepAnswer {
  readonly correct: boolean;
  readonly occurredAtMs: number;
  /** true — это ответ на проверку исправленной ошибки, а не обычный шаг отработки. */
  readonly check?: boolean;
}

export function initialMistakeStepState(): MistakeStepState {
  return { phase: 'steps', stepsDone: 0, checkDueAtMs: null, missesInRow: 0, stubborn: false };
}

/** Какое задание положено на текущем шаге: узнать → с опорой → самостоятельно. */
export function mistakeStepSupport(state: MistakeStepState): MistakeExerciseSupport {
  if (state.stepsDone <= 0) return 'recognition';
  if (state.stepsDone === 1) return 'guided';
  return 'production';
}

/** Пора ли показывать проверку: только у ошибки в фазе check и не раньше её срока. */
export function isMistakeCheckDue(state: MistakeStepState, nowMs: number): boolean {
  return state.phase === 'check' && state.checkDueAtMs !== null && nowMs >= state.checkDueAtMs;
}

/**
 * Сколько кружков-шагов закрашено у ошибки на экранах (ответ в отработке, хаб, список, паспорт): 0..3.
 * зачем (D203): единственное место расчёта — все экраны показывают одно число. Исправленная ошибка — всегда 3
 * (в том числе исправленная по прежнему правилу, где шагов не считали).
 */
export function mistakeStepsShown(item: Readonly<{ status: string; supportPassCount?: number }>): number {
  if (item.status === 'corrected') return MISTAKE_STEPS_REQUIRED;
  const steps = Number.isFinite(item.supportPassCount) ? Math.floor(item.supportPassCount as number) : 0;
  return Math.max(0, Math.min(MISTAKE_STEPS_REQUIRED, steps));
}

export function applyMistakeStepAnswer(state: MistakeStepState, answer: MistakeStepAnswer): MistakeStepState {
  // Закреплённую ошибку ответы больше не меняют: вернуть её может только новая ошибка в уроке (событие captured).
  if (state.phase === 'done') return state;

  if (state.phase === 'check') {
    // Обычная отработка не трогает ошибку, которая ждёт проверку: иначе лишний ответ «снял» бы проверку или вернул ошибку.
    if (answer.check !== true) return state;
    if (answer.correct) {
      return { phase: 'done', stepsDone: MISTAKE_STEPS_REQUIRED, checkDueAtMs: null, missesInRow: 0, stubborn: false };
    }
    return { phase: 'steps', stepsDone: 0, checkDueAtMs: null, missesInRow: 1, stubborn: false };
  }

  if (!answer.correct) {
    const missesInRow = state.missesInRow + 1;
    return {
      phase: 'steps',
      // Промах возвращает на шаг ниже, а не в самое начало: человек уже показал, что лёгкий шаг ему по силам.
      stepsDone: Math.max(0, state.stepsDone - 1),
      checkDueAtMs: null,
      missesInRow,
      stubborn: missesInRow >= MISTAKE_STUBBORN_AFTER_MISSES,
    };
  }

  const stepsDone = Math.min(MISTAKE_STEPS_REQUIRED, state.stepsDone + 1);
  if (stepsDone >= MISTAKE_STEPS_REQUIRED) {
    return {
      phase: 'check',
      stepsDone,
      checkDueAtMs: answer.occurredAtMs + MISTAKE_CHECK_DELAY_MS,
      missesInRow: 0,
      stubborn: false,
    };
  }
  return { phase: 'steps', stepsDone, checkDueAtMs: null, missesInRow: 0, stubborn: false };
}
