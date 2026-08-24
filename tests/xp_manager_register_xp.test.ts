import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  __resetAccountGenerationForTests,
  beginAccountGeneration,
  captureAccountGeneration,
  withAccountTransitionLock,
} from '../app/account_generation';

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
  enqueueSecondaryXpProjection: jest.fn(async () => {}),
  streakMultiplier: jest.fn(() => 1),
}));

jest.mock('../app/league_engine', () => ({
  loadLeagueState: jest.fn(async () => ({ leagueId: 0 })),
  getWeekId: jest.fn(() => '2026-W31'),
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
  makeDeterministicProgressEventId: jest.fn((type: string) => `test-progress:${type}`),
}));

jest.mock('../app/level_up_reward_reconciler', () => ({
  reconcileLevelUpRewards: jest.fn(async () => []),
}));

jest.mock('../app/level_spin_level_up_queue', () => ({
  enqueueLevelSpinLevelUps: jest.fn(async () => []),
}));

describe('registerXP', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    __resetAccountGenerationForTests();
    beginAccountGeneration('test-account');
    const { __xpManagerTestHooks } = await import('../app/xp_manager');
    __xpManagerTestHooks.resetXpRuntimeState();
    await AsyncStorage.clear();
  });

  it('serializes 50 same-account awards without losing any XP', async () => {
    const { registerXP } = await import('../app/xp_manager');
    await AsyncStorage.setItem('user_total_xp', '0');

    const results = await Promise.all(Array.from({ length: 50 }, (_, index) => registerXP(
      1,
      'achievement_reward',
      'Learner',
      'ru',
      undefined,
      { eventId: `achievement:concurrent:${index}` },
    )));

    expect(results.reduce((sum, result) => sum + result.finalDelta, 0)).toBe(50);
    expect(await AsyncStorage.getItem('user_total_xp')).toBe('50');
  });

  it('queues a gift transaction behind existing XP before it acquires the account lock', async () => {
    const { registerXP, withXpAccountOperationQueue } = await import('../app/xp_manager');
    const token = captureAccountGeneration();
    await AsyncStorage.setItem('user_total_xp', '0');
    let firstAward!: Promise<Awaited<ReturnType<typeof registerXP>>>;
    let giftAward!: Promise<Awaited<ReturnType<typeof registerXP>>>;

    await withAccountTransitionLock(async () => {
      firstAward = registerXP(1, 'achievement_reward', 'Learner', 'ru', undefined, {
        accountToken: token,
        eventId: 'achievement:queue-order:first',
      });
      giftAward = withXpAccountOperationQueue(
        token,
        (xpLease) => withAccountTransitionLock(
          (accountLease) => registerXP(1, 'achievement_reward', 'Learner', 'ru', undefined, {
            accountToken: token,
            accountTransitionLockLease: accountLease,
            xpOperationLease: xpLease,
            eventId: 'achievement:queue-order:gift',
          }),
        ),
        { finalDelta: 0, multiplier: 1, isBonus: false },
      );
    });

    const outcome = await Promise.race([
      Promise.all([firstAward, giftAward]),
      new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), 150)),
    ]);
    expect(outcome).not.toBe('timeout');
    expect(await AsyncStorage.getItem('user_total_xp')).toBe('2');
  });

  it('lets account B commit while account A is stalled before its local commit', async () => {
    const { registerXP } = await import('../app/xp_manager');
    const { readGiftMultiplierForBaseXp } = await import('../app/level_gift_system');
    (readGiftMultiplierForBaseXp as jest.Mock).mockReturnValueOnce(new Promise(() => {}));
    beginAccountGeneration('account-a');
    void registerXP(5, 'bonus_chest', 'A');
    for (let i = 0; i < 20 && (readGiftMultiplierForBaseXp as jest.Mock).mock.calls.length === 0; i += 1) await Promise.resolve();

    beginAccountGeneration('account-b');
    await AsyncStorage.setItem('user_total_xp', '100');
    const bAward = registerXP(7, 'achievement_reward', 'B');
    const timeout = new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), 100));

    await expect(Promise.race([bAward.then(() => 'settled' as const), timeout])).resolves.toBe('settled');
    expect(await AsyncStorage.getItem('user_total_xp')).toBe('107');
  });

  it('uses the 10s watchdog only for diagnostics and never starts a conflicting consume', async () => {
    jest.useFakeTimers();
    const { registerXP } = await import('../app/xp_manager');
    const { consumeGiftXpBank, readGiftMultiplierForBaseXp } = await import('../app/level_gift_system');
    let releaseConsume!: (value: number) => void;
    (readGiftMultiplierForBaseXp as jest.Mock).mockResolvedValueOnce({ multiplier: 2, consumeBank: true });
    (consumeGiftXpBank as jest.Mock).mockReturnValue(new Promise<number>((resolve) => { releaseConsume = resolve; }));

    const first = registerXP(5, 'bonus_chest', 'Learner');
    for (let i = 0; i < 30 && (consumeGiftXpBank as jest.Mock).mock.calls.length === 0; i += 1) await Promise.resolve();
    expect(consumeGiftXpBank).toHaveBeenCalledTimes(1);
    const second = registerXP(5, 'bonus_chest', 'Learner');

    await jest.advanceTimersByTimeAsync(10_001);
    expect(readGiftMultiplierForBaseXp).toHaveBeenCalledTimes(1);
    expect(consumeGiftXpBank).toHaveBeenCalledTimes(1);

    releaseConsume(5);
    await Promise.all([first, second]);
    jest.useRealTimers();
  });

  it('does not await a stale group-boost network refresh before local XP commit', async () => {
    const { registerXP } = await import('../app/xp_manager');
    const { getLeagueGroupBoostMultiplier } = await import('../app/league_group_boosts');
    (getLeagueGroupBoostMultiplier as jest.Mock).mockReturnValueOnce(new Promise(() => {}));
    await AsyncStorage.setItem('user_total_xp', '20');

    const award = registerXP(5, 'lesson_complete', 'Learner', 'ru', 1, {
      eventId: 'lesson:stale-group-boost:complete_xp',
    });
    const timeout = new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), 100));

    await expect(Promise.race([award, timeout])).resolves.toMatchObject({ finalDelta: 5 });
    expect(await AsyncStorage.getItem('user_total_xp')).toBe('25');
  });

  it('serializes chest and gift one-time multipliers across concurrent awards', async () => {
    const { registerXP } = await import('../app/xp_manager');
    const { consumeGiftXpBank, readGiftMultiplierForBaseXp } = await import('../app/level_gift_system');
    const { consumeLeagueChestXpOverrideMultiplier } = await import('../app/services/league_chest_rewards');
    (readGiftMultiplierForBaseXp as jest.Mock)
      .mockResolvedValueOnce({ multiplier: 2, consumeBank: true })
      .mockResolvedValueOnce({ multiplier: 1, consumeBank: false });
    (consumeLeagueChestXpOverrideMultiplier as jest.Mock)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1);
    await AsyncStorage.setItem('user_total_xp', '0');

    const [first, second] = await Promise.all([
      registerXP(10, 'bonus_chest', 'Learner'),
      registerXP(10, 'bonus_chest', 'Learner'),
    ]);

    expect([first.finalDelta, second.finalDelta]).toEqual([30, 10]);
    expect(consumeGiftXpBank).toHaveBeenCalledTimes(1);
    expect(consumeLeagueChestXpOverrideMultiplier).toHaveBeenCalledTimes(2);
    expect(await AsyncStorage.getItem('user_total_xp')).toBe('40');
  });

  it('applies a league chest boost to lesson answers without consuming it per answer', async () => {
    const { registerXP } = await import('../app/xp_manager');
    const {
      consumeLeagueChestXpOverrideMultiplier,
      peekLeagueChestXpOverrideMultiplier,
    } = await import('../app/services/league_chest_rewards');
    (peekLeagueChestXpOverrideMultiplier as jest.Mock).mockResolvedValueOnce(2);
    await AsyncStorage.setItem('user_total_xp', '0');

    const award = await registerXP(2, 'lesson_answer', 'Learner', 'ru', 1, {
      eventId: 'lesson:attempt-a:answer:1',
    });

    expect(award.finalDelta).toBe(4);
    expect(peekLeagueChestXpOverrideMultiplier).toHaveBeenCalledTimes(1);
    expect(consumeLeagueChestXpOverrideMultiplier).not.toHaveBeenCalled();
  });

  it('finalizes lesson-scoped boosts at most once for an attempt', async () => {
    const { finalizeLessonXpMultipliers } = await import('../app/xp_manager');
    const { consumeLeagueChestXpOverrideMultiplier } = await import('../app/services/league_chest_rewards');

    await expect(finalizeLessonXpMultipliers('attempt-a')).resolves.toBe(true);
    await expect(finalizeLessonXpMultipliers('attempt-a')).resolves.toBe(false);

    expect(consumeLeagueChestXpOverrideMultiplier).toHaveBeenCalledTimes(1);
  });

  it('serializes concurrent finalization of the same lesson attempt', async () => {
    const { finalizeLessonXpMultipliers } = await import('../app/xp_manager');
    const { consumeLeagueChestXpOverrideMultiplier } = await import('../app/services/league_chest_rewards');

    await expect(Promise.all([
      finalizeLessonXpMultipliers('attempt-concurrent'),
      finalizeLessonXpMultipliers('attempt-concurrent'),
    ])).resolves.toEqual([true, false]);

    expect(consumeLeagueChestXpOverrideMultiplier).toHaveBeenCalledTimes(1);
  });

  it('refuses XP mutation before boot resolves an active account identity', async () => {
    const { registerXP } = await import('../app/xp_manager');
    __resetAccountGenerationForTests();

    await expect(registerXP(10, 'bonus_chest', 'Learner')).resolves.toEqual({
      finalDelta: 0,
      multiplier: 1,
      isBonus: false,
    });
    expect(AsyncStorage.getItem).not.toHaveBeenCalled();
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    expect(AsyncStorage.multiSet).not.toHaveBeenCalled();
  });

  it('rechecks account ownership after the last-active read before streak multiSet', async () => {
    const { registerXP } = await import('../app/xp_manager');
    const storage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
    let release!: (value: string | null) => void;
    const lastActiveRead = new Promise<string | null>((resolve) => { release = resolve; });
    const originalGetItem = storage.getItem.getMockImplementation();
    storage.getItem.mockImplementation((key) => (
      key === 'last_active_date'
        ? lastActiveRead
        : originalGetItem!(key)
    ));
    beginAccountGeneration('account-a');
    await AsyncStorage.setItem('user_total_xp', '100');

    const request = registerXP(10, 'bonus_chest', 'Learner');
    for (let i = 0; i < 50 && !storage.getItem.mock.calls.some(([key]) => key === 'last_active_date'); i += 1) {
      await new Promise((resolve) => setImmediate(resolve));
    }
    const reachedBoundary = storage.getItem.mock.calls.some(([key]) => key === 'last_active_date');
    beginAccountGeneration('account-b');
    release('2000-01-01');

    await expect(request).resolves.toEqual({ finalDelta: 0, multiplier: 1, isBonus: false });
    storage.getItem.mockImplementation(originalGetItem!);
    expect(reachedBoundary).toBe(true);
    expect(storage.multiSet).not.toHaveBeenCalledWith(expect.arrayContaining([
      ['last_active_date', expect.any(String)],
    ]));
  });

  it('rechecks account ownership after fallback XP read before writing', async () => {
    const { registerXP } = await import('../app/xp_manager');
    const { getXPMultiplier } = await import('../app/club_boosts');
    const storage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
    let release!: (value: string | null) => void;
    const xpRead = new Promise<string | null>((resolve) => { release = resolve; });
    const originalGetItem = storage.getItem.getMockImplementation();
    storage.getItem.mockImplementation((key) => (
      key === 'user_total_xp'
        ? xpRead
        : originalGetItem!(key)
    ));
    (getXPMultiplier as jest.Mock).mockRejectedValueOnce(new Error('boost_failed'));
    beginAccountGeneration('account-a');

    const request = registerXP(5, 'lesson_complete', 'Learner', 'ru', 1);
    for (let i = 0; i < 50 && !storage.getItem.mock.calls.some(([key]) => key === 'user_total_xp'); i += 1) {
      await new Promise((resolve) => setImmediate(resolve));
    }
    const reachedBoundary = storage.getItem.mock.calls.some(([key]) => key === 'user_total_xp');
    beginAccountGeneration('account-b');
    release('20');

    await expect(request).resolves.toEqual({ finalDelta: 0, multiplier: 1, isBonus: false });
    storage.getItem.mockImplementation(originalGetItem!);
    expect(reachedBoundary).toBe(true);
    expect(storage.setItem).not.toHaveBeenCalledWith('user_total_xp', '25');
  });

  it('does not commit account A XP after account B becomes active during awaited local gift state', async () => {
    const { registerXP } = await import('../app/xp_manager');
    const { readGiftMultiplierForBaseXp } = await import('../app/level_gift_system');
    const { addWeeklyXp } = await import('../app/weekly_xp');
    const { emitAppEvent } = await import('../app/events');
    const { checkAchievements } = await import('../app/achievements');
    const { enqueueSecondaryXpProjection } = await import('../app/hall_of_fame_utils');
    const { markCloudSyncPending } = await import('../app/cloud_sync');
    let release!: (value: { multiplier: number; consumeBank: boolean }) => void;
    (readGiftMultiplierForBaseXp as jest.Mock).mockReturnValueOnce(new Promise((resolve) => {
      release = resolve;
    }));

    beginAccountGeneration('account-a');
    await AsyncStorage.multiSet([
      ['user_total_xp', '100'],
      ['streak_count', '3'],
      ['last_active_date', '2000-01-01'],
    ]);
    const request = registerXP(10, 'bonus_chest', 'Learner', 'ru', 1, {
      eventId: 'bonus_chest:account-race',
    });
    for (let i = 0; i < 12 && (readGiftMultiplierForBaseXp as jest.Mock).mock.calls.length === 0; i += 1) {
      await Promise.resolve();
    }
    expect(readGiftMultiplierForBaseXp).toHaveBeenCalledTimes(1);

    beginAccountGeneration('account-b');
    await AsyncStorage.multiSet([
      ['user_total_xp', '700'],
      ['streak_count', '9'],
      ['last_active_date', '2099-01-01'],
    ]);
    release({ multiplier: 1, consumeBank: false });

    await expect(request).resolves.toEqual({ finalDelta: 0, multiplier: 1, isBonus: false });
    expect(await AsyncStorage.getItem('user_total_xp')).toBe('700');
    expect(await AsyncStorage.getItem('streak_count')).toBe('9');
    expect(await AsyncStorage.getItem('last_active_date')).toBe('2099-01-01');
    expect(addWeeklyXp).not.toHaveBeenCalled();
    expect(emitAppEvent).not.toHaveBeenCalled();
    expect(checkAchievements).not.toHaveBeenCalled();
    expect(enqueueSecondaryXpProjection).not.toHaveBeenCalled();
    expect(markCloudSyncPending).not.toHaveBeenCalled();
  });

  it('preserves the same-account XP commit with an explicit active generation', async () => {
    const { registerXP } = await import('../app/xp_manager');
    const { addWeeklyXp } = await import('../app/weekly_xp');
    beginAccountGeneration('account-a');
    await AsyncStorage.setItem('user_total_xp', '100');

    await expect(registerXP(10, 'bonus_chest', 'Learner', 'ru', 1, {
      eventId: 'bonus_chest:same-account',
    })).resolves.toEqual({ finalDelta: 10, multiplier: 1, isBonus: false });

    expect(await AsyncStorage.getItem('user_total_xp')).toBe('110');
    expect(addWeeklyXp).toHaveBeenCalledWith(10);
  });

  it('adds XP when the caller already has a resolved player name', async () => {
    const { registerXP } = await import('../app/xp_manager');
    const { enqueueSecondaryXpProjection } = await import('../app/hall_of_fame_utils');
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
    expect(enqueueSecondaryXpProjection).toHaveBeenCalledWith(
      'Learner',
      10,
      'ru',
      'avatar-1',
      expect.objectContaining({ stableId: 'test-account', phase: 'active' }),
    );
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
    const { enqueueSecondaryXpProjection } = await import('../app/hall_of_fame_utils');
    const { addWeeklyXp } = await import('../app/weekly_xp');
    const { emitAppEvent } = await import('../app/events');

    (enqueueSecondaryXpProjection as jest.Mock).mockRejectedValueOnce(new Error('leaderboard_failed'));
    await AsyncStorage.setItem('user_total_xp', '40');

    const result = await registerXP(7, 'lesson_complete', 'Learner', 'ru', 1, {
      eventId: 'lesson:leaderboard-fail:complete_xp',
    });

    expect(result).toEqual({ finalDelta: 7, multiplier: 1, isBonus: false });
    expect(await AsyncStorage.getItem('user_total_xp')).toBe('47');
    expect(addWeeklyXp).toHaveBeenCalledWith(7);
    expect(emitAppEvent).toHaveBeenCalledWith('xp_changed');
  });

  it('commits base XP when the background multiplier refresh fails', async () => {
    const { registerXP } = await import('../app/xp_manager');
    const { getXPMultiplier } = await import('../app/club_boosts');
    const { enqueueSecondaryXpProjection } = await import('../app/hall_of_fame_utils');
    const { addWeeklyXp } = await import('../app/weekly_xp');

    (getXPMultiplier as jest.Mock).mockRejectedValueOnce(new Error('boost_failed'));
    await AsyncStorage.setItem('user_total_xp', '20');

    const result = await registerXP(5, 'lesson_complete', 'Learner', 'ru', 1, {
      eventId: 'lesson:boost-fail:complete_xp',
    });

    expect(result).toEqual({ finalDelta: 5, multiplier: 1, isBonus: false });
    expect(await AsyncStorage.getItem('user_total_xp')).toBe('25');
    expect(enqueueSecondaryXpProjection).toHaveBeenCalledWith(
      'Learner',
      5,
      'ru',
      'avatar-1',
      expect.objectContaining({ stableId: 'test-account', phase: 'active' }),
    );
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
    __xpManagerTestHooks.setXpMultiplierSnapshot(999_999, 1);
    await AsyncStorage.setItem('user_total_xp', '100');

    const result = await registerXP(2_000, 'lesson_complete', 'Learner');

    expect(result.finalDelta).toBe(__xpManagerTestHooks.MAX_LOCAL_XP_DELTA);
    expect(result.multiplier).toBe(__xpManagerTestHooks.MAX_LOCAL_XP_MULTIPLIER);
    expect(await AsyncStorage.getItem('user_total_xp')).toBe('25100');
  });

  it('treats SQLITE_FULL as a recoverable storage condition instead of a critical XP failure', async () => {
    const { registerXP } = await import('../app/xp_manager');
    const { DebugLogger } = await import('../app/debug-logger');
    const { emitAppEvent } = await import('../app/events');
    (AsyncStorage.multiSet as jest.Mock).mockRejectedValueOnce(
      new Error('database or disk is full (code 13 SQLITE_FULL)'),
    );

    await expect(registerXP(10, 'achievement_reward', 'Learner')).resolves.toEqual({
      finalDelta: 10,
      multiplier: 1,
      isBonus: false,
    });

    expect(DebugLogger.error).toHaveBeenCalledWith(
      'xp_manager.ts:registerXP',
      expect.any(Error),
      'warning',
    );
    expect(emitAppEvent).toHaveBeenCalledWith('action_toast', expect.objectContaining({
      type: 'warning',
      messageRu: expect.stringContaining('хранилище Phraseman'),
    }));
  });

  it('clamps a corrupted league tier to the real ladder before applying its XP bonus', async () => {
    const { getCurrentMultiplier } = await import('../app/xp_manager');
    const { loadLeagueState } = await import('../app/league_engine');
    (loadLeagueState as jest.Mock).mockResolvedValueOnce({ leagueId: 50, weekId: '2026-W31', group: [] });

    await expect(getCurrentMultiplier()).resolves.toBeCloseTo(2.1, 5);
  });

  it('creates the local Spin credit and plaque directly from a device level crossing', async () => {
    const { registerXP } = await import('../app/xp_manager');
    const { enqueueLevelSpinLevelUps } = await import('../app/level_spin_level_up_queue');
    const { emitAppEvent } = await import('../app/events');
    await AsyncStorage.setItem('user_total_xp', '350');

    await registerXP(100, 'lesson_complete', 'Learner');

    expect(enqueueLevelSpinLevelUps).toHaveBeenCalledWith(1, 2);
    expect(emitAppEvent).toHaveBeenCalledWith('energy_reload');
    expect(emitAppEvent).toHaveBeenCalledWith('xp_changed');
    const { checkAchievements } = await import('../app/achievements');
    expect(checkAchievements).toHaveBeenCalledWith(
      { type: 'level_reached', level: 2 },
      expect.objectContaining({ stableId: 'test-account', phase: 'active' }),
    );
  });

  it('keeps local ledgers account-owned and maps club missions to server events', async () => {
    const { __xpManagerTestHooks } = await import('../app/xp_manager');
    expect(__xpManagerTestHooks.LOCAL_PROGRESS_EVENT_LEDGER_MAX).toBeGreaterThanOrEqual(500);
    expect(__xpManagerTestHooks.localProgressEventLedgerKey('account-A')).not.toBe(
      __xpManagerTestHooks.localProgressEventLedgerKey('account-B'),
    );
  });

  // зачем: клиентский пересчёт XP по старой кривой ОСОЗНАННО отключён (см. коммент
  // в xp_manager.ts: «Level-formula repair is a server/admin migration, not a
  // boot-time client mutation») — устройство не имеет права само домыслить баланс и
  // протащить юзера через несколько уровней. Раньше тест требовал ровно такого
  // пересчёта (10000 → 16000). Теперь фиксируем ЗАЩИТУ: миграция ставит маркеры,
  // но баланс не трогает, и повторный запуск тоже ничего не меняет.
  it('never rewrites XP on device: marks the migration done and leaves the balance intact', async () => {
    const { migrateXPFormulaV2 } = await import('../app/xp_manager');
    const { XP_LEVEL_RESTORE_250_TO_400_KEY } = await import('../app/xp_level_restore');
    await AsyncStorage.setItem('user_total_xp', '10000');

    await migrateXPFormulaV2();
    expect(await AsyncStorage.getItem('user_total_xp')).toBe('10000');
    expect(await AsyncStorage.getItem(XP_LEVEL_RESTORE_250_TO_400_KEY)).toBe('1');

    // Идемпотентность: второй прогон не «догоняет» баланс задним числом.
    await migrateXPFormulaV2();
    expect(await AsyncStorage.getItem('user_total_xp')).toBe('10000');
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
    __resetAccountGenerationForTests();
    beginAccountGeneration('test-account');
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
