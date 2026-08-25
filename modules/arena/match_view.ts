import type { ArenaLocalMatchState, ArenaOpponentTick } from './match_machine';
import type { ArenaLocalPhase } from './local_clock';
import {
  ARENA_COMBO_THRESHOLD,
  ARENA_SPEED_MATCH_PAIRS,
  arenaAwardStars,
  arenaMatchStarCeiling,
  type ArenaStarAward,
  type ArenaTaskMode,
} from './stars';
import type { ArenaMatchPlanWire, ArenaPlanTaskWire } from './duel_plan';

/**
 * Модель представления матча: что именно рисовать сейчас.
 *
 * Экран не считает ничего сам. Всё, что можно посчитать, посчитано здесь —
 * чистой функцией, которую видно в тесте. Без этого арифметика расползлась бы
 * по JSX, где её не проверить: сколько звёзд полетит в кошелёк, горит ли
 * индикатор соперника, показывать ли комбо.
 */

export type ArenaOpponentSignal =
  /** Про это задание соперник ещё ничего не сообщил. */
  | Readonly<{ kind: 'silent' }>
  /** Соперник ответил, пока игрок ещё думает. Владелец: индикатор обязан сработать сразу. */
  | Readonly<{ kind: 'answered'; correct: boolean; aheadByMs: number | null }>
  /** Соперник закончил весь матч. */
  | Readonly<{ kind: 'finished' }>;

export type ArenaTimerView = Readonly<{
  durationMs: number;
  elapsedMs: number;
  remainingMs: number;
  /** Доля прошедшего, 0..1. Кольцо рисуется по ней. */
  fraction: number;
  /** Осталось меньше трёх секунд — экран переходит в тревожный режим. */
  alarm: boolean;
}>;

export type ArenaComboView = Readonly<{
  streak: number;
  /** Видно только начиная с двойки: единица — не серия. */
  visible: boolean;
  /** Серия уже платит бонус. */
  paying: boolean;
  /** Сколько ещё верных подряд до бонуса. Ноль, когда уже платит. */
  toBonus: number;
}>;

export type ArenaMatchHud = Readonly<{
  taskOrdinal: number;
  taskCount: number;
  task: ArenaPlanTaskWire | null;
  mode: ArenaTaskMode | null;
  timer: ArenaTimerView | null;
  combo: ArenaComboView;
  opponent: ArenaOpponentSignal;
  matchStars: number;
  /** Display-only exact-known rival total. null is intentionally rendered as —. */
  opponentMatchStars: number | null;
  /** Награда за только что закрытое задание. Только в фазе показа результата. */
  award: ArenaStarAward | null;
  /** Сколько звёзд отправить в кошелёк анимацией. Ноль — не запускать вовсе. */
  starsToFly: number;
  /** Доска пар: какие пары уже разобраны. Пусто для остальных заданий. */
  resolvedPairs: readonly number[];
  interactive: boolean;
}>;

/**
 * Exact scripted ticks are match truth before they are presentation truth.
 * Live ticks have no `exact` marker: their arrival already proves that the
 * rival answered, including when restoring an older v2 disk snapshot that
 * predates the explicit reveal map.
 */
function visibleOpponentTick(
  state: ArenaLocalMatchState,
  taskIndex: number,
  includeHiddenExact = false,
): ArenaOpponentTick | undefined {
  const tick = state.opponentByTask[taskIndex];
  if (!tick) return undefined;
  if (includeHiddenExact || !tick.exact || state.opponentRevealedByTask?.[taskIndex]) return tick;
  return undefined;
}

const ALARM_AT_MS = 3_000;

function timerView(phase: ArenaLocalPhase): ArenaTimerView | null {
  if (phase.kind !== 'answer') return null;
  const durationMs = Math.max(1, phase.budgetMs);
  const remainingMs = Math.max(0, Math.min(durationMs, phase.remainingMs));
  const elapsedMs = durationMs - remainingMs;
  return {
    durationMs,
    elapsedMs,
    remainingMs,
    fraction: elapsedMs / durationMs,
    alarm: remainingMs <= ALARM_AT_MS,
  };
}

export function arenaComboView(streak: number): ArenaComboView {
  const value = Math.max(0, Math.trunc(streak));
  const paying = value >= ARENA_COMBO_THRESHOLD;
  return {
    streak: value,
    // Единица серией не считается: показывать «серия 1» после первого верного
    // ответа значит обесценить сам знак.
    visible: value >= 2,
    paying,
    toBonus: paying ? 0 : Math.max(0, ARENA_COMBO_THRESHOLD - value),
  };
}

/**
 * Что известно про соперника на ТЕКУЩЕМ задании.
 *
 * Владелец: «как только соперник ответил, индикатор должен нас
 * проинформировать». Поэтому сигнал строится по заданию, на котором игрок
 * стоит сейчас, а не по последнему пришедшему тику: тик про задание, которое
 * игрок уже прошёл, ничего не значит и мигать по нему нельзя.
 */
export function arenaOpponentSignal(
  state: ArenaLocalMatchState,
  monoNowMs: number,
): ArenaOpponentSignal {
  if (state.phase === 'finished') return { kind: 'finished' };
  const tick = visibleOpponentTick(state, state.taskIndex);
  if (!tick) return state.opponentFinished ? { kind: 'finished' } : { kind: 'silent' };
  // Насколько соперник опередил — считается только в фазе ответа: в остальных
  // фазах «опережение» смысла не имеет, а число на экране было бы враньём.
  const aheadByMs = state.phase === 'answer'
    ? Math.max(0, (monoNowMs - state.phaseStartedAtMonoMs) - tick.raceElapsedMs)
    : null;
  return { kind: 'answered', correct: tick.correct, aheadByMs };
}

