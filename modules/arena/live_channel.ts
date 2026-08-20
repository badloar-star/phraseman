import type { ArenaOpponentTick, ArenaLocalMatchState } from './match_machine';
import type { ArenaMatchPlanWire } from './duel_plan';
import { arenaMatchStarCeiling } from './stars';

/**
 * Живой прогресс соперника.
 *
 * Владелец: «как только соперник ответил, индикатор должен нас
 * проинформировать». Это не украшение: пока игрок не знает времени соперника,
 * он видит ПРЕДПОЛАГАЕМУЮ награду, а сервер потом считает настоящую — и число
 * на экране разойдётся с числом в кошельке.
 *
 * Realtime Database в проекте нет: ни пакета, ни правил, ни самой базы. Завести
 * её означало бы новую НАТИВНУЮ зависимость, то есть пересборку приложения, а
 * заодно новый продукт, который надо отдельно защищать и выкатывать. Ради
 * одного индикатора это несоразмерно.
 *
 * Поэтому канал живёт в Firestore, отдельным маленьким документом на матч, и
 * бюджет записей задан ЖЁСТКО: ровно одна запись на задание на игрока и ни
 * одной больше. Никаких «хартбитов каждую секунду» — владелец запретил прямо,
 * и здесь это не пожелание, а проверяемое свойство: `arenaLivePublishPlan`
 * отказывает на повторе.
 *
 * Верхняя граница за матч: `taskCount` записей на игрока. Для матча на десять
 * заданий — десять. Пошаговый v2 делал столько же ПЛЮС вызов функции на каждый
 * ответ, так что это не рост, а сокращение.
 */

export const ARENA_LIVE_COLLECTION = 'arena_v2_match_live';
/** Подколлекция мест за столом. Ключ — место, а не игрок: uid соперника спрятан. */
export const ARENA_LIVE_SEATS = 'seats';
export const ARENA_LIVE_SCHEMA_VERSION = 'arena-live.v2' as const;
export const ARENA_LIVE_LEGACY_SCHEMA_VERSION = 'arena-live.v1' as const;

/** Что публикуется про одно закрытое задание. Ответ сюда НЕ попадает. */
export type ArenaLiveTick = Readonly<{
  taskIndex: number;
  correct: boolean;
  raceElapsedMs: number;
  matchStars?: number;
}>;

export type ArenaLiveSeatState = Readonly<{
  schemaVersion: typeof ARENA_LIVE_SCHEMA_VERSION | typeof ARENA_LIVE_LEGACY_SCHEMA_VERSION;
  /** Последнее закрытое задание. Ходов накапливать не нужно — важен последний. */
  ticks: readonly ArenaLiveTick[];
  finished: boolean;
  updatedAtMs: number;
}>;

/* ----------------------------- публикация -------------------------------- */

/**
 * Решение о публикации.
 *
 * `null` означает «не писать». Это главный предохранитель против роста счёта:
 * записать можно только НОВОЕ закрытое задание, и только один раз.
 */
export function arenaLivePublishPlan(input: Readonly<{
  /** Задания, уже опубликованные в этом матче. */
  publishedTaskIndexes: readonly number[];
  /** Исходы, закрытые локально к этому моменту. */
  closedTicks: readonly ArenaLiveTick[];
  finished: boolean;
  /** Уже сообщали, что матч доигран. */
  finishPublished: boolean;
}>): Readonly<{ ticks: readonly ArenaLiveTick[]; finished: boolean }> | null {
  const published = new Set(input.publishedTaskIndexes);
  const fresh = input.closedTicks.filter((tick) => !published.has(tick.taskIndex));
  const needFinish = input.finished && !input.finishPublished;
  if (!fresh.length && !needFinish) return null;
  return { ticks: fresh, finished: input.finished };
}

/* ------------------------------- разбор ---------------------------------- */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Разбирает то, что пришло из канала.
 *
 * Канал пишет ДРУГОЕ устройство, поэтому здесь ничему нельзя верить на слово.
 * Тик про задание за пределами матча, тик с отрицательным временем, тик,
 * пришедший дважды, — всё отбрасывается молча: это индикатор, а не начисление,
 * и падать из-за него нельзя.
 */
