import fs from 'fs';
import path from 'path';
import { HttpsError } from 'firebase-functions/v2/https';
import {
  assertAdminUserOperationReplay,
  assertSafeDuplicateAlias,
  normalizeAdminAliasDeleteCommand,
  normalizeAdminPremiumMigrationCommand,
  normalizeAdminProfileFieldCommand,
  normalizeAdminProgressResetCommand,
  normalizeAdminReportModerationCommand,
  normalizeAdminWarningCommand,
  requireAdminUserOperationActor,
} from './admin_user_operations';

const commandMeta = {
  reason: 'Verified support operation',
  requestId: 'request-1',
  idempotencyKey: 'operation-1',
};

describe('protected admin user operations', () => {
  it('accepts only the three supported profile fields with bounded values', () => {
    expect(normalizeAdminProfileFieldCommand({ uid: 'stable-user', field: 'user_name', value: 'New Name', ...commandMeta }))
      .toMatchObject({ field: 'user_name', value: 'New Name' });
    expect(normalizeAdminProfileFieldCommand({ uid: 'stable-user', field: 'user_total_xp', value: 42, ...commandMeta }))
      .toMatchObject({ field: 'user_total_xp', value: 42 });
    expect(normalizeAdminProfileFieldCommand({ uid: 'stable-user', field: 'streak_count', value: 7, ...commandMeta }))
      .toMatchObject({ field: 'streak_count', value: 7 });
    for (const input of [
      { uid: 'stable-user', field: 'premium_plan', value: 'annual', ...commandMeta },
      { uid: 'stable-user', field: 'shards', value: 1, ...commandMeta },
      { uid: 'stable-user', field: 'user_total_xp', value: -1, ...commandMeta },
      { uid: 'stable-user', field: 'streak_count', value: 1.5, ...commandMeta },
      { uid: 'stable-user', field: 'user_name', value: '', ...commandMeta },
      { uid: 'stable-user', field: 'user_name', value: 'Name', ...commandMeta, reason: '' },
    ]) expect(() => normalizeAdminProfileFieldCommand(input)).toThrow(HttpsError);
  });

  it('normalizes warning, composite report, reset, alias-delete, and bounded migration commands', () => {
    expect(normalizeAdminWarningCommand({ uid: 'stable-user', name: 'Name', message: 'Please rename', ...commandMeta }))
      .toMatchObject({ uid: 'stable-user', message: 'Please rename' });
    expect(normalizeAdminReportModerationCommand({
      uid: 'stable-user', reportId: 'report-1', expectedStatus: 'new', action: 'rename', newName: 'Safe Name', ...commandMeta,
    })).toMatchObject({ action: 'rename', nextStatus: 'reviewed' });
    expect(normalizeAdminReportModerationCommand({
      uid: 'stable-user', reportId: 'report-1', expectedStatus: 'new', action: 'ban', ...commandMeta,
    })).toMatchObject({ action: 'ban', nextStatus: 'banned' });
    expect(normalizeAdminReportModerationCommand({
      reportId: 'report-1', expectedStatus: 'new', action: 'status', nextStatus: 'archived', ...commandMeta,
    })).toMatchObject({ action: 'status', nextStatus: 'archived' });
    expect(normalizeAdminProgressResetCommand({ uid: 'stable-user', reset: 'achievements', ...commandMeta }))
      .toMatchObject({ reset: 'achievements' });
    expect(normalizeAdminAliasDeleteCommand({ uid: 'hidden-alias', expectedCanonicalUid: 'stable-user', ...commandMeta }))
      .toMatchObject({ uid: 'hidden-alias', expectedCanonicalUid: 'stable-user' });
    expect(normalizeAdminPremiumMigrationCommand({ uids: ['user-a', 'user-b'], ...commandMeta }))
      .toMatchObject({ uids: ['user-a', 'user-b'] });
    expect(() => normalizeAdminPremiumMigrationCommand({ uids: Array.from({ length: 501 }, (_, i) => `user-${i}`), ...commandMeta }))
      .toThrow(HttpsError);
  });

  it('fails closed for role and admin-claim mismatches', () => {
    expect(() => requireAdminUserOperationActor({}, 'users.write')).toThrow(HttpsError);
    expect(() => requireAdminUserOperationActor({ auth: { uid: 'support', token: { admin: true, adminRole: 'support' } } }, 'users.write'))
      .toThrow(HttpsError);
    expect(requireAdminUserOperationActor({ auth: { uid: 'legacy-admin', token: { admin: true } } }, 'users.write'))
      .toMatchObject({ actorUid: 'legacy-admin', role: 'owner' });
    expect(requireAdminUserOperationActor({ auth: { uid: 'admin', token: { admin: true, adminRole: 'admin', email: 'a@example.com' } } }, 'users.write'))
      .toMatchObject({ actorUid: 'admin', role: 'admin' });
  });

  it('binds idempotent replay to both payload and actor', () => {
    expect(() => assertAdminUserOperationReplay({ requestFingerprint: 'fp', actorUid: 'admin' }, 'fp', 'admin')).not.toThrow();
    expect(() => assertAdminUserOperationReplay({ requestFingerprint: 'other', actorUid: 'admin' }, 'fp', 'admin')).toThrow(HttpsError);
    expect(() => assertAdminUserOperationReplay({ requestFingerprint: 'fp', actorUid: 'other' }, 'fp', 'admin')).toThrow(HttpsError);
  });

  it('permits duplicate deletion only for a proven hidden noncanonical alias', () => {
    expect(() => assertSafeDuplicateAlias(
      { identityHidden: true, canonicalStableId: 'stable-user' },
      { identityHidden: false },
      'hidden-alias',
      'stable-user',
      0,
      0,
    )).not.toThrow();
    const rejectedAliases: ReadonlyArray<Parameters<typeof assertSafeDuplicateAlias>> = [
      [{ identityHidden: false }, { identityHidden: false }, 'hidden-alias', 'stable-user', 0, 0],
      [{ identityHidden: true, canonicalStableId: 'other' }, { identityHidden: false }, 'hidden-alias', 'stable-user', 0, 0],
      [{ identityHidden: true, canonicalStableId: 'stable-user' }, { identityHidden: true }, 'hidden-alias', 'stable-user', 0, 0],
      [{ identityHidden: true, canonicalStableId: 'stable-user' }, { identityHidden: false }, 'hidden-alias', 'stable-user', 1, 0],
      [{ identityHidden: true, canonicalStableId: 'stable-user' }, { identityHidden: false }, 'hidden-alias', 'stable-user', 0, 1],
    ];
    for (const args of rejectedAliases) expect(() => assertSafeDuplicateAlias(...args)).toThrow(HttpsError);
  });

  it('queues a tombstoned alias for offline cleanup without deleting online parent documents', () => {
    const source = fs.readFileSync(path.join(__dirname, 'admin_user_operations.ts'), 'utf8');
    const start = source.indexOf('export const adminDeleteDuplicateUser');
    const end = source.indexOf('\nexport const adminMigrateLegacyAdminPremium', start);
    const body = source.slice(start, end);
    expect(body).toContain("collection('admin_duplicate_cleanup_jobs')");
    expect(body).toContain("status: 'queued'");
    expect(body).toContain('tombstoned: true');
    expect(body).toContain('physicallyDeleted: false');
    expect(body).not.toContain('tx.delete(aliasRef)');
    expect(body).not.toContain('tx.delete(leaderboardRef)');
    expect(body).not.toContain('listCollections()');
  });

  it('uses hard App Check, runtime guards, transactions, audit, and operation records for every writer', () => {
    const source = fs.readFileSync(path.join(__dirname, 'admin_user_operations.ts'), 'utf8');
    for (const name of [
      'adminUpdateUserProfileField', 'adminWarnUser', 'adminResolveUserReport', 'adminRequestUserMerge',
      'adminDeleteDuplicateUser', 'adminMigrateLegacyAdminPremium', 'adminResetUserProgress',
    ]) {
      const start = source.indexOf(`export const ${name} = onCall(`);
      const next = source.indexOf('\nexport const ', start + 1);
      const body = source.slice(start, next > start ? next : undefined);
      expect(start).toBeGreaterThan(-1);
      expect(body).toContain('ADMIN_SENSITIVE_WRITE_OPTIONS');
      expect(body).toContain('requireAdminAppCheck(request);');
    }
    expect(source).toContain("new HttpsError('failed-precondition', 'admin_user_merge_requires_offline_migration')");
    expect(source).toContain("collection('admin_command_operations')");
    expect(source).toContain("collection('admin_log')");
    expect(source).toContain('runTransaction(async (tx) =>');
  });
});
