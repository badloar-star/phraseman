import type { ArenaEntryMode, ArenaTaskMode } from './contract';
import {
  ARENA_ANSWER_MS,
  ARENA_SPEED_MATCH_PAIRS,
  arenaAwardStars,
  arenaClampRaceMs,
  arenaMatchStarCeiling,
  type ArenaStarAward,
  type ArenaTaskOutcome,
  type ArenaTaskOutcomeStatus,
} from './stars';

/**
 * Локальная машина матча — чистый редьюсер.
 *
 * Владелец (D-12): задержек быть не должно вообще. Значит матч считается на
 * устройстве: все задания и правильные ответы приезжают одним ответом при
 * старте, клиент сам ведёт таймер и сам мгновенно показывает вердикт.
 *
 * Здесь нет ни React, ни Firebase, ни чтения часов: каждое событие приносит
 * своё время. План матча передаётся аргументом и НЕ хранится в состоянии —
 * состояние остаётся около двух килобайт и сериализуемым, план может весить
 * сотни килобайт и неизменен.
 */

export const ARENA_LOCAL_SCHEMA_VERSION = 'arena-local-match.v2' as const;

/** Пауза на прочтение задания до старта таймера ответа. */
export const ARENA_LOCAL_READING_MS = 1_500;
/** Показ результата задания перед следующим. */
export const ARENA_LOCAL_REVEAL_MS = 1_200;
/** Задержка перед разрешением награды: за это время успевает прийти тик соперника. */
export const ARENA_LOCAL_AWARD_RESOLVE_MS = 600;
/** Матч, к которому не возвращались дольше этого, считается брошенным. */
export const ARENA_LOCAL_ABANDON_MS = 10 * 60 * 1_000;
/** Расхождение стенных и монотонных часов, после которого им нет веры. */
export const ARENA_LOCAL_CLOCK_SUSPECT_MS = 5_000;

export type ArenaLocalPhaseKind = 'countdown' | 'reading' | 'answer' | 'reveal' | 'finished';

/** Что известно про соперника на конкретном задании. */
export type ArenaOpponentTick = Readonly<{
  taskIndex: number;
  correct: boolean;
  raceElapsedMs: number;
  /** Display-only cumulative live score; never used for settlement. */
  matchStars?: number;
  /** Scripted speed board precision; absent means the exact score is unknown. */
  firstAttemptPairs?: number;
}>;

export type ArenaMatchPlanTask = Readonly<{
  taskIndex: number;
  mode: ArenaTaskMode;
}>;

export type ArenaMatchPlan = Readonly<{
  matchId: string;
  seat: 'a' | 'b';
  mode: ArenaEntryMode;
  planHash: string;
  tasks: readonly ArenaMatchPlanTask[];
}>;

export type ArenaLocalMatchState = Readonly<{
  schemaVersion: typeof ARENA_LOCAL_SCHEMA_VERSION;
  matchId: string;
  seat: 'a' | 'b';
  mode: ArenaEntryMode;
  taskCount: number;
  planHash: string;

  phase: ArenaLocalPhaseKind;
  taskIndex: number;
  phaseStartedAtMonoMs: number;
  phaseStartedAtWallMs: number;
  phaseBudgetMs: number;
  monoEpochId: string;

  outcomes: readonly ArenaTaskOutcome[];
  /** Черновик текущего задания на пары: сколько попыток по каждой левой карточке. */
  /**
   * Журнал тыков по текущей доске пар: номер пары → выбранные индексы ПО
   * ПОРЯДКУ. Раньше здесь лежал счётчик, и этого не хватало: сервер обязан
   * пересчитать «угадано с первой попытки» сам, а по одному числу проверить
   * нечего — пришлось бы верить клиенту, и перебор снова стал бы выгодным.
   */
  pairAttempts: Readonly<Record<number, readonly number[]>>;
  pairFirstAttemptCorrect: Readonly<Record<number, boolean>>;
  /** Журналы всех закрытых досок: попадают в отчёт, сервер считает по ним. */
  pairAttemptsByTask: Readonly<Record<number, Readonly<Record<number, readonly number[]>>>>;

  awards: readonly ArenaStarAward[];
  matchStars: number;
  comboRun: number;
  longestCombo: number;
  correctCount: number;
  firstCount: number;
  tieBreakElapsedMs: number;

  opponentByTask: Readonly<Record<number, ArenaOpponentTick>>;
  opponentFinished: boolean;
  /** Момент, когда награда за текущее задание становится окончательной. */
  awardResolveAtMonoMs: number | null;

  clockSuspect: boolean;
  lastEventAtMonoMs: number;
  lastEventAtWallMs: number;
  startedAtWallMs: number;
  finishedAtWallMs: number | null;
  abandoned: boolean;
}>;

