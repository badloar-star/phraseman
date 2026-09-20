import {
  arenaMatchStoreKey,
  arenaClearMatchIfCurrent,
  type ArenaKeyValueStore,
} from '../modules/arena/match_store';
import type { ArenaOutboxOwnerScope } from '../modules/arena/result_outbox';

const FP = 'a'.repeat(64);
const A: ArenaOutboxOwnerScope = { stableUid: 'account-a', accountGeneration: 1, studyTarget: 'en' };
const B: ArenaOutboxOwnerScope = { stableUid: 'account-b', accountGeneration: 2, studyTarget: 'en' };

function fakeStore(scope: ArenaOutboxOwnerScope, raw: string): ArenaKeyValueStore & { data: Map<string, string> } {
  const data = new Map([[arenaMatchStoreKey(scope), raw]]);
  return {
    data,
    getItem: async (key) => data.get(key) ?? null,
    setItem: async (key, value) => { data.set(key, value); },
    removeItem: async (key) => { data.delete(key); },
  };
}

function saved(ownerStableUid: string, matchId: string): string {
  return JSON.stringify({
    schemaVersion: 'arena-match-store.v3', ownerStableUid, studyTarget: 'en',
    publicationFingerprint: FP, plan: { matchId },
  });
}

describe('Arena current-match compare-delete', () => {
  it('does not clear a new B match from a late A completion', async () => {
    const store = fakeStore(B, saved(B.stableUid, 'm2'));
    await expect(arenaClearMatchIfCurrent(store, A, 'm1', () => true)).resolves.toBe(false);
    expect(store.data.get(arenaMatchStoreKey(B))).toBe(saved(B.stableUid, 'm2'));
  });

  it('requires the captured generation to remain current', async () => {
    const store = fakeStore(A, saved(A.stableUid, 'm1'));
    await expect(arenaClearMatchIfCurrent(store, A, 'm1', () => false)).resolves.toBe(false);
    expect(store.data.has(arenaMatchStoreKey(A))).toBe(true);
  });

  it('clears only the exact current owner and match', async () => {
    const store = fakeStore(A, saved(A.stableUid, 'm1'));
    await expect(arenaClearMatchIfCurrent(store, A, 'm1', () => true)).resolves.toBe(true);
    expect(store.data.has(arenaMatchStoreKey(A))).toBe(false);
  });

  it('never assigns an unowned legacy snapshot to the current account', async () => {
    const store = fakeStore(A, JSON.stringify({ schemaVersion: 'arena-match-store.v1', plan: { matchId: 'm1' } }));
    await expect(arenaClearMatchIfCurrent(store, A, 'm1', () => true)).resolves.toBe(false);
    expect(store.data.has(arenaMatchStoreKey(A))).toBe(true);
  });
});
