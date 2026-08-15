import { ARENA_ANSWER_MS, type ArenaStarAward } from './stars';
import {
  ARENA_LOCAL_READING_MS,
  ARENA_LOCAL_REVEAL_MS,
  type ArenaLocalMatchState,
  type ArenaMatchPlan,
} from './match_machine';

/**
 * Часы матча для интерфейса.
 *
 * Считаются из состояния и монотонного «сейчас» — без единого чтения сети.
 *
 * Здесь же исправлен старый дефект: раньше на экране показывалось 11 секунд на
 * восьмисекундном задании, потому что дедлайн включал паузу на чтение и сетевой
 * запас. Сетевого запаса на клиенте больше нет — принимать нечего, значит и
 * прощать нечего.
 */

export type ArenaLocalPhase =
  | Readonly<{ kind: 'countdown'; remainingMs: number }>
  | Readonly<{ kind: 'reading'; taskIndex: number; remainingMs: number }>
  | Readonly<{ kind: 'answer'; taskIndex: number; remainingMs: number; budgetMs: number }>
  | Readonly<{ kind: 'reveal'; taskIndex: number; remainingMs: number; award?: ArenaStarAward }>
  | Readonly<{ kind: 'finished' }>;

export function arenaLocalPhase(state: ArenaLocalMatchState, monoNowMs: number): ArenaLocalPhase {
  if (state.phase === 'finished') return { kind: 'finished' };
  // Ограничение сверху, а не только снизу: если часы почему-то оказались
  // ПОЗАДИ начала фазы, остаток без потолка вылез бы за полное окно, и кольцо
  // таймера прокрутилось бы больше оборота. Монотонные часы такого дать не
  // должны, но рисовать сломанное кольцо на всякий случай незачем.
  const elapsedMs = monoNowMs - state.phaseStartedAtMonoMs;
  const remainingMs = Math.min(state.phaseBudgetMs, Math.max(0, state.phaseBudgetMs - elapsedMs));
  if (state.phase === 'countdown') return { kind: 'countdown', remainingMs };
  if (state.phase === 'reading') return { kind: 'reading', taskIndex: state.taskIndex, remainingMs };
  if (state.phase === 'answer') {
    return { kind: 'answer', taskIndex: state.taskIndex, remainingMs, budgetMs: state.phaseBudgetMs };
  }
  return {
    kind: 'reveal',
    taskIndex: state.taskIndex,
    remainingMs,
    award: state.awards[state.awards.length - 1],
  };
}

/**
 * Момент следующей границы фазы. Нужен, чтобы поставить точный таймер: тик раз
 * в четверть секунды годится для видимого счётчика, но границу восьмисекундного
 * окна по нему не поймать без заметного дребезга.
 */
export function arenaLocalNextBoundaryMs(state: ArenaLocalMatchState, monoNowMs: number): number | null {
  if (state.phase === 'finished') return null;
  return Math.max(0, state.phaseStartedAtMonoMs + state.phaseBudgetMs - monoNowMs);
}

/** Полная длительность матча — для дедлайна расчёта на сервере. */
export function arenaLocalMatchBudgetMs(plan: ArenaMatchPlan, countdownMs: number): number {
  return plan.tasks.reduce(
    (sum, task) => sum + ARENA_LOCAL_READING_MS + ARENA_ANSWER_MS[task.mode] + ARENA_LOCAL_REVEAL_MS,
    Math.max(0, countdownMs),
  );
}
