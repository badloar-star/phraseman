/**
 * Монотонное время для матча.
 *
 * Матч считается на устройстве, поэтому источник времени — часть правил игры,
 * а не деталь реализации.
 *
 * Защёлка `Math.max` обязательна: в React Native полифил `performance` не раз
 * оказывался производным от `Date`, и тогда обещание «не зависит от перевода
 * часов» просто неверно — назад время всё равно не пойдёт.
 *
 * На iOS mach-часы не идут, пока устройство спит. Поэтому при возврате из сна
 * берётся ХУДШЕЕ из двух: недосчитать прошедшее время — эксплуатируемое
 * направление, пересчитать — стоит максимум одного задания.
 */

let lastMs = 0;
let epochId = '';
let synthetic = false;

function rawNowMs(): number {
  const perf = (globalThis as { performance?: { now?: () => number } }).performance;
  if (perf && typeof perf.now === 'function') {
    synthetic = false;
    return perf.now();
  }
  synthetic = true;
  return Date.now();
}

export function arenaMonotonicNowMs(): number {
  lastMs = Math.max(lastMs, rawNowMs());
  return lastMs;
}

/**
 * Идентификатор запуска процесса. Меняется при холодном старте — по нему
 * машина матча понимает, что сохранённое монотонное начало отсчёта потеряло
 * смысл и восстанавливать прошедшее время придётся по стенным часам.
 */
export function arenaMonotonicEpochId(): string {
  if (!epochId) {
    epochId = `mono_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e9).toString(36)}`;
  }
  return epochId;
}

/** true — когда настоящих монотонных часов нет и используется стенное время. */
export function arenaMonotonicIsSynthetic(): boolean {
  arenaMonotonicNowMs();
  return synthetic;
}

/**
 * Прошедшее время после возврата из сна: берём большее из монотонной и стенной
 * разницы. Стенная разница учитывается только если она положительная — иначе
 * перевод часов назад «подарил» бы игроку время.
 */
export function arenaElapsedAfterResume(
  monoDeltaMs: number,
  wallDeltaMs: number,
): number {
  const mono = Math.max(0, Number.isFinite(monoDeltaMs) ? monoDeltaMs : 0);
  const wall = Number.isFinite(wallDeltaMs) ? wallDeltaMs : 0;
  return wall > 0 ? Math.max(mono, wall) : mono;
}

/** Только для тестов: сбрасывает защёлку и идентификатор запуска. */
export function __resetArenaMonotonicForTests(): void {
  lastMs = 0;
  epochId = '';
  synthetic = false;
}
