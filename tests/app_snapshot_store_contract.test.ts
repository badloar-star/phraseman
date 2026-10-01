import {
  APP_SNAPSHOT_RESOURCE_LIMITS,
  getAppSnapshot,
  patchAppSnapshotFromAuthoritativeCloudProgress,
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
        premiumActive: false,
        vipActive: false,
      },
    });

    expect(resolveHydratedProfileName(200, 'Old name')).toBe('New name');
    expect(resolveHydratedProfileName(400, 'Newest storage name')).toBe('Newest storage name');
  });

  it('hydrates validated server-authoritative identity and streak without local persistence', () => {
    patchAppSnapshotFromAuthoritativeCloudProgress({
      progressServerAuthoritative: true,
      progress: {
        user_name: 'Vitalii',
        user_avatar: '44',
        user_avatar_frame: 'neural',
        streak_count: '93',
      },
    }, 500);

    expect(getAppSnapshot()).toMatchObject({
      progress: {
        source: 'live',
        updatedAt: 500,
        streak: 93,
      },
    });
  });

  it('does not let delayed SQLite hydration roll authoritative cloud stats back to zero', () => {
    patchAppSnapshotFromAuthoritativeCloudProgress({
      progressServerAuthoritative: true,
      progress: {
        user_name: 'Vitalii',
        streak_count: '93',
      },
    }, 500);

    patchAppSnapshot({
      profile: {
        source: 'storage',
        updatedAt: 600,
        name: 'Vitalii',
        avatar: '1',
        frame: '',
        premiumActive: true,
        vipActive: false,
      },
      progress: {
        source: 'storage',
        updatedAt: 600,
        streak: 0,
        studyTarget: 'en',
      },
    });

    expect(getAppSnapshot()).toMatchObject({
      profile: { source: 'storage', premiumActive: true },
      progress: { source: 'live', streak: 93 },
    });
  });

  // зачем (баг 01.10, «Дизайн»: Главная «1 день» при серии 6): облачная серия отстаёт,
  // пока сервер не получил событие занятия; в снимок идёт серия, слитая по дате активности.
  it('renders the activity-date merged streak instead of a lagging cloud streak', () => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    expect(patchAppSnapshotFromAuthoritativeCloudProgress({
      progressServerAuthoritative: true,
      progress: { streak_count: '1' },
    }, 500, 6)).toBe(true);
    expect(getAppSnapshot().progress).toMatchObject({ source: 'live', streak: 6 });

    // без слитого значения — облачное, как раньше; мусор в слитом значении игнорируется
    resetAppSnapshotForAccountSwitch();
    patchAppSnapshotFromAuthoritativeCloudProgress({
      progressServerAuthoritative: true,
      progress: { streak_count: '1' },
    }, 500, Number.NaN);
    expect(getAppSnapshot().progress).toMatchObject({ streak: 1 });
    jest.restoreAllMocks();
  });

  it('rejects untrusted or malformed cloud progress instead of rendering defaults', () => {
    expect(patchAppSnapshotFromAuthoritativeCloudProgress({
      progressServerAuthoritative: false,
      progress: { user_total_xp: '999999', streak_count: '999' },
    }, 500)).toBe(false);
    expect(patchAppSnapshotFromAuthoritativeCloudProgress({
      progressServerAuthoritative: true,
      progress: { user_total_xp: 'not-a-number', streak_count: '-4' },
    }, 500)).toBe(false);
    expect(getAppSnapshot()).toEqual({});
  });

  it('rejects malformed authoritative streak outside backend-safe bounds', () => {
    const invalidProgressRows = [
      { streak_count: '100001' },
      { streak_count: '-4' },
    ];

    for (const progress of invalidProgressRows) {
      expect(patchAppSnapshotFromAuthoritativeCloudProgress({
        progressServerAuthoritative: true,
        progress,
      }, 500)).toBe(false);
    }
    expect(getAppSnapshot()).toEqual({});
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

  // зачем: Q5 (координатор 01.10) — Avatar DNA удалён: снимок очищает кастомизацию
  // при смене аккаунта, сверка DNA между профилем и кастомизацией снята.
  it('clears account-scoped customization on account switch', () => {
    patchAppSnapshot({
      profile: {
        source: 'storage', updatedAt: 100, name: 'Ada', avatar: '18', frame: '',
        premiumActive: false, vipActive: false,
      },
      customization: {
        source: 'storage',
        updatedAt: 100,
        activeAvatar: '18',
        level: 18,
      },
    });

    resetAppSnapshotForAccountSwitch();

    expect(getAppSnapshot().customization).toBeUndefined();
  });

});
