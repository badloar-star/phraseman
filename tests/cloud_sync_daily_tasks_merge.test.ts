import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  __cloudSyncTestHooks,
  deriveLastActiveDateForRestore,
  mergeDailyTasksProgressForRestore,
  shouldSyncPremiumProgressField,
  SYNC_KEYS,
} from '../app/cloud_sync';
import { normalizeDevSeededStreakValue } from '../app/streak_safety';

const makeCloudUserDoc = (progress: Record<string, unknown>) => ({
  exists: true,
  data: () => ({ progress }),
});

describe('mergeDailyTasksProgressForRestore', () => {
  it('returns cloud when local empty', () => {
    const cloud = JSON.stringify([{ taskId: 'a', current: 2, completed: false, claimed: false }]);
    expect(mergeDailyTasksProgressForRestore(null, cloud)).toBe(cloud);
  });

  it('merges counters and flags per taskId', () => {
    const local = JSON.stringify([
      { taskId: 'x', current: 5, completed: true, claimed: false },
    ]);
    const cloud = JSON.stringify([
      { taskId: 'x', current: 2, completed: false, claimed: false },
    ]);
    const out = JSON.parse(mergeDailyTasksProgressForRestore(local, cloud)) as unknown[];
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      taskId: 'x',
      current: 5,
      completed: true,
      claimed: false,
    });
  });

  it('keeps local-only task rows and merges arena combo fields', () => {
    const local = JSON.stringify([
      {
        taskId: 'arena1',
        current: 1,
        completed: false,
        claimed: false,
        comboPlays: 2,
        comboWins: 1,
      },
    ]);
    const cloud = JSON.stringify([]);
    const merged = mergeDailyTasksProgressForRestore(local, cloud);
    expect(JSON.parse(merged)).toEqual(JSON.parse(local));
  });

  it('ORs claimed from either side', () => {
    const local = JSON.stringify([{ taskId: 'y', current: 1, completed: true, claimed: true }]);
    const cloud = JSON.stringify([{ taskId: 'y', current: 0, completed: false, claimed: false }]);
    const out = JSON.parse(mergeDailyTasksProgressForRestore(local, cloud))[0] as { claimed: boolean };
    expect(out.claimed).toBe(true);
  });
});

