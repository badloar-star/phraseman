import fs from 'fs';
import path from 'path';
import { HttpsError } from 'firebase-functions/v2/https';

const modulePath = path.join(__dirname, 'admin_account_delete.ts');
const source = fs.existsSync(modulePath) ? fs.readFileSync(modulePath, 'utf8') : '';
const indexSource = fs.readFileSync(path.join(__dirname, 'index.ts'), 'utf8');
const subject = (fs.existsSync(modulePath) ? require('./admin_account_delete') : {}) as {
  normalizeAdminAccountDeleteInput?: (data: unknown) => Record<string, unknown>;
  resolveAdminAccountDeleteIdentityEvidence?: (input: Record<string, unknown>) => Record<string, unknown>;
  assertAdminAccountDeleteNotSelf?: (input: Record<string, unknown>) => void;
  assertIdentityQueryNotTruncated?: (sizes: readonly number[], limit: number) => void;
  assertAdminAccountDeleteIdentityAnchors?: (input: Record<string, unknown>) => void;
  queuedDeletionJobMatchesIdentity?: (
    jobId: string,
    job: Record<string, unknown>,
    target: Record<string, unknown>,
  ) => boolean;
};

const canonicalEvidence = {
  requestedUid: 'stable-user',
  requestedUser: {
    identityHidden: false,
    firebaseAuthUid: 'auth-user',
    linkedAuth: { providerUid: 'auth-user' },
  },
  canonicalUser: null,
  authLinks: [
    { id: 'auth-user', data: { stable_id: 'stable-user', providerUid: 'auth-user' } },
  ],
  authOwners: [
    { id: 'stable-user', data: { identityHidden: false, firebaseAuthUid: 'auth-user' } },
  ],
  authRecordUid: 'auth-user',
};

