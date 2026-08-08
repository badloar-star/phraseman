import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.join(__dirname, 'admin_referrals.ts'), 'utf8');
const indexSource = fs.readFileSync(path.join(__dirname, 'index.ts'), 'utf8');
const revokeModule = require('./admin_referrals') as {
  classifyReferralRevocationRecord?: (row: Record<string, unknown>) => Record<string, unknown>;
};

describe('admin referral revocation', () => {
  it('accepts only live revocable attribution states', () => {
    expect(typeof revokeModule.classifyReferralRevocationRecord).toBe('function');
    const classify = revokeModule.classifyReferralRevocationRecord!;
    for (const status of ['pending', 'qualified', 'rewarded', 'skipped_referrer_cap']) {
      expect(classify({ status })).toMatchObject({ allowed: true, previousStatus: status });
    }
    expect(classify({ status: 'revoked' })).toMatchObject({ allowed: false, error: 'REFERRAL_ALREADY_REVOKED' });
    expect(classify({ status: 'expired' })).toMatchObject({ allowed: false, error: 'REFERRAL_STATUS_NOT_REVOCABLE' });
  });

  it('uses only exact stored shard bonuses and never fallback amounts', () => {
    const classify = revokeModule.classifyReferralRevocationRecord!;
    expect(classify({
      status: 'rewarded', rewardKind: 'legacy_shards', refereeShardBonus: 0, referrerShardBonus: 7,
    })).toMatchObject({ rewardMode: 'legacy_shards', refereeShardBonus: 0, referrerShardBonus: 7 });
    expect(classify({
      status: 'rewarded', rewardKind: 'legacy_shards', refereeShardBonus: '15', referrerShardBonus: -20,
    })).toMatchObject({ rewardMode: 'legacy_shards', refereeShardBonus: 0, referrerShardBonus: 0 });
  });

  it('separates spin-credit and retained VIP outcomes from shard reversal', () => {
    const classify = revokeModule.classifyReferralRevocationRecord!;
    expect(classify({ status: 'rewarded', rewardKind: 'spin_credit', refereeShardBonus: 15 }))
      .toMatchObject({ rewardMode: 'spin_credit', refereeShardBonus: 0, referrerShardBonus: 0 });
    expect(classify({ status: 'rewarded', rewardKind: 'vip_days_both', refereeShardBonus: 15, referrerShardBonus: 20 }))
      .toMatchObject({ rewardMode: 'vip_retained', refereeShardBonus: 0, referrerShardBonus: 0 });
  });

  it('implements an AppCheck, permission, idempotency, transaction and audit boundary', () => {
    expect(source).toContain('export const adminRevokeReferralAttribution = onCall(ADMIN_SENSITIVE_WRITE_OPTIONS');
    expect(source).toContain('requireAdminAppCheck(request);');
    expect(source).toContain("roleFromAdminToken(request.auth?.token)");
    expect(source).toContain("hasPermission(role, 'users.write')");
    expect(source).toContain('referralCreditId(refereeStableId)');
    expect(source).toContain("collection(REFERRAL_SPIN_LEDGER)");
    expect(source).toContain("action: 'referral.revoke'");
    expect(source).toContain('previousStatus');
    expect(source).toContain('requestFingerprint');
    expect(source).not.toMatch(/\b(?:REFEREE_BONUS|REFERRER_BONUS)\b|\|\|\s*(?:15|20)\b/);
    expect(indexSource).toContain('adminRevokeReferralAttribution,');
  });
});
