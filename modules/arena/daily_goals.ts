/**
 * Дневные цели Арены.
 *
 * Три цели в день, не больше: список длиннее трёх перестаёт читаться как «что
 * сделать сегодня» и превращается в работу, а невыполнимый список хуже
 * отсутствующего — он каждый день напоминает о провале.
 *
 * Цели считаются из того, что УЖЕ есть в сезонном документе и профиле: ни
 * одного нового счётчика, ни одной новой записи. Заводить под цели отдельное
 * хранилище значило бы платить за них ежедневно.
 *
 * Чистая арифметика: ни сети, ни часов.
 */

/**
 * Три РАЗНЫЕ оси (D-62): сыграть, скорость, точность. Три цели на одну ось —
 * это одна цель, растянутая на три строки: игрок закрывает их одним и тем же
 * действием и перестаёт их читать.
 */
export type ArenaGoalKey = 'play' | 'speed' | 'accuracy';

export type ArenaGoalProgress = Readonly<{
  key: ArenaGoalKey;
  done: number;
  target: number;
  /** Доля выполнения, 0..1. */
  progress: number;
  complete: boolean;
}>;

export type ArenaDailyGoals = Readonly<{
  goals: readonly ArenaGoalProgress[];
  completedCount: number;
  /** Все три выполнены — день закрыт. */
  allComplete: boolean;
}>;

/**
 * Пороги. Подобраны так, чтобы день закрывался примерно за три-четыре матча:
 * цель, требующая десяти, перестаёт быть дневной.
 */
export const ARENA_GOAL_TARGETS: Readonly<Record<ArenaGoalKey, number>> = Object.freeze({
  play: 3,
  // «Ответь первым» — ось скорости. Считается по заданиям, закрытым первым
  // верным ответом, а не по победам: победить можно и медленно.
  speed: 8,
  // Ось точности: выигранный матч требует отвечать верно, а не просто быстро.
  accuracy: 1,
});

export const ARENA_GOAL_ORDER: readonly ArenaGoalKey[] = ['play', 'speed', 'accuracy'];

function count(value: unknown): number {
  const number = Math.trunc(Number(value));
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function goal(key: ArenaGoalKey, done: number): ArenaGoalProgress {
  const target = ARENA_GOAL_TARGETS[key];
  const capped = Math.min(done, target);
  return {
    key,
    // Показывается не больше цели: «5 из 3» читается как ошибка, а не как успех.
    done: capped,
    target,
    progress: target > 0 ? capped / target : 1,
    complete: done >= target,
  };
}

/**
 * Прогресс дня.
 *
 * Все три входа приходят из сезонного документа, который и так читается и
 * пишется при каждом закрытии матча. Если день сменился, счётчики считаются
 * нулевыми — иначе вчерашние успехи закрывали бы сегодняшний день.
 */
export function arenaDailyGoals(input: Readonly<{
  /** Ключ дня из сезонного документа. */
  storedDayKey?: string | null;
  /** Сегодняшний ключ дня. */
  todayKey: string;
  matchesToday?: unknown;
  /** Заданий, закрытых первым верным ответом. Ось скорости. */
  firstAnswersToday?: unknown;
  winsToday?: unknown;
}>): ArenaDailyGoals {
  const sameDay = String(input.storedDayKey ?? '') === String(input.todayKey ?? '')
    && String(input.todayKey ?? '').length > 0;
  const goals = [
    goal('play', sameDay ? count(input.matchesToday) : 0),
    goal('speed', sameDay ? count(input.firstAnswersToday) : 0),
    goal('accuracy', sameDay ? count(input.winsToday) : 0),
  ];
  const completedCount = goals.filter((row) => row.complete).length;
  return {
    goals,
    completedCount,
    allComplete: completedCount === goals.length,
  };
}
