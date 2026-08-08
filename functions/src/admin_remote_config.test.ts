import fs from 'fs';
import path from 'path';
import { HttpsError } from 'firebase-functions/v2/https';
import { hasPermission, roleFromAdminToken } from './admin/permissions';
import {
  assertRemoteConfigReplay,
  buildRemoteConfigRequestFingerprint,
  mergeRemoteConfigBranches,
  parseRemoteConfigRequest,
} from './admin_remote_config';

const source = fs.readFileSync(path.join(__dirname, 'admin_remote_config.ts'), 'utf8');

describe('parseRemoteConfigRequest', () => {
  it('defaults a bare admin claim to owner while preserving explicit lower-role constraints', () => {
    const owner = roleFromAdminToken({ admin: true });
    const support = roleFromAdminToken({ admin: true, adminRole: 'support' });
    expect(owner).toBe('owner');
    expect(hasPermission(owner, 'application.config.write')).toBe(true);
    expect(support).toBe('support');
    expect(hasPermission(support, 'application.config.write')).toBe(false);
    expect(source).toContain("import { hasPermission, roleFromAdminToken } from './admin/permissions';");
    expect(source.match(/roleFromAdminToken\(request\.auth\.token\)/g) || []).toHaveLength(2);
    expect(source).not.toContain('adminRole claim required');
  });

  it('accepts the compatible remote-config shape', () => {
    expect(parseRemoteConfigRequest({
      nextConfig: { bools: { maintenance: false }, version: 2 },
      expectedRevision: 3,
      idempotencyKey: 'op-3',
      reason: 'Enable the reviewed release flag',
      requestId: 'req-3',
    })).toMatchObject({ expectedRevision: 3, idempotencyKey: 'op-3' });
  });

  it('rejects arbitrary document fields and stale revision values', () => {
    expect(() => parseRemoteConfigRequest({
      nextConfig: { secret: 'nope' }, expectedRevision: 0, idempotencyKey: 'op', reason: 'x', requestId: 'r',
    })).toThrow(HttpsError);
    expect(() => parseRemoteConfigRequest({
      nextConfig: { bools: {} }, expectedRevision: 1.5, idempotencyKey: 'op', reason: 'x', requestId: 'r',
    })).toThrow(HttpsError);
    expect(() => parseRemoteConfigRequest({
      nextConfig: { bools: 'not-an-object' }, expectedRevision: 0, idempotencyKey: 'op', reason: 'x', requestId: 'r',
    })).toThrow(HttpsError);
  });

  it('merges typed branches without deleting keys outside the submitted patch', () => {
    expect(mergeRemoteConfigBranches(
      { revision: 4, bools: { maintenance: false, referrals: true }, numbers: { freeLessons: 3 }, texts: { banner: 'old' }, untouched: 'keep' },
      { bools: { maintenance: true }, texts: { banner: 'new' } },
    )).toEqual({
      revision: 4,
      bools: { maintenance: true, referrals: true },
      numbers: { freeLessons: 3 },
      texts: { banner: 'new' },
      untouched: 'keep',
    });
  });

  it('binds replay to both the original actor and the full publish command', () => {
    const command = parseRemoteConfigRequest({
      nextConfig: { bools: { maintenance: true } }, expectedRevision: 4,
      idempotencyKey: 'remote-config-op-4', reason: 'Reviewed maintenance publish', requestId: 'remote-config-request-4',
    });
    const requestFingerprint = buildRemoteConfigRequestFingerprint(command);
    const operation = { actorUid: 'owner-a', requestFingerprint };
    expect(() => assertRemoteConfigReplay(operation, requestFingerprint, 'owner-a')).not.toThrow();
    expect(() => assertRemoteConfigReplay(operation, requestFingerprint, 'owner-b')).toThrow(HttpsError);
    expect(buildRemoteConfigRequestFingerprint({ ...command, expectedRevision: 5 })).not.toBe(requestFingerprint);
    expect(source).toContain('assertRemoteConfigReplay(previous, requestFingerprint, actorUid)');
  });
});