export function arenaParseLiveSeat(raw: unknown, taskCount: number): ArenaLiveSeatState | null {
  if (!isRecord(raw)) return null;
  const schemaVersion = raw.schemaVersion;
  if (schemaVersion !== ARENA_LIVE_SCHEMA_VERSION && schemaVersion !== ARENA_LIVE_LEGACY_SCHEMA_VERSION) return null;
  const rawTicks = Array.isArray(raw.ticks) ? raw.ticks : [];
  const seen = new Set<number>();
  const parsed: Array<Readonly<{
    tick: ArenaLiveTick;
    candidateMatchStars: unknown;
  }>> = [];
  for (const item of rawTicks) {
    if (!isRecord(item)) continue;
    const taskIndex = Math.trunc(Number(item.taskIndex));
    const raceElapsedMs = Math.trunc(Number(item.raceElapsedMs));
    if (!Number.isInteger(taskIndex) || taskIndex < 0 || taskIndex >= taskCount) continue;
    if (!Number.isFinite(raceElapsedMs) || raceElapsedMs < 0) continue;
    if (seen.has(taskIndex)) continue;
    seen.add(taskIndex);
    parsed.push({
      tick: { taskIndex, correct: item.correct === true, raceElapsedMs },
      candidateMatchStars: item.matchStars,
    });
  }
  parsed.sort((left, right) => left.tick.taskIndex - right.tick.taskIndex);
  const ceiling = arenaMatchStarCeiling(taskCount);
  let lastRetainedMatchStars = 0;
  const ticks = parsed.map(({ tick, candidateMatchStars }) => {
    if (schemaVersion !== ARENA_LIVE_SCHEMA_VERSION) return tick;
    const matchStars = Number(candidateMatchStars);
    if (!Number.isInteger(matchStars) || matchStars < lastRetainedMatchStars || matchStars > ceiling) return tick;
    lastRetainedMatchStars = matchStars;
    return { ...tick, matchStars };
  });
  const updatedAtMs = Math.trunc(Number(raw.updatedAtMs));
  return {
    schemaVersion,
    ticks,
    finished: raw.finished === true,
    updatedAtMs: Number.isFinite(updatedAtMs) ? updatedAtMs : 0,
  };
}

/* ------------------------------- слияние --------------------------------- */

/**
 * Сводит два источника ходов соперника: выданные вместе с планом и пришедшие
 * из канала.
 *
 * Два источника нужны, чтобы КЛИЕНТ НЕ ЗНАЛ, кто перед ним. У живого соперника
 * план приходит с пустым списком, у бота — заполненным, но код обрабатывает
 * оба одинаково и нигде не спрашивает «это бот?». Ветвление по этому признаку
 * сразу же утекло бы в поведение экрана, а владелец потребовал, чтобы игрок не
 * догадывался.
 *
 * При совпадении номера задания побеждает ход из плана: он выдан сервером и не
 * зависит от того, что успело долететь по сети.
 */
export function arenaMergeOpponentTicks(
  planTicks: readonly ArenaOpponentTick[],
  liveTicks: readonly ArenaLiveTick[],
): readonly ArenaOpponentTick[] {
  const byIndex = new Map<number, ArenaOpponentTick>();
  for (const tick of liveTicks) {
    // Structural typing keeps optional v2 display fields at runtime while the
    // opponent wire is rolled forward in the next compatible layer.
    byIndex.set(tick.taskIndex, tick);
  }
  for (const tick of planTicks) byIndex.set(tick.taskIndex, tick);
  return [...byIndex.values()].sort((left, right) => left.taskIndex - right.taskIndex);
}

/**
 * Какие ходы ещё НЕ скормлены машине.
 *
 * Машина игнорирует повторный ход по тому же заданию, но лишнее событие всё
 * равно означает лишнюю перерисовку в разгар матча.
 */
export function arenaPendingOpponentTicks(
  merged: readonly ArenaOpponentTick[],
  deliveredTaskIndexes: readonly number[],
): readonly ArenaOpponentTick[] {
  const delivered = new Set(deliveredTaskIndexes);
  return merged.filter((tick) => !delivered.has(tick.taskIndex));
}

/** Путь документа канала. Живёт отдельно от матча: у него другой ритм записи. */
export function arenaLiveDocPath(plan: ArenaMatchPlanWire): string {
  return `${ARENA_LIVE_COLLECTION}/${plan.matchId}`;
}

/**
 * Верхняя граница записей в канал за матч на одного игрока.
 *
 * Существует, чтобы это число было видно и проверяемо, а не подразумевалось:
 * по заданию плюс одна на завершение.
 */
export function arenaLiveWriteBudget(taskCount: number): number {
  return Math.max(0, Math.trunc(taskCount)) + 1;
}

/**
 * Ходы, которые уже можно опубликовать: по одному на КАЖДОЕ закрытое задание.
 *
 * Берётся из закрытых исходов, а не из текущей фазы: исход появляется ровно
 * один раз за задание, и это и есть та граница, на которой разрешена запись.
 *
 * Для доски пар «верно» означает «хоть одна пара угадана с первой попытки» —
 * ровно так же, как это считает движок звёзд. Иначе индикатор соперника
 * говорил бы одно, а счёт показывал другое.
 */
export function arenaClosedTicks(state: ArenaLocalMatchState): readonly ArenaLiveTick[] {
  const ceiling = arenaMatchStarCeiling(state.taskCount);
  let matchStars = 0;
  return state.outcomes.map((outcome, index) => {
    matchStars = Math.min(
      ceiling,
      matchStars + Math.max(0, Math.trunc(state.awards[index]?.stars ?? 0)),
    );
    return {
      taskIndex: outcome.taskIndex,
      correct: outcome.mode === 'speed_match'
        ? outcome.firstAttemptPairs > 0
        : outcome.status === 'correct',
      raceElapsedMs: Math.max(0, Math.trunc(outcome.raceElapsedMs)),
      matchStars,
    };
  });
}
