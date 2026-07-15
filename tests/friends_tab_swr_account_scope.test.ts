type WarmModule = typeof import('../app/friends_tab_swr_warm');

const friend = (uid: string) => ({ uid, createdAt: 1 });
const profileEntry = (uid: string) => ({
  fetchedAt: Date.now(),
  profile: {
    uid,
    name: uid,
    totalXp: 10,
    weeklyXp: 0,
    streak: 0,
    isPremium: false,
    avatar: 'avatar-1',
    frame: 'frame-1',
  },
});

describe('friends warm cache account scope', () => {
  let storage: any;
  let generation: typeof import('../app/account_generation');
  let warm: WarmModule;

  beforeEach(() => {
    jest.resetModules();
    storage = require('@react-native-async-storage/async-storage');
    storage.__reset?.();
    generation = require('../app/account_generation');
    generation.__resetAccountGenerationForTests();
    warm = require('../app/friends_tab_swr_warm');
  });

  it('never exposes account A memory as the first frame of account B', () => {
    const accountA = generation.beginAccountGeneration('account-a');
    warm.memoryUpsertFriendsTabSwr('account-a', [friend('friend-a')], [], accountA);
    warm.upsertProfilesCache({ 'friend-a': profileEntry('friend-a') }, accountA);

    expect(warm.peekFriendsTabSwrWarm(accountA)?.friends).toEqual([friend('friend-a')]);
    expect(warm.peekProfilesCache(accountA)['friend-a']).toBeDefined();

    const accountB = generation.beginAccountGeneration('account-b');
    expect(warm.peekFriendsTabSwrWarm(accountB)).toBeNull();
    expect(warm.peekProfilesCache(accountB)).toEqual({});
  });

  it('rejects persisted friends and profiles owned by another account', async () => {
    await storage.setItem(warm.FRIENDS_TAB_SWR_CACHE_KEY, JSON.stringify({
      canonicalUid: 'account-a',
      friends: [friend('friend-a')],
      requests: [],
    }));
    await storage.setItem(warm.FRIEND_PROFILES_CACHE_KEY, JSON.stringify({
      canonicalUid: 'account-a',
      profiles: { 'friend-a': profileEntry('friend-a') },
    }));
    const accountB = generation.beginAccountGeneration('account-b');

    await warm.startFriendsTabSwrPrime(accountB);

    expect(warm.peekFriendsTabSwrWarm(accountB)).toBeNull();
    expect(warm.peekProfilesCache(accountB)).toEqual({});
  });

  it('does not persist a delayed snapshot after its captured uid/generation becomes stale', async () => {
    const accountA = generation.beginAccountGeneration('account-a');
    generation.beginAccountGeneration('account-b');

    await expect(warm.persistFriendsTabSwrForAccount(
      accountA,
      [friend('friend-a')],
      [],
    )).resolves.toBe(false);
    expect(await storage.getItem(warm.FRIENDS_TAB_SWR_CACHE_KEY)).toBeNull();

    await expect(warm.persistFriendsProfilesForAccount(
      accountA,
      { 'friend-a': profileEntry('friend-a') },
      ['friend-a'],
    )).resolves.toBe(false);
    expect(await storage.getItem(warm.FRIEND_PROFILES_CACHE_KEY)).toBeNull();
  });

  it('keeps the in-memory profile cache hard-bounded even when every uid is retained', () => {
    const oversized = Object.fromEntries(
      Array.from({ length: 300 }, (_, index) => {
        const uid = `friend-${String(index).padStart(3, '0')}`;
        return [uid, profileEntry(uid)];
      }),
    );

    const pruned = warm.pruneFriendsProfileCache(oversized, Date.now(), Object.keys(oversized));

    expect(Object.keys(pruned)).toHaveLength(240);
  });

  it('keeps warm profile snapshots hard-bounded after a large profile upsert', () => {
    const accountA = generation.beginAccountGeneration('account-a');
    warm.memoryUpsertFriendsTabSwr('account-a', [], [], accountA);
    const oversized = Object.fromEntries(
      Array.from({ length: 300 }, (_, index) => {
        const uid = `friend-${String(index).padStart(3, '0')}`;
        return [uid, profileEntry(uid)];
      }),
    );

    warm.upsertProfilesCache(oversized, accountA);

    expect(Object.keys(warm.peekFriendsTabSwrWarm(accountA)?.profiles ?? {})).toHaveLength(240);
  });

  it('cold-primes persisted data before generation and reveals it only to its owner', async () => {
    await storage.setItem(warm.FRIENDS_TAB_SWR_CACHE_KEY, JSON.stringify({
      canonicalUid: 'account-a',
      friends: [friend('friend-a')],
      requests: [],
    }));
    await storage.setItem(warm.FRIEND_PROFILES_CACHE_KEY, JSON.stringify({
      canonicalUid: 'account-a',
      profiles: { 'friend-a': profileEntry('friend-a') },
    }));

    await warm.startFriendsTabSwrPrime();

    const accountB = generation.beginAccountGeneration('account-b');
    expect(warm.peekFriendsTabSwrWarm(accountB)).toBeNull();
    expect(warm.peekProfilesCache(accountB)).toEqual({});

    const accountA = generation.beginAccountGeneration('account-a');
    expect(warm.peekFriendsTabSwrWarm(accountA)?.friends).toEqual([friend('friend-a')]);
    expect(warm.peekProfilesCache(accountA)['friend-a']).toBeDefined();
  });
});