export type ArenaLocalEvent =
  | { type: 'tick'; monoNowMs: number }
  | { type: 'answer'; monoNowMs: number; wallNowMs: number; correct: boolean; answer: unknown }
  | { type: 'speed_attempt'; monoNowMs: number; pairIndex: number; selectedIndex: number; correct: boolean }
  | { type: 'award_resolve'; monoNowMs: number }
  | { type: 'opponent_answered'; monoNowMs: number; tick: ArenaOpponentTick }
  | { type: 'opponent_finished'; monoNowMs: number }
  | { type: 'resume'; monoNowMs: number; wallNowMs: number; monoEpochId: string }
  | { type: 'task_broken'; monoNowMs: number; taskIndex: number }
  | { type: 'abandon'; monoNowMs: number; wallNowMs: number };

export type ArenaMatchReport = Readonly<{
  schemaVersion: typeof ARENA_LOCAL_SCHEMA_VERSION;
  matchId: string;
  seat: 'a' | 'b';
  planHash: string;
  outcomes: readonly ArenaTaskOutcome[];
  /**
   * Журналы тыков по доскам пар. Сервер пересчитывает по ним и заявленному
   * `firstAttemptPairs` не верит.
   */
  pairAttemptsByTask: Readonly<Record<number, Readonly<Record<number, readonly number[]>>>>;
  matchStars: number;
  tieBreakElapsedMs: number;
  correctCount: number;
  firstCount: number;
  longestCombo: number;
  clockSuspect: boolean;
  abandoned: boolean;
  startedAtWallMs: number;
  finishedAtWallMs: number;
}>;

/* ------------------------------ помощники -------------------------------- */

function modeAt(plan: ArenaMatchPlan, taskIndex: number): ArenaTaskMode {
  return plan.tasks[taskIndex]?.mode ?? 'guess_phrase';
}

function answerBudgetMs(plan: ArenaMatchPlan, taskIndex: number): number {
  return ARENA_ANSWER_MS[modeAt(plan, taskIndex)];
}

function emptyState(plan: ArenaMatchPlan): Omit<ArenaLocalMatchState,
  'phase' | 'taskIndex' | 'phaseStartedAtMonoMs' | 'phaseStartedAtWallMs' | 'phaseBudgetMs'
  | 'monoEpochId' | 'lastEventAtMonoMs' | 'lastEventAtWallMs' | 'startedAtWallMs'> {
  return {
    schemaVersion: ARENA_LOCAL_SCHEMA_VERSION,
    matchId: plan.matchId,
    seat: plan.seat,
    mode: plan.mode,
    taskCount: plan.tasks.length,
    planHash: plan.planHash,
    outcomes: [],
    pairAttempts: {},
    pairFirstAttemptCorrect: {},
    pairAttemptsByTask: {},
    awards: [],
    matchStars: 0,
    comboRun: 0,
    longestCombo: 0,
    correctCount: 0,
    firstCount: 0,
    tieBreakElapsedMs: 0,
    opponentByTask: {},
    opponentFinished: false,
    awardResolveAtMonoMs: null,
    clockSuspect: false,
    finishedAtWallMs: null,
    abandoned: false,
  };
}

