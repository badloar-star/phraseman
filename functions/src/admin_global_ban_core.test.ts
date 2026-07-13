import {
  buildBanReconciliation,
  buildBanWrites,
  buildUnbanWrites,
  fingerprintLeaderboard,
} from './admin_global_ban_core';

const NOW = Date.UTC(2026, 6, 13, 12);

describe('Admin global ban core', () => {
  test('treats banned_users as the runtime source of truth and reports stale projections', () => {
    expect(buildBanReconciliation({ bannedDocumentExists: true, usersBanned: true, leaderboardPresent: false, chatRestricted: false })).toEqual({
      globalState: 'banned', projectionState: 'consistent', mismatches: [], usersBanned: true,
      leaderboardPresent: false, chatRestricted: false,
    });
    expect(buildBanReconciliation({ bannedDocumentExists: true, usersBanned: false, leaderboardPresent: true, chatRestricted: true })).toEqual({
      globalState: 'banned', projectionState: 'inconsistent', mismatches: ['leaderboard_present_while_banned', 'users_flag_missing'],
      usersBanned: false, leaderboardPresent: true, chatRestricted: true,
    });
    expect(buildBanReconciliation({ bannedDocumentExists: false, usersBanned: true, leaderboardPresent: false, chatRestricted: true })).toEqual({
      globalState: 'active', projectionState: 'inconsistent', mismatches: ['users_flag_stale'], usersBanned: true,
      leaderboardPresent: false, chatRestricted: true,
    });
  });

  test('marks unavailable reads explicitly instead of guessing a ban state', () => {
    expect(buildBanReconciliation({ bannedDocumentExists: null, usersBanned: true, leaderboardPresent: null, chatRestricted: null })).toEqual({
      globalState: 'unavailable', projectionState: 'unavailable', mismatches: ['authoritative_source_unavailable'],
      usersBanned: true, leaderboardPresent: null, chatRestricted: null,
    });
    expect(buildBanReconciliation({ bannedDocumentExists: true, usersBanned: null, leaderboardPresent: false, chatRestricted: null })).toMatchObject({
      globalState: 'banned', projectionState: 'unavailable', mismatches: ['users_projection_unavailable'],
    });
  });

  test('builds one global ban mutation without silently creating a chat restriction', () => {
    const leaderboardBefore = { uid: 'u1', name: 'Alice', points: 120, updatedAt: 10 };
    const result = buildBanWrites({
      uid: 'u1', name: 'Alice', reason: 'Repeated abuse', actorUid: 'owner-1', nowMs: NOW,
      leaderboardBefore, sourceReportId: 'report-1', source: 'user_report',
    });

    expect(result).toEqual({
      bannedDocument: { uid: 'u1', name: 'Alice', reason: 'Repeated abuse', bannedAtMs: NOW, bannedAt: new Date(NOW).toISOString(), bannedBy: 'owner-1', source: 'user_report', sourceReportId: 'report-1' },
      userPatch: { banned: true, bannedAtMs: NOW, updatedAt: NOW },
      deleteLeaderboard: true,
      reportPatch: { status: 'banned', reviewedAtMs: NOW, reviewedBy: 'owner-1' },
      history: { leaderboardBefore, leaderboardFingerprint: fingerprintLeaderboard(leaderboardBefore), source: 'user_report' },
    });
    expect(JSON.stringify(result)).not.toContain('league_chat_bans');
    expect(JSON.stringify(result)).not.toContain('chatRestricted');
  });

  test('preserves validated Help Board context in the authoritative ban and rollback history', () => {
    const result = buildBanWrites({
      uid: 'u2', name: 'Bob', reason: 'Confirmed abuse', actorUid: 'owner-1', nowMs: NOW,
      source: 'help_board', sourceTargetType: 'comment', sourceTargetId: 'comment-42',
    });

    expect(result.bannedDocument).toMatchObject({
      source: 'help_board', sourceTargetType: 'comment', sourceTargetId: 'comment-42',
    });
    expect(result.history).toMatchObject({
      source: 'help_board', sourceTargetType: 'comment', sourceTargetId: 'comment-42',
    });
  });

  test('unbans without promising leaderboard restoration when no safe before-state exists', () => {
    expect(buildUnbanWrites({ uid: 'u1', actorUid: 'owner-1', nowMs: NOW, leaderboardBefore: null, leaderboardCurrent: null })).toEqual({
      deleteBannedDocument: true,
      userPatch: { banned: false, unbannedAtMs: NOW, updatedAt: NOW },
      restoreLeaderboard: null,
      restoreState: 'not_available',
    });
  });

  test('restores a captured leaderboard only when the current slot is still empty', () => {
    const before = { uid: 'u1', name: 'Alice', points: 120, updatedAt: 10 };
    expect(buildUnbanWrites({ uid: 'u1', actorUid: 'owner-1', nowMs: NOW, leaderboardBefore: before, leaderboardCurrent: null })).toEqual({
      deleteBannedDocument: true,
      userPatch: { banned: false, unbannedAtMs: NOW, updatedAt: NOW },
      restoreLeaderboard: before,
      restoreState: 'ready',
    });
    expect(buildUnbanWrites({ uid: 'u1', actorUid: 'owner-1', nowMs: NOW, leaderboardBefore: before, leaderboardCurrent: { uid: 'u1', name: 'New state' } })).toMatchObject({
      restoreLeaderboard: null, restoreState: 'target_changed',
    });
  });
});
