/**
 * Владелец (2026-08-21): поиск не превращается ни в предложение другого
 * режима, ни в «соперник не найден». Он остаётся поиском до готового матча.
 */
export type ArenaRankedWaitPresentation = 'searching';

export function arenaRankedWaitPresentation(_elapsedMs: number): ArenaRankedWaitPresentation {
  return 'searching';
}

/**
 * Следующий бот после сорванного назначения.
 *
 * зачем (владелец 2026-08-27): было 50–70 секунд, и сорванное назначение
 * превращало быстрый матч в две минуты поиска — «по-моему поиск сломан».
 * Правило владельца одно на все случаи: соперник находится в первые 20 секунд.
 * Небольшая нижняя граница нужна лишь для того, чтобы повтор не ушёл в тот же
 * кадр, где назначение только что сорвалось.
 */
export const ARENA_REPLACEMENT_BOT_MIN_MS = 3_000;
export const ARENA_REPLACEMENT_BOT_MAX_MS = 12_000;

export function arenaReplacementBotDelayMs(randomUnit: number): number {
  const unit = Math.max(0, Math.min(1, Number.isFinite(randomUnit) ? randomUnit : 0.5));
  return Math.round(ARENA_REPLACEMENT_BOT_MIN_MS
    + unit * (ARENA_REPLACEMENT_BOT_MAX_MS - ARENA_REPLACEMENT_BOT_MIN_MS));
}

export function arenaRankedElapsedMs(
  nowMs: number,
  localStartedAtMs: number,
  joinedAtMs?: number,
  presentationRestartedAtMs?: number,
): number {
  const serverOrLocalStart = typeof joinedAtMs === 'number' && joinedAtMs > 0
    ? joinedAtMs
    : localStartedAtMs;
  const visibleStart = Math.max(serverOrLocalStart, presentationRestartedAtMs ?? 0);
  return Math.max(0, nowMs - visibleStart);
}
