import fs from 'node:fs';
import path from 'node:path';
import { HttpsError } from 'firebase-functions/v2/https';
import {
  assertReferralDevGrantAcquisitionAllowed,
  reconcileDevGrantLedger,
} from './referral_dev_grant_policy';

describe('referral dev grant acquisition policy', () => {
  test('keeps DEV grants unlimited without weakening server authorization gates', () => {
    const source = fs.readFileSync(path.join(__dirname, 'referral_dev_grant.ts'), 'utf8');
    const client = fs.readFileSync(path.resolve(__dirname, '..', '..', 'app', 'roulette_spin_client.ts'), 'utf8');
    const screen = fs.readFileSync(path.resolve(__dirname, '..', '..', 'app', 'referrals.tsx'), 'utf8');
    const transactionBody = source.slice(source.indexOf('return db.runTransaction(async (tx)'));
    const transactionalDevGate = transactionBody.indexOf('configData?.numbers?.referral_dev_grant_enabled !== true');
    const firstWrite = transactionBody.indexOf('tx.create(');

    expect(source).toContain("throw new HttpsError('unauthenticated', 'Auth required')");
    expect(source).toContain('await assertAuthStableLink(db, authUid, stableId)');
    expect(source).toContain('await isDevGrantEnabled(db)');
    expect(transactionalDevGate).toBeGreaterThan(0);
    expect(firstWrite).toBeGreaterThan(transactionalDevGate);
    expect(source).not.toContain('MAX_GRANTS_PER_DAY');
    expect(source).not.toContain('referral_dev_grants_daily');
    expect(source).not.toContain('DEV_GRANT_DAILY_LIMIT');
    expect(client).not.toContain("reason: 'daily_limit'");
    expect(client).not.toContain('DEV_GRANT_DAILY_LIMIT');
    expect(screen).not.toContain("res.reason === 'daily_limit'");
    expect(screen).not.toContain('лимит 10 ключей в сутки');
  });

  test('allows issuance only while roulette acquisition is enabled', () => {
    expect(() => assertReferralDevGrantAcquisitionAllowed({
      softEnabled: true,
      emergencyStop: false,
    })).not.toThrow();
  });

  test('fails closed during emergency stop', () => {
    let thrown: unknown;
    try {
      assertReferralDevGrantAcquisitionAllowed({ softEnabled: true, emergencyStop: true });
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(HttpsError);
    expect(thrown).toMatchObject({
      code: 'failed-precondition',
      message: 'REFERRAL_ROULETTE_EMERGENCY_STOP',
    });
  });

  test('fails closed under soft sunset even when the separate dev flag is enabled', () => {
    let thrown: unknown;
    try {
      assertReferralDevGrantAcquisitionAllowed({ softEnabled: false, emergencyStop: false });
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(HttpsError);
    expect(thrown).toMatchObject({
      code: 'failed-precondition',
      message: 'REFERRAL_ROULETTE_SOFT_SUNSET',
    });
  });

  test('expires existing rows and derives the post-grant aggregate from the ledger', () => {
    const result = reconcileDevGrantLedger([
      {
        id: 'expired', ownerStableId: 'owner', source: 'referral', status: 'available',
        earnedAtMs: 1, expiresAtMs: 49,
      },
      {
        id: 'boundary', ownerStableId: 'owner', source: 'dev_grant', status: 'available',
        earnedAtMs: 2, expiresAtMs: 50,
      },
      {
        id: 'used', ownerStableId: 'owner', source: 'referral', status: 'consumed',
        earnedAtMs: 3, expiresAtMs: 100,
      },
    ], 50);

    expect(result.expiredIds).toEqual(['expired']);
    expect(result.spinsTotalAfterGrant).toBe(2);
  });
});
