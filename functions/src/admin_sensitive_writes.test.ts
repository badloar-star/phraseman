import fs from 'fs';
import path from 'path';
import { HttpsError } from 'firebase-functions/v2/https';

const read = (name: string): string => fs.readFileSync(path.join(__dirname, name), 'utf8');

describe('critical admin write boundaries', () => {
  it('hard-enforces App Check and exposes a fail-closed runtime guard', () => {
    const options = require('./callable_options') as {
      ADMIN_SENSITIVE_WRITE_OPTIONS?: Readonly<{ region: string; enforceAppCheck: boolean }>;
      requireAdminAppCheck?: (request: { app?: unknown }) => void;
    };

    expect(options.ADMIN_SENSITIVE_WRITE_OPTIONS).toEqual({
      region: 'us-central1',
      enforceAppCheck: true,
    });
    const requireAdminAppCheck = options.requireAdminAppCheck;
    expect(typeof requireAdminAppCheck).toBe('function');
    if (!requireAdminAppCheck) return;
    expect(() => requireAdminAppCheck({})).toThrow(HttpsError);
    expect(() => requireAdminAppCheck({ app: {} })).not.toThrow();
  });

  it.each([
    ['admin_access_controls.ts', ['adminGrantAccess', 'adminSetUserBan']],
    ['admin_grant.ts', ['adminGrantReward', 'adminSetShardBalance']],
    ['admin_remote_config.ts', ['adminPublishRemoteConfig']],
    ['admin_referrals.ts', [
      'adminRevokeReferralAttribution',
      'adminSetSpinWeights',
      'adminSetReferralRouletteEnabled',
      'adminSetReferralRouletteEmergencyStop',
    ]],
  ] as const)('%s uses the hard option and handler guard for every sensitive writer', (file, names) => {
    const source = read(file);
    for (const name of names) {
      const start = source.indexOf(`export const ${name} = onCall(`);
      expect(start).toBeGreaterThan(-1);
      const next = source.indexOf('\nexport const ', start + 1);
      const body = source.slice(start, next > start ? next : undefined);
      expect(body).toContain('ADMIN_SENSITIVE_WRITE_OPTIONS');
      const guard = body.indexOf('requireAdminAppCheck(request);');
      expect(guard).toBeGreaterThan(-1);
      const firestore = body.search(/admin\.firestore\(\)|\.collection\(/);
      if (firestore >= 0) expect(guard).toBeLessThan(firestore);
    }
  });

  it('requires revision and command metadata for every specialized referral config write', () => {
    const referrals = require('./admin_referrals') as {
      normalizeReferralConfigCommand?: (data: unknown) => {
        expectedRevision: number;
        reason: string;
        requestId: string;
        idempotencyKey: string;
      };
    };
    expect(typeof referrals.normalizeReferralConfigCommand).toBe('function');
    if (!referrals.normalizeReferralConfigCommand) return;
    const valid = {
      expectedRevision: 7,
      reason: 'Reviewed referral configuration change',
      requestId: 'request-7',
      idempotencyKey: 'operation-7',
    };
    expect(referrals.normalizeReferralConfigCommand(valid)).toEqual(valid);
    for (const invalid of [
      { ...valid, expectedRevision: -1 },
      { ...valid, expectedRevision: 1.5 },
      { ...valid, expectedRevision: undefined },
      { ...valid, reason: '' },
      { ...valid, requestId: '' },
      { ...valid, idempotencyKey: '' },
    ]) {
      expect(() => referrals.normalizeReferralConfigCommand!(invalid)).toThrow(HttpsError);
    }
  });

  it('makes all three specialized referral config writers transactional CAS commands', () => {
    const source = read('admin_referrals.ts');
    for (const name of [
      'adminSetSpinWeights',
      'adminSetReferralRouletteEnabled',
      'adminSetReferralRouletteEmergencyStop',
    ]) {
      const start = source.indexOf(`export const ${name} = onCall(`);
      const next = source.indexOf('\nexport const ', start + 1);
      const body = source.slice(start, next > start ? next : undefined);
      expect(body).toContain("hasPermission(role, 'application.config.write')");
      expect(body).toContain('normalizeReferralConfigCommand(request.data)');
      expect(body).toContain('db.runTransaction(async (tx) =>');
      expect(body).toContain('currentRevision !== command.expectedRevision');
      expect(body).toContain("new HttpsError('aborted', 'remote_config_revision_conflict')");
      expect(body).toMatch(/(?:const revision =|revision:) currentRevision \+ 1/);
      expect(body).toContain("db.collection('admin_log').doc()");
      expect(body).toContain("db.collection('admin_command_operations')");
      expect(body).toContain('createAuditRecord({');
      expect(body).toContain('requestFingerprint');
      expect(body).toContain('replayed: true');
    }
  });
});