describe('streak cloud restore safety', () => {
  beforeEach(() => {
    (AsyncStorage as any).__reset?.();
    jest.clearAllMocks();
  });

  it('syncs the activity date used by updateStreakOnActivity', () => {
    expect(SYNC_KEYS).toContain('streak_count');
    expect(SYNC_KEYS).toContain('last_active_date');
  });

  it('syncs daily login bonus state so another device cannot claim the same day again', () => {
    expect(SYNC_KEYS).toContain('login_bonus_v1');
  });

  it('syncs achievement progress counters before they unlock', () => {
    expect(SYNC_KEYS).toEqual(expect.arrayContaining([
      'achievement_trainer_correct_count',
      'achievement_active_recall_correct_count',
      'achievement_flashcards_saved_count',
      'achievement_flashcards_flip_count',
      'achievement_shards_spent_total',
      'achievement_league_boost_count',
      'achievement_league_chat_message_count',
      'achievement_all_daily_streak_v1',
      'flashcards_v1',
    ]));
  });

  it('restores daily login bonus state with cloud progress', async () => {
    const loginBonus = JSON.stringify({ lastDate: '2026-05-13', consecutiveDays: 12 });

    await AsyncStorage.multiSet([
      ['user_total_xp', '10'],
      ['streak_count', '0'],
    ]);

    const restored = await __cloudSyncTestHooks.applyRestoreFromUserDoc(makeCloudUserDoc({
      user_total_xp: '12000',
      streak_count: '14',
      login_bonus_v1: loginBonus,
    }));

    expect(restored).toBe(true);
    await expect(AsyncStorage.getItem('login_bonus_v1')).resolves.toBe(loginBonus);
  });

  it('keeps cloud daily login sticky when local XP is higher than cloud', async () => {
    const cloudLoginBonus = JSON.stringify({ lastDate: '2026-05-13', consecutiveDays: 2 });
    const staleLocalLoginBonus = JSON.stringify({ lastDate: '2026-05-12', consecutiveDays: 1 });

    await AsyncStorage.multiSet([
      ['user_total_xp', '13000'],
      ['streak_count', '20'],
      ['last_active_date', '2026-05-12'],
      ['login_bonus_v1', staleLocalLoginBonus],
    ]);

    const restored = await __cloudSyncTestHooks.applyRestoreFromUserDoc(makeCloudUserDoc({
      user_total_xp: '12000',
      streak_count: '14',
      last_active_date: '2026-05-13',
      login_bonus_v1: cloudLoginBonus,
    }));

    expect(restored).toBe(true);
    await expect(AsyncStorage.getItem('user_total_xp')).resolves.toBe('13000');
    await expect(AsyncStorage.getItem('last_active_date')).resolves.toBe('2026-05-13');
    await expect(AsyncStorage.getItem('login_bonus_v1')).resolves.toBe(cloudLoginBonus);
  });

  it('keeps newer local lesson replay rewards when cloud restore has stale pass counts', async () => {
    const localPerfect = JSON.stringify(new Array(50).fill('correct'));
    const staleCloudProgress = JSON.stringify([
      ...new Array(45).fill('correct'),
      ...new Array(5).fill('wrong'),
    ]);

    await AsyncStorage.multiSet([
      ['user_total_xp', '10'],
      ['streak_count', '0'],
      ['lesson11_best_score', '5'],
      ['lesson11_pass_count', '5'],
      ['lesson11_progress', localPerfect],
    ]);

    const restored = await __cloudSyncTestHooks.applyRestoreFromUserDoc(makeCloudUserDoc({
      user_total_xp: '12000',
      streak_count: '14',
      lesson11_best_score: '4.5',
      lesson11_pass_count: '1',
      lesson11_progress: staleCloudProgress,
    }));

    expect(restored).toBe(true);
    await expect(AsyncStorage.getItem('lesson11_best_score')).resolves.toBe('5');
    await expect(AsyncStorage.getItem('lesson11_pass_count')).resolves.toBe('5');
    await expect(AsyncStorage.getItem('lesson11_progress')).resolves.toBe(localPerfect);
  });

  it('syncs pending league results for Monday rollover modals', () => {
    expect(SYNC_KEYS).toContain('league_state_v3');
    expect(SYNC_KEYS).toContain('league_result_pending');
    expect(SYNC_KEYS).toContain('league_result_consumed_sig');
  });

  it('restores pending league result through the real cloud progress restore path', async () => {
    const pendingResult = JSON.stringify({
      prevLeagueId: 0,
      newLeagueId: 1,
      myRank: 1,
      totalInGroup: 10,
      promoted: true,
      demoted: false,
      group: [{ uid: 'me', name: 'QA Monday', points: 920, isMe: true }],
    });
    const leagueState = JSON.stringify({
      leagueId: 1,
      weekId: '2026-W20',
      group: [{ uid: 'me', name: 'QA Monday', points: 0, isMe: true }],
    });

    await AsyncStorage.multiSet([
      ['user_total_xp', '10'],
      ['streak_count', '0'],
    ]);

    const restored = await __cloudSyncTestHooks.applyRestoreFromUserDoc(makeCloudUserDoc({
      user_total_xp: '12000',
      streak_count: '14',
      user_name: 'QA Monday',
      league_state_v3: leagueState,
      league_result_pending: pendingResult,
      week_points_v2: JSON.stringify({ weekKey: '2026-W19', points: 920 }),
    }));

    expect(restored).toBe(true);
    await expect(AsyncStorage.getItem('league_result_pending')).resolves.toBe(pendingResult);
    await expect(AsyncStorage.getItem('league_state_v3')).resolves.toBe(leagueState);
  });

  it('keeps Monday league result sticky even when local XP is already higher than cloud', async () => {
    const pendingResult = JSON.stringify({
      prevLeagueId: 2,
      newLeagueId: 3,
      myRank: 2,
      totalInGroup: 10,
      promoted: true,
      demoted: false,
      group: [{ uid: 'me', name: 'QA Monday', points: 760, isMe: true }],
    });
    const leagueState = JSON.stringify({
      leagueId: 3,
      weekId: '2026-W20',
      group: [{ uid: 'me', name: 'QA Monday', points: 0, isMe: true }],
    });

    await AsyncStorage.multiSet([
      ['user_total_xp', '13000'],
      ['streak_count', '20'],
      ['league_state_v3', JSON.stringify({ leagueId: 2, weekId: '2026-W19', group: [] })],
    ]);

    const restored = await __cloudSyncTestHooks.applyRestoreFromUserDoc(makeCloudUserDoc({
      user_total_xp: '12000',
      streak_count: '14',
      user_name: 'QA Monday',
      league_state_v3: leagueState,
      league_result_pending: pendingResult,
    }));

    expect(restored).toBe(true);
    await expect(AsyncStorage.getItem('user_total_xp')).resolves.toBe('13000');
    await expect(AsyncStorage.getItem('league_result_pending')).resolves.toBe(pendingResult);
    await expect(AsyncStorage.getItem('league_state_v3')).resolves.toBe(leagueState);
  });

  it('does not restore a cloud league result that was already dismissed locally', async () => {
    const pendingResult = JSON.stringify({
      prevLeagueId: 3,
      newLeagueId: 3,
      myRank: 5,
      totalInGroup: 10,
      promoted: false,
      demoted: false,
      group: [{ uid: 'me', name: 'QA Monday', points: 520, isMe: true }],
    });
    const consumedSig = JSON.stringify({
      prevLeagueId: 3,
      newLeagueId: 3,
      myRank: 5,
      totalInGroup: 10,
      promoted: false,
      demoted: false,
    });

    await AsyncStorage.multiSet([
      ['user_total_xp', '13000'],
      ['streak_count', '20'],
      ['league_result_consumed_sig', consumedSig],
    ]);

    const restored = await __cloudSyncTestHooks.applyRestoreFromUserDoc(makeCloudUserDoc({
      user_total_xp: '12000',
      streak_count: '14',
      league_state_v3: JSON.stringify({ leagueId: 3, weekId: '2026-W20', group: [] }),
      league_result_pending: pendingResult,
    }));

    expect(restored).toBe(false);
    await expect(AsyncStorage.getItem('league_result_pending')).resolves.toBeNull();
  });

  it('derives last_active_date from legacy streak_last_date', () => {
    expect(deriveLastActiveDateForRestore({
      last_active_date: null,
      streak_last_date: '2026-05-07',
    })).toBe('2026-05-07');
  });

  it('backfills last_active_date from daily_stats for old cloud profiles', () => {
    expect(deriveLastActiveDateForRestore({
      last_active_date: null,
      streak_last_date: null,
      daily_stats: JSON.stringify({
        '2026-05-05': { points: 20, streak: 9 },
        '2026-05-08': { points: 12, streak: 10 },
      }),
      stats_daily_breakdown_v1: null,
    })).toBe('2026-05-08');
  });

  it('clamps the achievements smoke seed streak to evidenced activity', () => {
    expect(normalizeDevSeededStreakValue(500, {
      user_total_xp: '100000',
      login_bonus_v1: JSON.stringify({ consecutiveDays: 365, lastClaimDate: '2026-05-12T12:00:00.000Z' }),
      achievement_active_recall_correct_count: '50',
      achievement_arena_win_count: '10',
      shards_balance: '100',
      last_active_date: '2026-05-12',
      daily_stats: JSON.stringify({
        '2026-05-10': { points: 8 },
        '2026-05-11': { points: 12 },
        '2026-05-12': { points: 6 },
      }),
      stats_daily_breakdown_v1: null,
    }, '2026-05-12')).toBe(3);
  });

  it('keeps a high streak when the QA seed fingerprint is absent', () => {
    expect(normalizeDevSeededStreakValue(500, {
      user_total_xp: '240000',
      login_bonus_v1: JSON.stringify({ consecutiveDays: 42 }),
      achievement_active_recall_correct_count: '12',
      achievement_arena_win_count: '2',
      shards_balance: '17',
      last_active_date: '2026-05-12',
    }, '2026-05-12')).toBe(500);
  });
});

