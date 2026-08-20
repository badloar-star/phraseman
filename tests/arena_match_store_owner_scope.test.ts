import {
  ARENA_MATCH_STORE_KEY,
  arenaClearMatchIfCurrent,
  type ArenaKeyValueStore,
} from '../modules/arena/match_store';
import type { ArenaOutboxOwnerScope } from '../modules/arena/result_outbox';

const A: ArenaOutboxOwnerScope = { stableUid: 'account-a', accountGeneration: 1 };
const B: ArenaOutboxOwnerScope = { stableUid: 'account-b', accountGeneration: 2 };

function fakeStore(raw: string): ArenaKeyValueStore & { data: Map<string, string> } {
  const data = new Map([[ARENA_MATCH_STORE_KEY, raw]]);
  return {
    data,
    getItem: async (key) => data.get(key) ?? null,
    setItem: async (key, value) => { data.set(key, value); },
    removeItem: async (key) => { data.delete(key); },
  };
}

function saved(ownerStableUid: string, matchId: string): string {
  return JSON.stringify({ schemaVersion: 'arena-match-store.v2', ownerStableUid, plan: { matchId } });
}

describe('Arena current-match compare-delete', () => {
  it('does not clear a new B match from a late A completion', async () => {
    const store = fakeStore(saved(B.stableUid, 'm2'));
    await expect(arenaClearMatchIfCurrent(store, A, 'm1', () => true)).resolves.toBe(false);
    expect(store.data.get(ARENA_MATCH_STORE_KEY)).toBe(saved(B.stableUid, 'm2'));
  });

  it('requires the captured generation to remain current', async () => {
    const store = fakeStore(saved(A.stableUid, 'm1'));
    await expect(arenaClearMatchIfCurrent(store, A, 'm1', () => false)).resolves.toBe(false);
    expect(store.data.has(ARENA_MATCH_STORE_KEY)).toBe(true);
  });

  it('clears only the exact current owner and match', async () => {
    const store = fakeStore(saved(A.stableUid, 'm1'));
    await expect(arenaClearMatchIfCurrent(store, A, 'm1', () => true)).resolves.toBe(true);
    expect(store.data.has(ARENA_MATCH_STORE_KEY)).toBe(false);
  });

  it('never assigns an unowned legacy snapshot to the current account', async () => {
    const store = fakeStore(JSON.stringify({ schemaVersion: 'arena-match-store.v1', plan: { matchId: 'm1' } }));
    await expect(arenaClearMatchIfCurrent(store, A, 'm1', () => true)).resolves.toBe(false);
    expect(store.data.has(ARENA_MATCH_STORE_KEY)).toBe(true);
  });
});
