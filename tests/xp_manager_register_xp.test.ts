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
});
