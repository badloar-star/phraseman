import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('../app/config', () => ({
  CLOUD_SYNC_ENABLED: false,
  IS_EXPO_GO: true,
}));

jest.mock('../app/cloud_sync', () => ({
  ensureAnonUser: jest.fn(async () => 'anon-uid'),
  markCloudSyncPending: jest.fn(),
  syncToCloud: jest.fn(async () => {}),
}));

jest.mock('../app/achievements', () => ({
  checkAchievements: jest.fn(async () => {}),
}));

jest.mock('../app/club_boosts', () => ({
  getXPMultiplier: jest.fn(async () => 1),
}));

jest.mock('../app/league_group_boosts', () => ({
  getLeagueGroupBoostMultiplier: jest.fn(async () => 1),
}));

jest.mock('../app/debug-logger', () => ({
  DebugLogger: { error: jest.fn() },
}));

jest.mock('../app/hall_of_fame_utils', () => ({
  addOrUpdateScore: jest.fn(async () => {}),
  streakMultiplier: jest.fn(() => 1),
}));

jest.mock('../app/league_engine', () => ({
  loadLeagueState: jest.fn(async () => ({ leagueId: 0 })),
}));

jest.mock('../app/level_gift_system', () => ({
  consumeGiftXpBank: jest.fn(async () => 0),
  readGiftMultiplier: jest.fn(async () => 1),
  readGiftMultiplierForBaseXp: jest.fn(async () => ({ multiplier: 1, consumeBank: false })),
}));

jest.mock('../app/league_personal_boosts', () => ({
  getLeagueBoostMultiplier: jest.fn(async () => 1),
}));

jest.mock('../app/streak_repair', () => ({
  recordActivityForRepair: jest.fn(async () => {}),
}));

jest.mock('../constants/avatars', () => ({
  getBestAvatarForLevel: jest.fn(() => 'avatar-1'),
  getBestFrameForLevel: jest.fn(() => ({ id: 'frame-1' })),
}));

jest.mock('../constants/custom_avatars', () => ({
  isCustomAvatarValue: jest.fn(() => false),
}));

jest.mock('../app/firestore_friend_activity', () => ({
  writeFriendEvent: jest.fn(async () => {}),
}));

jest.mock('../constants/titles', () => ({
  getTitleString: jest.fn(() => 'Explorer'),
}));

jest.mock('../app/events', () => ({
  emitAppEvent: jest.fn(),
}));

jest.mock('../app/user_id_policy', () => ({
  getCanonicalUserId: jest.fn(async () => 'stable-uid'),
}));

jest.mock('../app/weekly_xp', () => ({
  addWeeklyXp: jest.fn(async () => {}),
}));

jest.mock('../app/services/league_chest_rewards', () => ({
  consumeLeagueChestXpOverrideMultiplier: jest.fn(async () => 1),
  peekLeagueChestXpOverrideMultiplier: jest.fn(async () => 1),
}));

jest.mock('../app/boons/boon_effects_xp', () => ({
  boonXpMultiplierContribution: jest.fn(() => 0),
}));

jest.mock('../app/notifications', () => ({
  refreshWeeklyRecapNotificationAfterXpChange: jest.fn(),
}));

jest.mock('../app/public_profile_snapshot', () => ({
  syncPublicProfileSnapshot: jest.fn(async () => {}),
}));

jest.mock('../app/app_snapshot_store', () => ({
  patchAppSnapshot: jest.fn(),
}));

jest.mock('../app/progress_events_client', () => ({
  prepareProgressMigrationSnapshot: jest.fn(async () => null),
  submitProgressEvent: jest.fn(async () => {}),
}));

