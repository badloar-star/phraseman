const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const {
  buildRecoveryPlan,
  RECOVERY,
} = require('./recover_vitalii_xp_2026_09_04');

const DAILY_EVIDENCE = Object.freeze({
  '2026-07-15': { points: 9308, streak: 94 },
  '2026-07-16': { points: 3194, streak: 95 },
  '2026-07-17': { points: 2097, streak: 96 },
  '2026-07-18': { points: 1198, streak: 97 },
  '2026-07-19': { points: 3649, streak: 98 },
  '2026-07-20': { points: 3566, streak: 99 },
  '2026-07-21': { points: 3470, streak: 100 },
  '2026-07-22': { points: 3227, streak: 101 },
  '2026-07-23': { points: 7826, streak: 102 },
  '2026-07-24': { points: 3078, streak: 103 },
  '2026-07-25': { points: 3362, streak: 104 },
  '2026-07-26': { points: 4214, streak: 105 },
  '2026-07-27': { points: 1796, streak: 106 },
  '2026-07-28': { points: 2621, streak: 107 },
  '2026-07-29': { points: 3039, streak: 107 },
  '2026-07-30': { points: 4387, streak: 108 },
  '2026-07-31': { points: 3246, streak: 109 },
  '2026-08-01': { points: 3743, streak: 110 },
  '2026-08-02': { points: 5915, streak: 111 },
  '2026-08-03': { points: 4994, streak: 112 },
  '2026-08-04': { points: 2207, streak: 113 },
  '2026-08-05': { points: 2609, streak: 113 },
  '2026-08-06': { points: 2628, streak: 114 },
  '2026-08-07': { points: 2947, streak: 125 },
  '2026-08-08': { points: 3936, streak: 126 },
  '2026-08-09': { points: 1753, streak: 127 },
  '2026-08-10': { points: 4065, streak: 128 },
  '2026-08-11': { points: 2875, streak: 129 },
  '2026-08-12': { points: 3260, streak: 130 },
  '2026-08-13': { points: 3578, streak: 131 },
  '2026-08-14': { points: 3963, streak: 132 },
  '2026-08-15': { points: 3500, streak: 133 },
  '2026-08-16': { points: 6822, streak: 134 },
  '2026-08-17': { points: 4115, streak: 135 },
  '2026-08-18': { points: 4086, streak: 136 },
  '2026-08-19': { points: 32, streak: 137 },
  '2026-08-27': { points: 4102, streak: 1 },
  '2026-08-28': { points: 958, streak: 93 },
  '2026-08-29': { points: 782, streak: 138 },
  '2026-08-30': { points: 206, streak: 139 },
  '2026-08-31': { points: 483, streak: 140 },
  '2026-09-01': { points: 599, streak: 141 },
  '2026-09-02': { points: 1791, streak: 142 },
  '2026-09-03': { points: 2320, streak: 143 },
  '2026-09-04': { points: 400, streak: 144 },
});

function currentState() {
  return {
    userExists: true,
    user: {
      identityHidden: false,
      canonicalStableId: null,
      progressServerAuthoritative: true,
      progress: {
        user_name: 'Vitalii',
        user_total_xp: '564876',
        user_prev_xp: '564759',
        user_level: '50',
        streak_count: '143',
        last_active_date: '2026-09-03',
        streak_last_date: '2026-09-03',
        daily_stats: JSON.stringify(DAILY_EVIDENCE),
        level_reward_spin_balance: '0',
      },
      progressServerState: {
        totalXp: 564876,
        level: 50,
        streakCount: 143,
        lastActiveDate: '2026-09-03',
        weekKey: '2026-W36',
      },
      levelSpinServerState: {
        protocol: 'v1',
        levelBaseline: 50,
        balance: 0,
        activeRequestId: null,
      },
    },
    leaderboardExists: true,
    leaderboard: {
      points: 564876,
      streak: 143,
      groupId: 'current-group',
      groupWeekId: '2026-W36',
    },
    leagueGroupExists: true,
    leagueGroup: {
      weekId: '2026-W36',
      members: {
        [RECOVERY.uid]: { uid: RECOVERY.uid, totalXp: 564876, streak: 143, points: 1300 },
      },
    },
    level51CreditExists: false,
    level51Credit: {},
    premiumAccess: true,
  };
}

function applyExpectedState(state) {
  Object.assign(state.user.progress, {
    user_total_xp: '725190',
    user_prev_xp: '725190',
    user_level: '51',
    streak_count: '144',
    last_active_date: '2026-09-04',
    streak_last_date: '2026-09-04',
    level_reward_spin_balance: '1',
  });
  Object.assign(state.user.progressServerState, {
    totalXp: 725190,
    level: 51,
    streakCount: 144,
    lastActiveDate: '2026-09-04',
  });
  state.user.levelSpinServerState.levelBaseline = 51;
  state.user.levelSpinServerState.balance = 1;
  state.leaderboard.points = 725190;
  state.leaderboard.streak = 144;
  state.leagueGroup.members[RECOVERY.uid].totalXp = 725190;
  state.leagueGroup.members[RECOVERY.uid].streak = 144;
  state.level51CreditExists = true;
  state.level51Credit = {
    level: 51,
    kind: 'standard',
    premiumAtEarn: true,
    status: 'available',
    earnedAtMs: 1788505000000,
    consumedAtMs: null,
    claimRequestId: null,
    schemaVersion: 1,
    catalogVersion: 1,
  };
  return state;
}

