const IDLE_QUEUE_HINT_DAY_MAX = 7;
const IDLE_QUEUE_HINT_NIGHT_MAX = 2;

export const IDLE_QUEUE_HINT_TTL_MS = 60 * 1000;

type IdleQueueHintCache = {
  value: number;
  at: number;
  night: boolean;
};

let idleQueueHintCache: IdleQueueHintCache | null = null;

export function isNightArenaIdleQueueHint(nowMs: number = Date.now()): boolean {
  const h = new Date(nowMs).getHours();
  return h >= 20 || h < 8;
}

export function sanitizeArenaIdleQueueHintCount(
  value: unknown,
  options: { night?: boolean } = {},
): number {
  const night = options.night ?? isNightArenaIdleQueueHint();
  const max = night ? IDLE_QUEUE_HINT_NIGHT_MAX : IDLE_QUEUE_HINT_DAY_MAX;
  if (typeof value !== 'number' || !Number.isFinite(value)) return 1;
  return Math.min(max, Math.max(1, Math.floor(value)));
}

export function getOrRefreshIdleQueueHintCount(
  nowMs: number = Date.now(),
  random: () => number = Math.random,
): number {
  const night = isNightArenaIdleQueueHint(nowMs);
  const staleByTime = !idleQueueHintCache || nowMs - idleQueueHintCache.at >= IDLE_QUEUE_HINT_TTL_MS;
  const staleByDaySegment = !!idleQueueHintCache && idleQueueHintCache.night !== night;

  if (!idleQueueHintCache || staleByTime || staleByDaySegment) {
    const max = night ? IDLE_QUEUE_HINT_NIGHT_MAX : IDLE_QUEUE_HINT_DAY_MAX;
    idleQueueHintCache = {
      value: sanitizeArenaIdleQueueHintCount(Math.floor(random() * max) + 1, { night }),
      at: nowMs,
      night,
    };
  } else {
    idleQueueHintCache.value = sanitizeArenaIdleQueueHintCount(idleQueueHintCache.value, { night });
  }

  return idleQueueHintCache.value;
}
