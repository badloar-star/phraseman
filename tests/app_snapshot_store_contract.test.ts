import {
  APP_SNAPSHOT_RESOURCE_LIMITS,
  getAppSnapshot,
  patchAppSnapshotFromAuthoritativeCloudProgress,
  patchAppSnapshot,
  patchAppSnapshotCustomizationSelection,
  pruneBoundedRecord,
  resolveHydratedProfileName,
  resetAppSnapshotForAccountSwitch,
  subscribeAppSnapshot,
} from '../app/app_snapshot_store';
import { starterAvatarDNA } from '../modules/avatar-dna/catalog';

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

  it('hydrates validated server-authoritative XP and streak without local persistence', () => {
    patchAppSnapshotFromAuthoritativeCloudProgress({
      progressServerAuthoritative: true,
      progress: {
        user_name: 'Vitalii',
        user_avatar: '44',
        user_avatar_frame: 'neural',
        user_total_xp: '564776',
        user_level: '50',
        streak_count: '93',
      },
    }, 500);

    expect(getAppSnapshot()).toMatchObject({
      profile: {
        source: 'live',
        updatedAt: 500,
        name: 'Vitalii',
        avatar: '44',
        frame: 'neural',
        totalXp: 564776,
        level: 50,
      },
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
        user_total_xp: '564776',
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
        totalXp: 0,
        level: 1,
        premiumActive: true,
        vipActive: false,
      },
      progress: {
        source: 'storage',
        updatedAt: 600,
        streak: 0,
        shards: 882,
        studyTarget: 'en',
      },
    });

    expect(getAppSnapshot()).toMatchObject({
      profile: { source: 'live', totalXp: 564776, level: 50, premiumActive: true },
      progress: { source: 'live', streak: 93, shards: 882 },
    });
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

  it('rejects authoritative XP and streak outside backend-safe bounds', () => {
    const invalidProgressRows = [
      { user_total_xp: '1000000001', streak_count: '93' },
      { user_total_xp: '564776', streak_count: '100001' },
      { user_total_xp: String(Number.MAX_SAFE_INTEGER + 1), streak_count: '93' },
      { user_total_xp: '564776.5', streak_count: '93' },
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

  it('clears account-scoped customization ownership and styles', () => {
    const dna = starterAvatarDNA('starter_warm_01');
    patchAppSnapshot({
      profile: {
        source: 'storage', updatedAt: 100, name: 'Ada', avatar: '18', frame: '',
        totalXp: 1250, level: 18, premiumActive: false, vipActive: false,
        avatarDNA: {
          schemaVersion: 1, ownerStableId: 'u1', accountGeneration: 4,
          confirmedDNA: dna, lastConfirmedDNA: dna, manifestVersion: 1,
          lastGood: { portrait: 'portrait_1', studio: 'studio_1' }, updatedAtMs: 90,
        },
      },
      customization: {
        source: 'storage',
        updatedAt: 100,
        activeAvatar: 'custom:custom-gen-41:aurora:white',
        storedAuraSelection: 'aura-ember',
        totalXp: 1250,
        level: 18,
        shards: 77,
        ownedAvatars: { 'custom-gen-41': 'aurora:white' },
        ownedAuras: { 'aura-ember': true },
        giftedAvatarId: null,
        giftedAuraId: null,
        avatarDNA: {
          schemaVersion: 1, ownerStableId: 'u1', accountGeneration: 4,
          confirmedDNA: dna, lastConfirmedDNA: dna, manifestVersion: 1,
          lastGood: { portrait: 'portrait_1', studio: 'studio_1' }, updatedAtMs: 90,
        },
      },
    });

    resetAppSnapshotForAccountSwitch();

    expect(getAppSnapshot().customization).toBeUndefined();
    expect(getAppSnapshot().profile?.avatarDNA).toBeUndefined();
  });

  it('keeps a live profile and later local Avatar DNA projection consistent', () => {
    const dna = starterAvatarDNA('starter_warm_01');
    patchAppSnapshotFromAuthoritativeCloudProgress({
      progressServerAuthoritative: true,
      progress: { user_name: 'Live Ada', user_total_xp: '900', streak_count: '4' },
    }, 500);
    const avatarDNA = {
      schemaVersion: 1 as const,
      ownerStableId: 'u1',
      accountGeneration: 4,
      confirmedDNA: dna,
      lastConfirmedDNA: dna,
      manifestVersion: 1,
      lastGood: { portrait: 'portrait_1', studio: 'studio_1' },
      updatedAtMs: 600,
    };
    const customization = {
      source: 'storage' as const,
      updatedAt: 600,
      activeAvatar: '18',
      storedAuraSelection: null,
      totalXp: 900,
      level: 4,
      shards: 7,
      ownedAvatars: {},
      ownedAuras: {},
      giftedAvatarId: null,
      giftedAuraId: null,
      avatarDNA,
    };

    patchAppSnapshot({ customization });

    expect(getAppSnapshot().profile).toMatchObject({
      source: 'live',
      totalXp: 900,
      avatarDNA,
    });
    expect(getAppSnapshot().customization?.avatarDNA).toBe(
      getAppSnapshot().profile?.avatarDNA,
    );
  });

  it('publishes avatar and aura choices to the visible profile immediately and can roll them back', () => {
    patchAppSnapshot({
      profile: {
        source: 'storage',
        updatedAt: 100,
        name: 'Ada',
        avatar: '18',
        frame: 'frame-18',
        aura: 'aura-ember',
        totalXp: 1250,
        level: 18,
        premiumActive: false,
        vipActive: false,
      },
    });
    const previous = {
      source: 'storage' as const,
      updatedAt: 100,
      activeAvatar: '18',
      storedAuraSelection: 'aura-ember',
      totalXp: 1250,
      level: 18,
      shards: 77,
      ownedAvatars: {},
      ownedAuras: {},
      giftedAvatarId: null,
      giftedAuraId: null,
    };

    patchAppSnapshotCustomizationSelection({
      ...previous,
      source: 'local',
      updatedAt: 200,
      activeAvatar: 'custom:custom-gen-41:aurora:white',
      storedAuraSelection: 'aura-ember',
    });
    expect(getAppSnapshot()).toMatchObject({
      profile: {
        source: 'local',
        avatar: 'custom:custom-gen-41:aurora:white',
        aura: 'aura-ember',
      },
      customization: {
        activeAvatar: 'custom:custom-gen-41:aurora:white',
        storedAuraSelection: 'aura-ember',
      },
    });

    patchAppSnapshotCustomizationSelection(previous);
    expect(getAppSnapshot()).toMatchObject({
      profile: { source: 'local', avatar: '18', aura: 'aura-ember' },
      customization: { activeAvatar: '18', storedAuraSelection: 'aura-ember' },
    });
  });
});