describe('registerXP', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  it('adds XP when the caller already has a resolved player name', async () => {
    const { registerXP } = await import('../app/xp_manager');
    const { addOrUpdateScore } = await import('../app/hall_of_fame_utils');
    const { addWeeklyXp } = await import('../app/weekly_xp');
    const { patchAppSnapshot } = await import('../app/app_snapshot_store');
    const { markCloudSyncPending, syncToCloud } = await import('../app/cloud_sync');

    await AsyncStorage.setItem('user_total_xp', '100');

    const result = await registerXP(10, 'lesson_complete', 'Learner', 'ru', 1, {
      eventId: 'lesson:known-name:complete_xp',
    });

    await Promise.resolve();

    expect(result).toEqual({ finalDelta: 10, multiplier: 1, isBonus: false });
    expect(await AsyncStorage.getItem('user_total_xp')).toBe('110');
    expect(addOrUpdateScore).toHaveBeenCalledWith('Learner', 10, 'ru', 'avatar-1');
    expect(addWeeklyXp).toHaveBeenCalledWith(10);
    expect(markCloudSyncPending).toHaveBeenCalled();
    expect(syncToCloud).not.toHaveBeenCalled();
    expect(patchAppSnapshot).toHaveBeenCalledWith(expect.any(Function));
    const patchFn = (patchAppSnapshot as jest.Mock).mock.calls.at(-1)?.[0] as (current: unknown) => unknown;
    expect(patchFn({
      profile: {
        source: 'storage',
        updatedAt: 1,
        name: 'Learner',
        avatar: 'avatar-1',
        frame: 'frame-1',
        totalXp: 100,
        level: 1,
        premiumActive: false,
        vipActive: false,
      },
    })).toMatchObject({ profile: { totalXp: 110, source: 'local' } });
  });

  it('keeps XP when leaderboard side effects fail after local event reservation', async () => {
    const { registerXP } = await import('../app/xp_manager');
    const { addOrUpdateScore } = await import('../app/hall_of_fame_utils');
    const { addWeeklyXp } = await import('../app/weekly_xp');
    const { emitAppEvent } = await import('../app/events');

    (addOrUpdateScore as jest.Mock).mockRejectedValueOnce(new Error('leaderboard_failed'));
    await AsyncStorage.setItem('user_total_xp', '40');

    const result = await registerXP(7, 'lesson_complete', 'Learner', 'ru', 1, {
      eventId: 'lesson:leaderboard-fail:complete_xp',
    });

    expect(result).toEqual({ finalDelta: 7, multiplier: 1, isBonus: false });
    expect(await AsyncStorage.getItem('user_total_xp')).toBe('47');
    expect(addWeeklyXp).toHaveBeenCalledWith(7);
    expect(emitAppEvent).toHaveBeenCalledWith('xp_changed');
  });

  it('falls back to base XP when a multiplier lookup fails before the normal write', async () => {
    const { registerXP } = await import('../app/xp_manager');
    const { getXPMultiplier } = await import('../app/club_boosts');
    const { addOrUpdateScore } = await import('../app/hall_of_fame_utils');
    const { addWeeklyXp } = await import('../app/weekly_xp');

    (getXPMultiplier as jest.Mock).mockRejectedValueOnce(new Error('boost_failed'));
    await AsyncStorage.setItem('user_total_xp', '20');

    const result = await registerXP(5, 'lesson_complete', 'Learner', 'ru', 1, {
      eventId: 'lesson:boost-fail:complete_xp',
    });

    expect(result).toEqual({ finalDelta: 5, multiplier: 1, isBonus: false });
    expect(await AsyncStorage.getItem('user_total_xp')).toBe('25');
    expect(addOrUpdateScore).toHaveBeenCalledWith('Learner', 5, 'ru');
    expect(addWeeklyXp).toHaveBeenCalledWith(5);
  });

  it('rejects non-finite XP amounts without changing local progress', async () => {
    const { registerXP } = await import('../app/xp_manager');
    await AsyncStorage.setItem('user_total_xp', '100');

    await expect(registerXP(Number.POSITIVE_INFINITY, 'lesson_complete', 'Learner')).resolves.toEqual({
      finalDelta: 0,
      multiplier: 1,
      isBonus: false,
    });
    expect(await AsyncStorage.getItem('user_total_xp')).toBe('100');
  });

  it('caps a corrupted multiplier and the resulting local delta', async () => {
    const { registerXP, __xpManagerTestHooks } = await import('../app/xp_manager');
    const { getXPMultiplier } = await import('../app/club_boosts');
    (getXPMultiplier as jest.Mock).mockResolvedValueOnce(999_999);
    await AsyncStorage.setItem('user_total_xp', '100');

    const result = await registerXP(2_000, 'lesson_complete', 'Learner');

    expect(result.finalDelta).toBe(__xpManagerTestHooks.MAX_LOCAL_XP_DELTA);
    expect(result.multiplier).toBe(__xpManagerTestHooks.MAX_LOCAL_XP_MULTIPLIER);
    expect(await AsyncStorage.getItem('user_total_xp')).toBe('25100');
  });

  it('keeps local ledgers account-owned and maps club missions to server events', async () => {
    const { __xpManagerTestHooks } = await import('../app/xp_manager');
    expect(__xpManagerTestHooks.LOCAL_PROGRESS_EVENT_LEDGER_MAX).toBeGreaterThanOrEqual(500);
    expect(__xpManagerTestHooks.localProgressEventLedgerKey('account-A')).not.toBe(
      __xpManagerTestHooks.localProgressEventLedgerKey('account-B'),
    );
    expect(__xpManagerTestHooks.progressEventTypeForSource('club_mission_complete')).toBe('club_mission_complete');
  });

  it('runs the 10k restore exactly once and commits its marker with XP', async () => {
    const { migrateXPFormulaV2 } = await import('../app/xp_manager');
    const { XP_LEVEL_RESTORE_250_TO_400_KEY, restoredXPForOld250VisibleLevel } = await import('../app/xp_level_restore');
    await AsyncStorage.setItem('user_total_xp', '10000');
    const restoredXp = String(restoredXPForOld250VisibleLevel(10000).targetXP);

    await migrateXPFormulaV2();
    expect(await AsyncStorage.getItem('user_total_xp')).toBe(restoredXp);
    expect(await AsyncStorage.getItem(XP_LEVEL_RESTORE_250_TO_400_KEY)).toBe('1');

    await migrateXPFormulaV2();
    expect(await AsyncStorage.getItem('user_total_xp')).toBe(restoredXp);
  });
});