export function arenaLocalMatchInit(
  plan: ArenaMatchPlan,
  at: Readonly<{ monoNowMs: number; wallNowMs: number; monoEpochId: string; countdownRemainingMs: number }>,
): ArenaLocalMatchState {
  return {
    ...emptyState(plan),
    phase: 'countdown',
    taskIndex: 0,
    phaseStartedAtMonoMs: at.monoNowMs,
    phaseStartedAtWallMs: at.wallNowMs,
    phaseBudgetMs: Math.max(0, at.countdownRemainingMs),
    monoEpochId: at.monoEpochId,
    lastEventAtMonoMs: at.monoNowMs,
    lastEventAtWallMs: at.wallNowMs,
    startedAtWallMs: at.wallNowMs,
  };
}

/** Переход к следующей фазе после закрытия задания. */
function enterPhase(
  plan: ArenaMatchPlan,
  state: ArenaLocalMatchState,
  phase: ArenaLocalPhaseKind,
  taskIndex: number,
  monoNowMs: number,
  wallNowMs: number,
): ArenaLocalMatchState {
  const budget = phase === 'reading' ? ARENA_LOCAL_READING_MS
    : phase === 'answer' ? answerBudgetMs(plan, taskIndex)
    : phase === 'reveal' ? ARENA_LOCAL_REVEAL_MS
    : 0;
  return {
    ...state,
    phase,
    taskIndex,
    phaseStartedAtMonoMs: monoNowMs,
    phaseStartedAtWallMs: wallNowMs,
    phaseBudgetMs: budget,
    pairAttempts: phase === 'reading' ? {} : state.pairAttempts,
    pairFirstAttemptCorrect: phase === 'reading' ? {} : state.pairFirstAttemptCorrect,
    awardResolveAtMonoMs: null,
    ...(phase === 'finished' ? { finishedAtWallMs: wallNowMs } : {}),
  };
}

/**
 * Закрывает задание: считает награду и решает, куда идти дальше.
 *
 * Награда считается ЗДЕСЬ, а не при отправке на сервер: игрок обязан видеть
 * причину «+3 · ты ответил первым» или «+2 · соперник успел раньше» прямо на
 * задании, в момент начисления (D-38).
 */
function finalizeTask(
  plan: ArenaMatchPlan,
  state: ArenaLocalMatchState,
  input: Readonly<{
    status: ArenaTaskOutcomeStatus;
    raceElapsedMs: number;
    firstAttemptPairs: number;
    resolvedPairs: number;
    answer: unknown;
    monoNowMs: number;
    wallNowMs: number;
  }>,
): ArenaLocalMatchState {
  const taskIndex = state.taskIndex;
  const mode = modeAt(plan, taskIndex);
  const rival = state.opponentByTask[taskIndex];
  const race = arenaClampRaceMs(input.raceElapsedMs, mode);

  const award = arenaAwardStars({
    mode,
    status: input.status,
    raceElapsedMs: race,
    firstAttemptPairs: input.firstAttemptPairs,
    opponentRaceElapsedMs: rival ? rival.raceElapsedMs : null,
    opponentCorrect: rival ? rival.correct : false,
    comboRunBefore: state.comboRun,
  });

  const outcome: ArenaTaskOutcome = {
    taskIndex,
    mode,
    status: input.status,
    raceElapsedMs: race,
    firstAttemptPairs: input.firstAttemptPairs,
    resolvedPairs: input.resolvedPairs,
    answer: input.answer,
  };

  const solved = mode === 'speed_match' ? input.firstAttemptPairs > 0 : input.status === 'correct';
  const ceiling = arenaMatchStarCeiling(plan.tasks.length);
  const rawStars = state.matchStars + award.stars;

  const next: ArenaLocalMatchState = {
    ...state,
    outcomes: [...state.outcomes, outcome],
    awards: [...state.awards, award],
    matchStars: ceiling > 0 ? Math.min(rawStars, ceiling) : rawStars,
    comboRun: award.comboRunAfter,
    longestCombo: Math.max(state.longestCombo, award.comboRunAfter),
    correctCount: state.correctCount + (solved ? 1 : 0),
    firstCount: state.firstCount + award.firstBonus,
    tieBreakElapsedMs: state.tieBreakElapsedMs + award.tieBreakElapsedMs,
  };

  const isLast = taskIndex >= plan.tasks.length - 1;
  return isLast
    ? enterPhase(plan, next, 'finished', taskIndex, input.monoNowMs, input.wallNowMs)
    : enterPhase(plan, next, 'reveal', taskIndex, input.monoNowMs, input.wallNowMs);
}

