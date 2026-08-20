export type ArenaHubSource = 'neutral' | 'cached' | 'current';

export type ArenaHubSlot<T> = {
  source: ArenaHubSource;
  value: T | null;
};

export type ArenaHubFailure = {
  kind: 'offline' | 'server';
  code: string;
};

const ARENA_HUB_FAILURE_LIMIT = 80;
const TRANSPORT_FAILURE = /unavailable|network|offline|failed to fetch|timeout|deadline-exceeded|econn/i;

export function arenaHubNeutral<T>(): ArenaHubSlot<T> {
  return { source: 'neutral', value: null };
}

export function arenaHubCached<T>(current: ArenaHubSlot<T>, value: T | null): ArenaHubSlot<T> {
  if (current.source !== 'neutral' || value === null) return current;
  return { source: 'cached', value };
}

export function arenaHubCurrent<T>(value: T): ArenaHubSlot<T> {
  return { source: 'current', value };
}

export function arenaHubFailure(error: unknown): ArenaHubFailure {
  const details = error && typeof error === 'object' ? error as Record<string, unknown> : {};
  const message = typeof details.message === 'string' ? details.message.trim() : '';
  const transportCode = typeof details.code === 'string' ? details.code.trim() : '';
  const code = (message || transportCode || 'arena_request_failed').slice(0, ARENA_HUB_FAILURE_LIMIT);

  return {
    kind: TRANSPORT_FAILURE.test(`${transportCode} ${message}`) ? 'offline' : 'server',
    code,
  };
}