describe('protected admin account deletion queue', () => {
  it('requires a safe stable target, reason, request id and idempotency key', () => {
    expect(typeof subject.normalizeAdminAccountDeleteInput).toBe('function');
    const normalize = subject.normalizeAdminAccountDeleteInput!;
    expect(normalize({
      uid: 'stable-user',
      reason: 'verified privacy deletion request',
      requestId: 'request-1',
      idempotencyKey: 'operation-1',
    })).toEqual({
      uid: 'stable-user',
      reason: 'verified privacy deletion request',
      requestId: 'request-1',
      idempotencyKey: 'operation-1',
    });
    for (const invalid of [
      { uid: '../users', reason: 'x', requestId: 'request-1', idempotencyKey: 'operation-1' },
      { uid: 'stable-user', reason: '', requestId: 'request-1', idempotencyKey: 'operation-1' },
      { uid: 'stable-user', reason: 'x', requestId: 'bad key', idempotencyKey: 'operation-1' },
    ]) {
      expect(() => normalize(invalid)).toThrow(HttpsError);
    }
  });

  it('resolves exactly one canonical stable uid and one Firebase Auth uid', () => {
    expect(typeof subject.resolveAdminAccountDeleteIdentityEvidence).toBe('function');
    const resolve = subject.resolveAdminAccountDeleteIdentityEvidence!;
    expect(resolve(canonicalEvidence)).toEqual({ stableUid: 'stable-user', authUid: 'auth-user' });
    expect(resolve({
      ...canonicalEvidence,
      requestedUid: 'legacy-alias',
      requestedUser: { identityHidden: true, canonicalStableId: 'stable-user' },
      canonicalUser: {
        id: 'stable-user',
        data: canonicalEvidence.requestedUser,
      },
      authOwners: [
        ...canonicalEvidence.authOwners,
        { id: 'legacy-alias', data: { identityHidden: true, canonicalStableId: 'stable-user' } },
      ],
    })).toEqual({ stableUid: 'stable-user', authUid: 'auth-user' });
  });

  it('fails closed on missing or ambiguous identity evidence', () => {
    const resolve = subject.resolveAdminAccountDeleteIdentityEvidence!;
    for (const evidence of [
      { ...canonicalEvidence, requestedUser: null },
      { ...canonicalEvidence, requestedUser: { identityHidden: true, canonicalStableId: 'missing' }, canonicalUser: null },
      {
        ...canonicalEvidence,
        requestedUser: {
          ...canonicalEvidence.requestedUser,
          linkedAuth: { providerUid: 'different-auth' },
        },
      },
      { ...canonicalEvidence, authRecordUid: null },
      {
        ...canonicalEvidence,
        authOwners: [
          ...canonicalEvidence.authOwners,
          { id: 'foreign-visible', data: { identityHidden: false, firebaseAuthUid: 'auth-user' } },
        ],
      },
    ]) {
      expect(() => resolve(evidence)).toThrow(HttpsError);
    }
  });

  it('blocks deleting the caller by auth uid or canonical/linked stable identity', () => {
    expect(typeof subject.assertAdminAccountDeleteNotSelf).toBe('function');
    const assertNotSelf = subject.assertAdminAccountDeleteNotSelf!;
    expect(() => assertNotSelf({
      actorAuthUid: 'auth-user',
      actorStableUids: [],
      target: { stableUid: 'stable-user', authUid: 'auth-user' },
    })).toThrow(HttpsError);
    expect(() => assertNotSelf({
      actorAuthUid: 'admin-auth',
      actorStableUids: ['admin-stable', 'admin-legacy'],
      target: { stableUid: 'admin-stable', authUid: 'target-auth' },
    })).toThrow(HttpsError);
    expect(() => assertNotSelf({
      actorAuthUid: 'admin-auth',
      actorStableUids: ['admin-stable'],
      target: { stableUid: 'stable-user', authUid: 'auth-user' },
    })).not.toThrow();
  });

  it('fails closed when a bounded identity query may have truncated evidence', () => {
    expect(typeof subject.assertIdentityQueryNotTruncated).toBe('function');
    const assertNotTruncated = subject.assertIdentityQueryNotTruncated!;
    expect(() => assertNotTruncated([0, 2], 3)).not.toThrow();
    expect(() => assertNotTruncated([3, 0], 3)).toThrow(HttpsError);
    expect(() => assertNotTruncated([20], 20)).toThrow(HttpsError);
  });

  it('rechecks the canonical user and direct auth link before creating the operation', () => {
    expect(typeof subject.assertAdminAccountDeleteIdentityAnchors).toBe('function');
    const assertAnchors = subject.assertAdminAccountDeleteIdentityAnchors!;
    const anchors = {
      requestedUid: 'stable-user',
      requestedUser: canonicalEvidence.requestedUser,
      stableUser: canonicalEvidence.requestedUser,
      authLink: { stable_id: 'stable-user', providerUid: 'auth-user' },
      target: { stableUid: 'stable-user', authUid: 'auth-user' },
    };
    expect(() => assertAnchors(anchors)).not.toThrow();
    expect(() => assertAnchors({
      ...anchors,
      authLink: { stable_id: 'foreign-stable', providerUid: 'auth-user' },
    })).toThrow(HttpsError);
    expect(() => assertAnchors({
      ...anchors,
      stableUser: { ...canonicalEvidence.requestedUser, firebaseAuthUid: 'changed-auth' },
    })).toThrow(HttpsError);
  });

  it('permits anchor-less crash recovery only for the deterministic matching deletion job', () => {
    expect(typeof subject.queuedDeletionJobMatchesIdentity).toBe('function');
    const matches = subject.queuedDeletionJobMatchesIdentity!;
    const target = { stableUid: 'stable-user', authUid: 'auth-user' };
    const expectedJobId = 'adel_aeaa476e82d4e4e2278c8094b846dba536817d74';
    const hashes = {
      authUidHash: 'aeaa476e82d4e4e2278c8094b846dba536817d748a23e974580054986eaee424',
      stableUidHash: '9ef0c08f75cbd588eeec79faa96762cfd239969c75596f00e962a18bfafa9e75',
    };
    expect(matches(expectedJobId, {
      ...hashes, authUid: 'auth-user', stableUid: 'stable-user', status: 'queued',
    }, target)).toBe(true);
    expect(matches(expectedJobId, { ...hashes, status: 'completed' }, target)).toBe(true);
    expect(matches(expectedJobId, {
      ...hashes, authUid: 'auth-user', stableUid: 'foreign-stable', status: 'queued',
    }, target)).toBe(false);
    expect(matches(expectedJobId, {
      ...hashes,
      stableUidHash: '26baf7f22d5d5909980d4b1df32d5d42740c4d091dbff146c7a57ad00905e97e',
      status: 'completed',
    }, target)).toBe(false);
    expect(matches(expectedJobId, { authUid: 'auth-user', stableUid: 'stable-user', status: 'queued' }, target)).toBe(false);
    expect(matches('adel_wrong', { ...hashes, status: 'completed' }, target)).toBe(false);
  });

  it('uses a sensitive AppCheck owner-only, resumable queue boundary with audit and auth hardening', () => {
    expect(source).toContain('export const adminQueueAccountDeletion = onCall(ADMIN_ACCOUNT_DELETE_OPTIONS');
    expect(source).toContain('ENFORCE_APP_CHECK_SENSITIVE');
    expect(source).toContain('if (!request.app)');
    expect(source).toContain("hasPermission(role, 'users.delete')");
    expect(source).toContain('fenceAccountDeletionRoots(db, identity.authUid, identity.stableUid, closureCutoffMs)');
    expect(source).toContain('resolveAccountDeleteIdentityClosure(');
    expect(source).toContain('identityClosure,');
    expect(source).toContain("state: 'pending_enqueue'");
    expect(source).toContain('requestFingerprint');
    expect(source).toContain("action: 'account.delete.queue'");
    expect(source).toContain('createAuditRecord({');
    expect(source).toContain('updateUser(identity.authUid, { disabled: true })');
    expect(source).toContain('revokeRefreshTokens(identity.authUid)');
    expect(source.match(/assertAdminAccountDeleteIdentityAnchors\(/g) || []).toHaveLength(3);
    expect(source).not.toMatch(/recursiveDelete|deleteUser\s*\(/);
    expect(indexSource).toContain('adminQueueAccountDeletion');
  });
});
