/**
 * xp_manager: friendsTogether multiplier is read from friends_together_bonus_v1
 * ({dayKey, percent}) and applied ONLY when dayKey matches "today" — a stale
 * (yesterday's) bonus must never leak into a new day's XP.
 *
 * Mocking approach mirrors tests/xp_manager_register_xp.test.ts.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  __resetAccountGenerationForTests,
  beginAccountGeneration,
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
}));

jest.mock('../app/level_up_reward_reconciler', () => ({
  reconcileLevelUpRewards: jest.fn(async () => []),
}));

jest.mock('../app/level_spin_level_up_queue', () => ({
  enqueueLevelSpinLevelUps: jest.fn(async () => []),
}));

// «Вместе»: pin "today" so the dayKey comparison in getFriendsTogetherXpMultiplier is deterministic.
jest.mock('../app/local_date', () => ({
  getLocalDayKey: jest.fn(() => '2026-08-17'),
  isSameLocalOrUtcDay: jest.fn(() => true),
  isYesterdayFlexible: jest.fn(() => false),
}));

describe('friendsTogether XP multiplier', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    __resetAccountGenerationForTests();
    beginAccountGeneration('test-account');
    const { __xpManagerTestHooks } = await import('../app/xp_manager');
    __xpManagerTestHooks.resetXpRuntimeState();
    await AsyncStorage.clear();
  });

  // зачем: multiplierSnapshot.friendsTogether (как club/leagueGroup рядом) стартует
  // с 1 и обновляется В ФОНЕ — refreshXpMultiplierSnapshot не awaited внутри
  // registerXP (см. xp_manager.ts:461). Первый вызов на свежем account generation
  // ВСЕГДА видит дефолт 1; только следующий вызов после того, как фоновый refresh
  // резолвится, видит применённое значение. Тот же паттерн, что и остальные
  // multiplierSnapshot-тесты в этом файле (см. tests/xp_manager_register_xp.test.ts).
  it('applies the bonus percent when friends_together_bonus_v1.dayKey is today', async () => {
    const { registerXP } = await import('../app/xp_manager');
    await AsyncStorage.setItem('user_total_xp', '0');
    await AsyncStorage.setItem('friends_together_bonus_v1', JSON.stringify({ dayKey: '2026-08-17', percent: 10 }));

    // Прогрев: первый вызов запускает фоновый refresh снапшота.
    await registerXP(1, 'lesson_complete', 'Learner', 'ru', 1, { eventId: 'friends-together:today-bonus:warmup' });
    // Дать фоновому Promise.allSettled разрешиться (микротаски).
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve();

    const result = await registerXP(100, 'lesson_complete', 'Learner', 'ru', 1, {
      eventId: 'friends-together:today-bonus',
    });

    // +10% on top of base 100 = 110 (no other multiplier active in this mock setup).
    expect(result.finalDelta).toBe(110);
  });

  it('does NOT apply a stale (yesterday) bonus', async () => {
    const { registerXP } = await import('../app/xp_manager');
    await AsyncStorage.setItem('user_total_xp', '0');
    await AsyncStorage.setItem('friends_together_bonus_v1', JSON.stringify({ dayKey: '2026-08-16', percent: 15 }));

    await registerXP(1, 'lesson_complete', 'Learner', 'ru', 1, { eventId: 'friends-together:stale-bonus:warmup' });
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve();

    const result = await registerXP(100, 'lesson_complete', 'Learner', 'ru', 1, {
      eventId: 'friends-together:stale-bonus',
    });

    expect(result.finalDelta).toBe(100); // stale bonus ignored
  });

  it('is a no-op multiplier (1x) when no bonus key is stored at all', async () => {
    const { registerXP } = await import('../app/xp_manager');
    await AsyncStorage.setItem('user_total_xp', '0');

    const result = await registerXP(100, 'lesson_complete', 'Learner', 'ru', 1, {
      eventId: 'friends-together:no-bonus-key',
    });

    expect(result.finalDelta).toBe(100);
  });

  it('ignores malformed JSON in friends_together_bonus_v1 without throwing', async () => {
    const { registerXP } = await import('../app/xp_manager');
    await AsyncStorage.setItem('user_total_xp', '0');
    await AsyncStorage.setItem('friends_together_bonus_v1', '{not valid json');

    const result = await registerXP(100, 'lesson_complete', 'Learner', 'ru', 1, {
      eventId: 'friends-together:malformed-bonus',
    });

    expect(result.finalDelta).toBe(100);
  });

  it('does not apply the earn-only multiplier to non-earned sources (e.g. wagers)', async () => {
    const { registerXP } = await import('../app/xp_manager');
    await AsyncStorage.setItem('user_total_xp', '0');
    await AsyncStorage.setItem('friends_together_bonus_v1', JSON.stringify({ dayKey: '2026-08-17', percent: 15 }));

    // 'wager_win' is NOT in the isEarnedXP allowlist (xp_manager.ts) — bets/payouts
    // bypass every multiplier, including friendsTogether.
    const result = await registerXP(100, 'wager_win', 'Learner', 'ru', undefined, {
      eventId: 'friends-together:wager-not-earned',
    });

    expect(result.finalDelta).toBe(100);
  });
});