/** Закрывает задание просрочкой — без ответа и без звёзд. */
function timeoutTask(
  plan: ArenaMatchPlan,
  state: ArenaLocalMatchState,
  monoNowMs: number,
  wallNowMs: number,
): ArenaLocalMatchState {
  return finalizeTask(plan, state, {
    status: 'timeout',
    raceElapsedMs: answerBudgetMs(plan, state.taskIndex),
    firstAttemptPairs: 0,
    resolvedPairs: 0,
    answer: null,
    monoNowMs,
    wallNowMs,
  });
}

/** Сколько пар угадано с первой попытки в текущем черновике. */
function firstAttemptPairs(state: ArenaLocalMatchState): number {
  return Object.values(state.pairFirstAttemptCorrect).filter(Boolean).length;
}

function resolvedPairs(state: ArenaLocalMatchState): number {
  return Object.keys(state.pairFirstAttemptCorrect).length;
}

/**
 * Прокручивает фазы вперёд, пока накопленного времени хватает. Используется и
 * обычным тиком, и возвратом из сна: пока приложение свёрнуто, таймеры не идут,
 * и полагаться на них было бы ошибкой.
 */
function advance(
  plan: ArenaMatchPlan,
  state: ArenaLocalMatchState,
  monoNowMs: number,
  wallNowMs: number,
): ArenaLocalMatchState {
  let current = state;
  // Ограничение на число шагов: защита от бесконечного цикла при порче данных.
  for (let guard = 0; guard <= plan.tasks.length * 3 + 4; guard += 1) {
    if (current.phase === 'finished') return current;
    const elapsed = monoNowMs - current.phaseStartedAtMonoMs;
    if (elapsed < current.phaseBudgetMs) return current;

    const boundaryMono = current.phaseStartedAtMonoMs + current.phaseBudgetMs;
    const boundaryWall = current.phaseStartedAtWallMs + current.phaseBudgetMs;

    if (current.phase === 'countdown') {
      current = enterPhase(plan, current, 'reading', 0, boundaryMono, boundaryWall);
      continue;
    }
    if (current.phase === 'reading') {
      current = enterPhase(plan, current, 'answer', current.taskIndex, boundaryMono, boundaryWall);
      continue;
    }
    if (current.phase === 'answer') {
      const mode = modeAt(plan, current.taskIndex);
      current = mode === 'speed_match' && resolvedPairs(current) > 0
        ? finalizeTask(plan, current, {
          status: 'correct',
          raceElapsedMs: answerBudgetMs(plan, current.taskIndex),
          firstAttemptPairs: firstAttemptPairs(current),
          resolvedPairs: resolvedPairs(current),
          answer: null,
          monoNowMs: boundaryMono,
          wallNowMs: boundaryWall,
        })
        : timeoutTask(plan, current, boundaryMono, boundaryWall);
      continue;
    }
    // reveal
    current = enterPhase(plan, current, 'reading', current.taskIndex + 1, boundaryMono, boundaryWall);
  }
  return current;
}

