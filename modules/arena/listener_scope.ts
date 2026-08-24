export type ArenaListenerScopeToken = Readonly<{
  key: string;
  generation: number;
}>;

/**
 * Synchronously invalidates listener callbacks and cached values when their
 * owning account/match scope changes, before React effects can clean up the
 * previous native subscription.
 */
export function createArenaListenerScopeGate() {
  let current: ArenaListenerScopeToken = { key: '', generation: 0 };

  return {
    capture(key: string): ArenaListenerScopeToken {
      if (current.key === key) return current;
      current = { key, generation: current.generation + 1 };
      return current;
    },

    current(token: ArenaListenerScopeToken): boolean {
      return token.key === current.key && token.generation === current.generation;
    },
  };
}

/**
 * A result route belongs to the first active account generation that opens it.
 * Later generations must not reuse its match id, viewer seat, or rewards.
 */
export function createArenaResultOwnerGate() {
  let ownerKey: string | null = null;

  return {
    claim(key: string | null): boolean {
      if (!key) return false;
      if (ownerKey === null) ownerKey = key;
      return ownerKey === key;
    },

    current(key: string | null): boolean {
      return Boolean(key) && ownerKey === key;
    },
  };
}

export function arenaResultRouteOwnerMatches(
  routeOwnerGeneration: number | null,
  account: Readonly<{ phase: string; generation: number }>,
): boolean {
  return routeOwnerGeneration !== null
    && account.phase === 'active'
    && account.generation === routeOwnerGeneration;
}
