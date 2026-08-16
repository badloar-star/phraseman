/**
 * зачем: 30 секунд — слишком рано. Живой соперник в рейтинге появляется не
 * мгновенно, а предложение уйти в быстрый матч на полминуте выглядит как
 * «здесь никого нет, не жди» и уводит людей из рейтинга ровно тогда, когда
 * очередь только набирается. Владелец (2026-08-16): предлагать через минуту,
 * поиск при этом НЕ прерывать — он продолжается фоном, и если живой встанет
 * в очередь, сервер сведёт с ним (см. arenaV2OnQueueWrite).
 */
export const ARENA_RANKED_QUICK_OFFER_MS = 60_000;
export const ARENA_RANKED_CALM_STATE_MS = 150_000;

export type ArenaRankedWaitPresentation = 'searching' | 'quick_offer' | 'calm';

/** Pure presentation only: the authoritative ranked queue keeps living on the server. */
export function arenaRankedWaitPresentation(elapsedMs: number): ArenaRankedWaitPresentation {
  const safe = Math.max(0, elapsedMs);
  if (safe >= ARENA_RANKED_CALM_STATE_MS) return 'calm';
  if (safe >= ARENA_RANKED_QUICK_OFFER_MS) return 'quick_offer';
  return 'searching';
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