export function arenaLocalMatchReduce(
  plan: ArenaMatchPlan,
  state: ArenaLocalMatchState,
  event: ArenaLocalEvent,
): ArenaLocalMatchState {
  if (state.phase === 'finished' && event.type !== 'opponent_finished') return state;

  const wallNowMs = 'wallNowMs' in event ? event.wallNowMs : state.lastEventAtWallMs
    + (event.monoNowMs - state.lastEventAtMonoMs);

  let base: ArenaLocalMatchState = {
    ...state,
    lastEventAtMonoMs: Math.max(state.lastEventAtMonoMs, event.monoNowMs),
    lastEventAtWallMs: wallNowMs,
  };

  // Часы сравниваются по ОДНОРОДНЫМ величинам: разница стенных против разницы
  // монотонных от одного и того же прошлого события. Сравнение с началом фазы
  // не срабатывало бы никогда.
  if ('wallNowMs' in event) {
    const wallDelta = event.wallNowMs - state.lastEventAtWallMs;
    const monoDelta = event.monoNowMs - state.lastEventAtMonoMs;
    if (wallDelta < 0 || Math.abs(wallDelta - monoDelta) > ARENA_LOCAL_CLOCK_SUSPECT_MS) {
      base = { ...base, clockSuspect: true };
    }
  }

  switch (event.type) {
    case 'tick':
      return advance(plan, base, event.monoNowMs, wallNowMs);

    case 'answer': {
      if (base.phase !== 'answer') return advance(plan, base, event.monoNowMs, wallNowMs);
      // Задание на пары закрывается только попытками по парам. Обычный ответ
      // здесь означал бы ноль звёзд при полностью собранной доске.
      if (modeAt(plan, base.taskIndex) === 'speed_match') return base;
      const elapsed = event.monoNowMs - base.phaseStartedAtMonoMs;
      const finalized = finalizeTask(plan, base, {
        status: event.correct ? 'correct' : 'wrong',
        raceElapsedMs: elapsed,
        firstAttemptPairs: 0,
        resolvedPairs: 0,
        answer: event.answer,
        monoNowMs: event.monoNowMs,
        wallNowMs,
      });
      // Награда показывается сразу, но становится окончательной через паузу —
      // за неё успевает прийти тик соперника, и «+3» не превращается в «+2».
      return { ...finalized, awardResolveAtMonoMs: event.monoNowMs + ARENA_LOCAL_AWARD_RESOLVE_MS };
    }

    case 'speed_attempt': {
      if (base.phase !== 'answer' || modeAt(plan, base.taskIndex) !== 'speed_match') return base;
      const journalBefore = base.pairAttempts[event.pairIndex] ?? [];
      // Повтор того же тыка (двойное нажатие, дребезг) не должен выглядеть как
      // вторая попытка — иначе игрок терял бы звезду за собственный палец.
      if (journalBefore[journalBefore.length - 1] === event.selectedIndex) return base;
      const attemptsBefore = journalBefore.length;
      const pairAttempts = {
        ...base.pairAttempts,
        [event.pairIndex]: [...journalBefore, event.selectedIndex],
      };
      // Звезда даётся только за пару, угаданную С ПЕРВОЙ попытки: иначе перебор
      // приносит четыре звезды без единого знания.
      const pairFirstAttemptCorrect = event.correct
        ? { ...base.pairFirstAttemptCorrect, [event.pairIndex]: attemptsBefore === 0 }
        : base.pairFirstAttemptCorrect;
      const next = {
        ...base,
        pairAttempts,
        pairFirstAttemptCorrect,
        pairAttemptsByTask: { ...base.pairAttemptsByTask, [base.taskIndex]: pairAttempts },
      };
      // Доска закрывается, когда разобраны все четыре пары. Неверный тык пару
      // не закрывает: игрок пробует дальше, но звезды за неё уже не получит.
      if (resolvedPairs(next) < ARENA_SPEED_MATCH_PAIRS) return next;
      const elapsed = event.monoNowMs - next.phaseStartedAtMonoMs;
      return finalizeTask(plan, next, {
        status: 'correct',
        raceElapsedMs: elapsed,
        firstAttemptPairs: firstAttemptPairs(next),
        resolvedPairs: resolvedPairs(next),
        answer: null,
        monoNowMs: event.monoNowMs,
        wallNowMs,
      });
    }

    case 'award_resolve':
      return { ...base, awardResolveAtMonoMs: null };

    case 'opponent_answered': {
      const known = base.opponentByTask[event.tick.taskIndex];
      if (known) return base;
      return { ...base, opponentByTask: { ...base.opponentByTask, [event.tick.taskIndex]: event.tick } };
    }

    case 'opponent_finished':
      return { ...base, opponentFinished: true };

    case 'task_broken': {
      if (base.phase !== 'answer' || event.taskIndex !== base.taskIndex) return base;
      return finalizeTask(plan, base, {
        status: 'broken',
        raceElapsedMs: event.monoNowMs - base.phaseStartedAtMonoMs,
        firstAttemptPairs: 0,
        resolvedPairs: 0,
        answer: null,
        monoNowMs: event.monoNowMs,
        wallNowMs,
      });
    }

    case 'resume': {
      // Холодный старт: сохранённое монотонное начало отсчёта потеряло смысл.
      // Восстанавливаем прошедшее по стенным часам ровно один раз и никогда не
      // начисляем звёзды за восстановленное время — незакрытое задание
      // закрывается просрочкой.
      if (event.monoEpochId !== base.monoEpochId) {
        const wallElapsed = Math.max(0, event.wallNowMs - base.phaseStartedAtWallMs);
        const rebased: ArenaLocalMatchState = {
          ...base,
          monoEpochId: event.monoEpochId,
          phaseStartedAtMonoMs: event.monoNowMs - Math.min(wallElapsed, base.phaseBudgetMs),
          clockSuspect: true,
        };
        const closed = rebased.phase === 'answer'
          ? timeoutTask(plan, rebased, event.monoNowMs, event.wallNowMs)
          : rebased;
        return advance(plan, closed, event.monoNowMs, event.wallNowMs);
      }
      // Сравнивать надо с временем ПРЕДЫДУЩЕГО события: `base` уже обновлён
      // текущим, и разница всегда была бы нулевой.
      if (arenaLocalMatchAbandoned(state, event.wallNowMs)) {
        let closed = base;
        while (closed.phase !== 'finished') {
          closed = closed.phase === 'answer'
            ? timeoutTask(plan, closed, event.monoNowMs, event.wallNowMs)
            : enterPhase(plan, closed,
              closed.phase === 'reveal' ? 'reading' : closed.phase === 'reading' ? 'answer' : 'reading',
              closed.phase === 'reveal' ? closed.taskIndex + 1 : closed.taskIndex,
              event.monoNowMs, event.wallNowMs);
          if (closed.taskIndex >= plan.tasks.length) {
            closed = enterPhase(plan, closed, 'finished', plan.tasks.length - 1, event.monoNowMs, event.wallNowMs);
          }
        }
        return { ...closed, abandoned: true };
      }
      return advance(plan, base, event.monoNowMs, event.wallNowMs);
    }

    case 'abandon': {
      let closed = base;
      let guard = 0;
      while (closed.phase !== 'finished' && guard <= plan.tasks.length * 3 + 4) {
        guard += 1;
        closed = timeoutTask(plan, closed, event.monoNowMs, event.wallNowMs);
        if (closed.phase === 'reveal') {
          closed = enterPhase(plan, closed, 'reading', closed.taskIndex + 1, event.monoNowMs, event.wallNowMs);
        }
      }
      return { ...closed, abandoned: true, finishedAtWallMs: event.wallNowMs };
    }

    default:
      return base;
  }
}

export function arenaLocalMatchAbandoned(state: ArenaLocalMatchState, wallNowMs: number): boolean {
  return wallNowMs - state.lastEventAtWallMs > ARENA_LOCAL_ABANDON_MS;
}

export function arenaLocalMatchReport(
  plan: ArenaMatchPlan,
  state: ArenaLocalMatchState,
): ArenaMatchReport | null {
  if (state.phase !== 'finished') return null;
  return {
    schemaVersion: ARENA_LOCAL_SCHEMA_VERSION,
    matchId: plan.matchId,
    seat: plan.seat,
    planHash: plan.planHash,
    outcomes: state.outcomes,
    pairAttemptsByTask: state.pairAttemptsByTask,
    matchStars: state.matchStars,
    tieBreakElapsedMs: state.tieBreakElapsedMs,
    correctCount: state.correctCount,
    firstCount: state.firstCount,
    longestCombo: state.longestCombo,
    clockSuspect: state.clockSuspect,
    abandoned: state.abandoned,
    startedAtWallMs: state.startedAtWallMs,
    finishedAtWallMs: state.finishedAtWallMs ?? state.lastEventAtWallMs,
  };
}