describe('registerXP: offline streak_count fallback respects local-day transition', () => {
  let simulatedZone = 'UTC';

  // See tests/streak_local_date_migration.test.ts for why process.env.TZ can't
  // be used here — this mock re-derives the flexible comparators in terms of
  // getLocalDayKey so they stay self-consistent under a simulated IANA zone.
  jest.mock('../app/local_date', () => {
    const actual = jest.requireActual('../app/local_date');
    const getLocalDayKey = (date: Date = new Date()) =>
      actual.localDayKeyForTimeZone(date, simulatedZone);
    const isSameLocalOrUtcDay = (dayKey: string | null | undefined, reference: Date = new Date()) =>
      !!dayKey && (dayKey === getLocalDayKey(reference) || dayKey === actual.getUtcDayKey(reference));
    const isYesterdayFlexible = (dayKey: string | null | undefined, reference: Date = new Date()) => {
      if (!dayKey) return false;
      const localYesterday = actual.addLocalDays(getLocalDayKey(reference), -1);
      const utcYesterday = actual.addLocalDays(actual.getUtcDayKey(reference), -1);
      return dayKey === localYesterday || dayKey === utcYesterday;
    };
    return { ...actual, getLocalDayKey, isSameLocalOrUtcDay, isYesterdayFlexible };
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    simulatedZone = 'Australia/Brisbane'; // UTC+10, no DST
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('extends the offline streak fallback across a local-day boundary that is still the same UTC day', async () => {
    const { registerXP } = await import('../app/xp_manager');

    // Evening session: 2026-07-04 21:00 local (UTC+10) = 2026-07-04T11:00:00Z.
    jest.useFakeTimers().setSystemTime(new Date('2026-07-04T11:00:00.000Z'));
    await AsyncStorage.setItem('user_total_xp', '0');
    await registerXP(5, 'lesson_complete', 'Learner', 'ru', 1, { eventId: 'lesson:tz-day1:complete_xp' });
    expect(await AsyncStorage.getItem('last_active_date')).toBe('2026-07-04');
    expect(await AsyncStorage.getItem('streak_count')).toBe('1');

    // Next evening: 2026-07-05 21:00 local (UTC+10) = 2026-07-05T11:00:00Z.
    jest.setSystemTime(new Date('2026-07-05T11:00:00.000Z'));
    await registerXP(5, 'lesson_complete', 'Learner', 'ru', 1, { eventId: 'lesson:tz-day2:complete_xp' });

    expect(await AsyncStorage.getItem('streak_count')).toBe('2');
    expect(await AsyncStorage.getItem('last_active_date')).toBe('2026-07-05');
  });

  it('honors a legacy UTC-format last_active_date as "yesterday" during the migration window', async () => {
    const { registerXP } = await import('../app/xp_manager');

    // Legacy build wrote last_active_date via UTC day key.
    jest.useFakeTimers().setSystemTime(new Date('2026-07-04T20:00:00.000Z'));
    await AsyncStorage.multiSet([
      ['user_total_xp', '0'],
      ['last_active_date', '2026-07-04'],
      ['streak_count', '3'],
    ]);

    // New local-date code runs the next local day: 2026-07-05 06:00 local (UTC+10)
    // = 2026-07-04T20:00:00Z + 10h... use an explicit later instant instead.
    jest.setSystemTime(new Date('2026-07-05T10:00:00.000Z')); // 2026-07-05 20:00 local (UTC+10)
    await registerXP(5, 'lesson_complete', 'Learner', 'ru', 1, { eventId: 'lesson:tz-legacy:complete_xp' });

    expect(await AsyncStorage.getItem('streak_count')).toBe('4'); // extended, not burned to 1
    expect(await AsyncStorage.getItem('last_active_date')).toBe('2026-07-05');
  });
});