/** Пары, по которым уже есть верный тык. Порядок — по номеру пары. */
export function arenaResolvedPairs(state: ArenaLocalMatchState): readonly number[] {
  return Object.keys(state.pairFirstAttemptCorrect)
    .map((key) => Number(key))
    .filter((index) => Number.isInteger(index))
    .sort((left, right) => left - right);
}

/**
 * Exact-known rival score for the live HUD.
 *
 * A transmitted cumulative value wins. Older/scripted ticks are folded only
 * over the contiguous prefix where both sides' outcomes are precise enough.
 * Legacy ordinary-task `correct: false` cannot distinguish wrong, timeout, or
 * broken, so it ends the exact-known prefix. A speed board is different:
 * exact `firstAttemptPairs` is authoritative for this display fallback and
 * its less precise boolean is ignored; without the pair count no score is
 * guessed.
 */
export function arenaOpponentMatchStars(
  plan: ArenaMatchPlanWire,
  state: ArenaLocalMatchState,
  includeHiddenExact = false,
): number | null {
  const ceiling = arenaMatchStarCeiling(plan.tasks.length);
  let transmitted: number | null = null;
  for (const taskIndex of Object.keys(state.opponentByTask).map(Number)) {
    const tick = visibleOpponentTick(state, taskIndex, includeHiddenExact);
    if (!tick) continue;
    const value = tick.matchStars;
    if (!Number.isInteger(value) || (value as number) < 0 || (value as number) > ceiling) continue;
    transmitted = transmitted === null ? value as number : Math.max(transmitted, value as number);
  }
  if (transmitted !== null) return transmitted;

  const viewerByTask = new Map(state.outcomes.map((outcome) => [outcome.taskIndex, outcome]));
  let comboRun = 0;
  let score = 0;
  let known = false;
  for (let taskIndex = 0; taskIndex < plan.tasks.length; taskIndex += 1) {
    const task = plan.tasks[taskIndex];
    const viewer = viewerByTask.get(taskIndex);
    const rival = visibleOpponentTick(state, taskIndex, includeHiddenExact);
    if (!task || !viewer || !rival) break;

    let firstAttemptPairs = 0;
    if (task.mode === 'speed_match') {
      if (!Number.isInteger(rival.firstAttemptPairs)
        || (rival.firstAttemptPairs as number) < 0
        || (rival.firstAttemptPairs as number) > ARENA_SPEED_MATCH_PAIRS) break;
      firstAttemptPairs = rival.firstAttemptPairs as number;
    } else if (!rival.correct && !rival.exact) {
      // зачем (2026-08-23): ошибка соперника больше не гасит его счёт. Раньше
      // любой `correct: false` обрывал подсчёт, потому что у ЖИВОГО соперника
      // он не отличает «ответил неверно» от «мы не знаем». У сценарного бота
      // исход известен точно (`exact`), и обрывать нечего — иначе после первой
      // же его ошибки игрок до конца матча видел прочерк вместо счёта.
      break;
    }
    const viewerCorrect = viewer.mode === 'speed_match'
      ? viewer.firstAttemptPairs > 0
      : viewer.status === 'correct';
    const award = arenaAwardStars({
      mode: task.mode,
      status: task.mode === 'speed_match'
        ? (firstAttemptPairs > 0 ? 'correct' : 'wrong')
        : rival.correct ? 'correct' : 'wrong',
      raceElapsedMs: rival.raceElapsedMs,
      firstAttemptPairs,
      opponentRaceElapsedMs: viewer.raceElapsedMs,
      opponentCorrect: viewerCorrect,
      comboRunBefore: comboRun,
    });
    comboRun = award.comboRunAfter;
    score = Math.min(ceiling, score + award.stars);
    known = true;
  }
  return known ? score : null;
}

export function arenaMatchHud(
  plan: ArenaMatchPlanWire,
  state: ArenaLocalMatchState,
  phase: ArenaLocalPhase,
  monoNowMs: number,
): ArenaMatchHud {
  const finished = state.phase === 'finished';
  const task = finished ? null : plan.tasks[state.taskIndex] ?? null;
  const award = phase.kind === 'reveal' ? phase.award ?? null : null;
  return {
    // Игроку показывается счёт от единицы: «задание 0 из 10» никто не пишет.
    taskOrdinal: Math.min(plan.tasks.length, state.taskIndex + 1),
    taskCount: plan.tasks.length,
    task,
    mode: task?.mode ?? null,
    timer: timerView(phase),
    combo: arenaComboView(state.comboRun),
    opponent: arenaOpponentSignal(state, monoNowMs),
    matchStars: state.matchStars,
    opponentMatchStars: arenaOpponentMatchStars(plan, state),
    award,
    // Звёзды летят только в момент показа результата и только если они есть:
    // пустой полёт нуля звёзд читается как насмешка.
    starsToFly: award ? Math.max(0, award.stars) : 0,
    resolvedPairs: task?.mode === 'speed_match' ? arenaResolvedPairs(state) : [],
    // Принимать нажатия можно ровно в фазе ответа. Ни чтение задания, ни показ
    // результата нажатий не принимают — иначе игрок «отвечает» в пустоту.
    interactive: phase.kind === 'answer',
  };
}

/**
 * Расшифровка награды строками.
 *
 * Владелец: «чтобы юзер понимал, почему 2, а не 3, он получил». Строки уже
 * собраны движком звёзд вместе с причинами; здесь они только фильтруются от
 * неприменимых, чтобы на экране не было пустых пунктов.
 */
export function arenaAwardLines(award: ArenaStarAward | null) {
  if (!award) return [];
  return award.lines.filter((line) => line.state !== 'not_applicable');
}
