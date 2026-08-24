import {
  ADMIN_USER_BRIEFS_RATE_LIMIT_MAX_UIDS,
  ADMIN_USER_BRIEFS_RATE_LIMIT_WINDOW_MS,
  assertAdminUserBriefsAccess,
  parseAdminUserBriefsRequest,
  planAdminUserBriefsRateLimit,
  projectAdminUserBrief,
} from './admin_user_briefs';

describe('adminUserBriefs bounded projection', () => {
  it('requires an authenticated admin with users.read', () => {
    expect(() => assertAdminUserBriefsAccess(undefined)).toThrow('Admin only');
    expect(() => assertAdminUserBriefsAccess({ uid: 'editor', token: { admin: true, adminRole: 'content_editor' } }))
      .toThrow('Role cannot read users');
    expect(() => assertAdminUserBriefsAccess({ uid: 'support', token: { admin: true, adminRole: 'support' } }))
      .not.toThrow();
  });

  it('deduplicates at most 80 safe UIDs and fails closed above the cap', () => {
    expect(parseAdminUserBriefsRequest({ uids: [' uid-a ', 'uid-b', 'uid-a'] }))
      .toEqual(['uid-a', 'uid-b']);
    expect(() => parseAdminUserBriefsRequest({ uids: Array.from({ length: 81 }, (_, index) => `uid-${index}`) }))
      .toThrow('admin_user_briefs_too_many_uids');
    expect(() => parseAdminUserBriefsRequest({ uids: Array.from({ length: 81 }, () => 'same-uid') }))
      .toThrow('admin_user_briefs_too_many_uids');
    expect(() => parseAdminUserBriefsRequest({ uids: ['users/uid-a'] }))
      .toThrow('admin_user_briefs_uid_invalid');
  });

  it('enforces a fail-closed per-actor transactional UID budget', () => {
    const actorUid = 'support-admin';
    const nowMs = 1_000_000;
    const first = planAdminUserBriefsRateLimit(undefined, { actorUid, requestedCount: 80, nowMs });
    expect(first).toEqual({
      schemaVersion: 'admin-user-briefs-rate-limit.v1',
      actorUid,
      windowStartedAtMs: nowMs,
      usedUids: 80,
      updatedAtMs: nowMs,
    });
    expect(planAdminUserBriefsRateLimit(first, {
      actorUid,
      requestedCount: ADMIN_USER_BRIEFS_RATE_LIMIT_MAX_UIDS - 80,
      nowMs: nowMs + 1,
    }).usedUids).toBe(ADMIN_USER_BRIEFS_RATE_LIMIT_MAX_UIDS);
    expect(() => planAdminUserBriefsRateLimit(first, {
      actorUid,
      requestedCount: ADMIN_USER_BRIEFS_RATE_LIMIT_MAX_UIDS,
      nowMs: nowMs + 2,
    })).toThrow('admin_user_briefs_rate_limited');
    expect(planAdminUserBriefsRateLimit(first, {
      actorUid,
      requestedCount: 1,
      nowMs: nowMs + ADMIN_USER_BRIEFS_RATE_LIMIT_WINDOW_MS,
    }).usedUids).toBe(1);
    expect(() => planAdminUserBriefsRateLimit({ ...first, actorUid: 'other-admin' }, {
      actorUid,
      requestedCount: 1,
      nowMs: nowMs + 1,
    })).toThrow('admin_user_briefs_rate_limit_corrupt');
  });

  it('returns only the allowlisted identity brief and never raw profile or PII', () => {
    const projected = projectAdminUserBrief('uid-a', {
      email: 'private@example.com',
      phone: '+353000000',
      progress: {
        user_name: 'Learner',
        user_name_index: '1042',
        user_avatar: 'owl',
        shards: 999,
      },
    }, {
      name: 'Public fallback',
      avatarKey: 'fox',
      bio: 'private bio',
    });

    expect(projected).toEqual({
      uid: 'uid-a',
      name: 'Learner',
      nameIndex: '1042',
      avatar: 'owl',
      found: true,
    });
    expect(JSON.stringify(projected)).not.toContain('private@example.com');
    expect(JSON.stringify(projected)).not.toContain('shards');
    expect(Object.keys(projected).sort()).toEqual(['avatar', 'found', 'name', 'nameIndex', 'uid']);
  });

  it('returns an explicit not-found brief without leaking source shapes', () => {
    expect(projectAdminUserBrief('missing', undefined, undefined)).toEqual({
      uid: 'missing',
      name: '',
      nameIndex: '',
      avatar: '',
      found: false,
    });
  });
});