describe('one-off Vitalii evidence-backed XP recovery', () => {
  it('plans exact XP, streak, mirror, and level-51 spin transition', () => {
    const plan = buildRecoveryPlan(currentState());

    assert.equal(plan.mode, 'apply');
    assert.deepEqual(plan.userPatch, {
      'progress.user_total_xp': '725190',
      'progress.user_prev_xp': '725190',
      'progress.user_level': '51',
      'progress.streak_count': '144',
      'progress.last_active_date': '2026-09-04',
      'progress.streak_last_date': '2026-09-04',
      'progress.level_reward_spin_balance': '1',
      'progressServerState.totalXp': 725190,
      'progressServerState.level': 51,
      'progressServerState.streakCount': 144,
      'progressServerState.lastActiveDate': '2026-09-04',
      'levelSpinServerState.levelBaseline': 51,
      'levelSpinServerState.balance': 1,
    });
    assert.deepEqual(plan.leaderboardPatch, { points: 725190, streak: 144 });
    assert.deepEqual(plan.leagueGroupPatch, {
      [`members.${RECOVERY.uid}.totalXp`]: 725190,
      [`members.${RECOVERY.uid}.streak`]: 144,
    });
    assert.equal(plan.creditMode, 'mint');
    assert.deepEqual(plan.levelSpinCredit, {
      level: 51,
      kind: 'standard',
      premiumAtEarn: true,
      status: 'available',
      consumedAtMs: null,
      claimRequestId: null,
      schemaVersion: 1,
      catalogVersion: 1,
    });
    assert.deepEqual(plan.evidence, {
      checkpointXp: 583243,
      dailyFrom: '2026-07-15',
      dailyThrough: '2026-09-04',
      dailyEntries: 45,
      dailyXp: 141947,
      dailyDigest: RECOVERY.dailyEvidenceDigest,
      targetXp: 725190,
      currentCanonicalXp: 564876,
      recoveredDelta: 160314,
    });

    const serialized = JSON.stringify(plan);
    for (const forbidden of ['shards', 'stars', 'achievement', 'rewardId', 'giftId']) {
      assert.equal(serialized.toLowerCase().includes(forbidden.toLowerCase()), false);
    }
  });

  it('recognizes the complete target state without minting another credit', () => {
    const plan = buildRecoveryPlan(applyExpectedState(currentState()));

    assert.equal(plan.mode, 'already-applied');
    assert.equal(plan.creditMode, 'preserve');
  });

  const rejectedMutations = [
    ['unexpected current XP', (state) => { state.user.progress.user_total_xp = '564877'; }],
    ['unexpected previous XP', (state) => { state.user.progress.user_prev_xp = '564760'; }],
    ['shadow XP mismatch', (state) => { state.user.progressServerState.totalXp = 1; }],
    ['unexpected current level', (state) => { state.user.progress.user_level = '49'; }],
    ['streak mirror mismatch', (state) => { state.leaderboard.streak = 138; }],
    ['daily evidence content changed', (state) => {
      const stats = JSON.parse(state.user.progress.daily_stats);
      stats['2026-09-04'].points += 1;
      state.user.progress.daily_stats = JSON.stringify(stats);
    }],
    ['daily evidence boundary missing', (state) => {
      const stats = JSON.parse(state.user.progress.daily_stats);
      delete stats['2026-07-15'];
      state.user.progress.daily_stats = JSON.stringify(stats);
    }],
    ['daily streak does not prove next day', (state) => {
      const stats = JSON.parse(state.user.progress.daily_stats);
      stats['2026-09-04'].streak = 143;
      state.user.progress.daily_stats = JSON.stringify(stats);
    }],
    ['spin balance mismatch', (state) => { state.user.levelSpinServerState.balance = 1; }],
    ['active spin request', (state) => { state.user.levelSpinServerState.activeRequestId = 'request0000000001'; }],
    ['unexpected existing level-51 credit', (state) => {
      state.level51CreditExists = true;
      state.level51Credit = { level: 51, status: 'consumed' };
    }],
    ['premium entitlement drift', (state) => { state.premiumAccess = false; }],
    ['hidden identity', (state) => { state.user.identityHidden = true; }],
    ['league membership mismatch', (state) => { state.leagueGroup.members[RECOVERY.uid].uid = 'other'; }],
  ];

  for (const [label, mutate] of rejectedMutations) {
    it(`fails closed on ${label}`, () => {
      const state = currentState();
      mutate(state);
      assert.throws(() => buildRecoveryPlan(state), /RECOVERY_PRECONDITION_FAILED/);
    });
  }
});
