import {
  APP_SNAPSHOT_RESOURCE_LIMITS,
  getAppSnapshot,
  patchAppSnapshot,
  pruneBoundedRecord,
  resolveHydratedProfileName,
  resetAppSnapshotForAccountSwitch,
  subscribeAppSnapshot,
} from '../app/app_snapshot_store';

describe('app snapshot store contract', () => {
  beforeEach(() => {
    resetAppSnapshotForAccountSwitch();
  });

  it('keeps snapshot patches observable without notifying for no-op patches', () => {
    let changes = 0;
    const unsubscribe = subscribeAppSnapshot(() => {
      changes += 1;
    });

    const profile = {
      source: 'storage' as const,
      updatedAt: 100,
      name: 'Ada',
      avatar: '1',
      frame: '',
      totalXp: 120,
      level: 2,
      premiumActive: false,
      vipActive: false,
    };

    patchAppSnapshot({ profile });
    expect(getAppSnapshot().profile?.name).toBe('Ada');
    expect(changes).toBe(1);

    patchAppSnapshot({ profile });
    expect(changes).toBe(1);

    unsubscribe();
  });

  it('does not let an older hydration overwrite a nickname changed while it was loading', () => {
    const baseProfile = {
      source: 'storage' as const,
      updatedAt: 100,
      name: 'Old name',
      avatar: '1',
      frame: '',
      totalXp: 120,
      level: 2,
      premiumActive: false,
      vipActive: false,
    };

    patchAppSnapshot({ profile: baseProfile });
    patchAppSnapshot({
      profile: {
        ...baseProfile,
        source: 'local',
        updatedAt: 300,
        name: 'New name',
      },
    });

    // The storage read started before the rename and completed afterwards.
    patchAppSnapshot({
      profile: {
        ...baseProfile,
        updatedAt: 200,
      },
    });

    expect(getAppSnapshot().profile?.name).toBe('New name');
    expect(getAppSnapshot().profile?.updatedAt).toBe(300);
  });

  it('keeps a same-millisecond local nickname ahead of a storage hydration', () => {
    const baseProfile = {
      source: 'storage' as const,
      updatedAt: 100,
      name: 'Old name',
      avatar: '1',
      frame: '',
      totalXp: 120,
      level: 2,
      premiumActive: false,
      vipActive: false,
    };

    patchAppSnapshot({
      profile: {
        ...baseProfile,
        source: 'local',
        updatedAt: 300,
        name: 'New name',
      },
    });
    patchAppSnapshot({
      profile: {
        ...baseProfile,
        updatedAt: 300,
      },
    });

    expect(getAppSnapshot().profile?.name).toBe('New name');
    expect(getAppSnapshot().profile?.source).toBe('local');
  });

  it('resolves delayed screen hydration from the fresher shared profile', () => {
    patchAppSnapshot({
      profile: {
        source: 'local',
        updatedAt: 300,
        name: 'New name',
        avatar: '1',
        frame: '',
        totalXp: 120,
        level: 2,
        premiumActive: false,
        vipActive: false,
      },
    });

    expect(resolveHydratedProfileName(200, 'Old name')).toBe('New name');
    expect(resolveHydratedProfileName(400, 'Newest storage name')).toBe('Newest storage name');
  });

  it('prunes bounded records by ttl while retaining pinned keys', () => {
    const now = 10_000;
    const pruned = pruneBoundedRecord(
      {
        old: { fetchedAt: 1 },
        pinned: { fetchedAt: 1 },
        freshA: { fetchedAt: 9_900 },
        freshB: { fetchedAt: 9_800 },
        freshC: { fetchedAt: 9_700 },
      },
      {
        maxEntries: 3,
        ttlMs: 500,
        nowMs: now,
        retainKeys: ['pinned'],
        getTimestamp: (entry) => entry.fetchedAt,
      },
    );

    expect(Object.keys(pruned)).toEqual(['pinned', 'freshA', 'freshB']);
    expect(pruned.old).toBeUndefined();
  });

  it('documents the resource budget for instant snapshots', () => {
    expect(APP_SNAPSHOT_RESOURCE_LIMITS.friendProfileMaxEntries).toBe(240);
    expect(APP_SNAPSHOT_RESOURCE_LIMITS.recentItemsMax).toBe(60);
    expect(APP_SNAPSHOT_RESOURCE_LIMITS.leaderboardRowsMax).toBe(100);
    expect(APP_SNAPSHOT_RESOURCE_LIMITS.serializedSnapshotBudgetBytes).toBeLessThanOrEqual(300 * 1024);
  });

  it('clears account-scoped customization ownership and styles', () => {
    patchAppSnapshot({
      customization: {
        source: 'storage',
        updatedAt: 100,
        activeAvatar: 'custom:custom-gen-41:aurora:white',
        storedAuraSelection: 'aura-aurora',
        totalXp: 1250,
        level: 18,
        shards: 77,
        ownedAvatars: { 'custom-gen-41': 'aurora:white' },
        ownedAuras: { 'aura-aurora': true },
        giftedAvatarId: null,
        giftedAuraId: null,
      },
    });

    resetAppSnapshotForAccountSwitch();

    expect(getAppSnapshot().customization).toBeUndefined();
  });
});
