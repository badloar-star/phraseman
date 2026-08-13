import fs from 'node:fs';
import path from 'node:path';

const legacy = fs.readFileSync(path.resolve(__dirname, '..', 'admin', 'legacy.html'), 'utf8');

function block(startMarker: string, endMarker: string): string {
  const start = legacy.indexOf(startMarker);
  const end = legacy.indexOf(endMarker, start + startMarker.length);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return legacy.slice(start, end);
}

describe('Legacy admin protected referral revocation', () => {
  test('declares exactly one cached revocation callable', () => {
    expect(legacy.match(/httpsCallable\(functionsUs, 'adminRevokeReferralAttribution'\)/g) || []).toHaveLength(1);
  });

  test('asks for a reason and delegates without client-side balance mutations', () => {
    const handler = block(
      'window.revokeReferralAttribution = async function revokeReferralAttribution(refereeId)',
      '// ── MERGE TWO USER UIDS',
    );
    expect(handler).toContain('showInputModal({');
    expect(handler).toContain('reason: reason');
    expect(handler).toContain("createAdminCommandId('referral_revoke_request')");
    expect(handler).toContain("createAdminCommandId('referral_revoke_operation')");
    expect(handler).toContain('await getAdminRevokeReferralAttributionCallable()');
    expect(handler).toContain('if (!data || data.ok !== true)');
    expect(handler).toContain('data.rewardOutcome');
    expect(handler).not.toMatch(/\b(?:runTransaction|getDoc|logAction)\s*\(/);
    expect(handler).not.toMatch(/\b(?:REFEREE_BONUS|REFERRER_BONUS)\b/);
  });
});
