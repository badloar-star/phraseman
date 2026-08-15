export const ARENA_RANKED_QUICK_OFFER_MS = 30_000;
export const ARENA_RANKED_CALM_STATE_MS = 90_000;

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