describe('premium cloud sync safety', () => {
  beforeEach(() => {
    (AsyncStorage as any).__reset?.();
    jest.clearAllMocks();
  });

  it('does not sync empty local premium fields that could overwrite an admin grant in Firestore', () => {
    const local = {
      premium_plan: null,
      admin_premium_override: null,
      premium_expiry: null,
    };

    expect(shouldSyncPremiumProgressField('premium_plan', local.premium_plan, local)).toBe(false);
    expect(shouldSyncPremiumProgressField('admin_premium_override', local.admin_premium_override, local)).toBe(false);
    expect(shouldSyncPremiumProgressField('premium_expiry', local.premium_expiry, local)).toBe(false);
  });

  it('syncs meaningful admin premium state, including a zero expiry for forever grants', () => {
    const local = {
      premium_plan: 'annual',
      admin_premium_override: 'true',
      premium_expiry: '0',
    };

    expect(shouldSyncPremiumProgressField('premium_plan', local.premium_plan, local)).toBe(true);
    expect(shouldSyncPremiumProgressField('admin_premium_override', local.admin_premium_override, local)).toBe(true);
    expect(shouldSyncPremiumProgressField('premium_expiry', local.premium_expiry, local)).toBe(true);
  });

  it('hydrates admin-granted premium into the local active flag when local XP wins restore', async () => {
    const expiry = String(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await AsyncStorage.multiSet([
      ['user_total_xp', '13000'],
      ['streak_count', '20'],
      ['premium_active', 'false'],
    ]);

    const restored = await __cloudSyncTestHooks.applyRestoreFromUserDoc(makeCloudUserDoc({
      user_total_xp: '12000',
      streak_count: '14',
      premium_plan: 'annual',
      admin_premium_override: 'true',
      premium_expiry: expiry,
      premium_admin_grant_at: String(Date.now()),
    }));

    expect(restored).toBe(true);
    await expect(AsyncStorage.getItem('premium_plan')).resolves.toBe('annual');
    await expect(AsyncStorage.getItem('admin_premium_override')).resolves.toBe('true');
    await expect(AsyncStorage.getItem('premium_expiry')).resolves.toBe(expiry);
    await expect(AsyncStorage.getItem('premium_active')).resolves.toBe('true');
  });
});
