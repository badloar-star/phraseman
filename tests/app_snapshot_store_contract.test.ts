import {
  APP_SNAPSHOT_RESOURCE_LIMITS,
  getAppSnapshot,
  patchAppSnapshot,
  pruneBoundedRecord,
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
});
