import { HttpsError } from 'firebase-functions/v2/https';
import { adminAccessFingerprint, buildAdminAccessPatch, normalizeAdminAccessInput, normalizeAdminBanInput } from './admin_access_controls';

const base = { uid: 'stable-user_1', durationDays: 30, reason: 'support compensation', requestId: 'request-1', idempotencyKey: 'op-1' };

describe('admin access controls', () => {
  it('bounds and fingerprints premium/VIP access grants', () => {
    const input = normalizeAdminAccessInput({ ...base, kind: 'premium' });
    expect(input.kind).toBe('premium');
    expect(adminAccessFingerprint(input)).toContain('stable-user_1');
    expect(buildAdminAccessPatch({ progress: {} }, input, 1_000).updates).toMatchObject({ 'progress.premium_plan': 'admin_grant', 'progress.admin_premium_override': 'true' });
    expect(buildAdminAccessPatch({ progress: {} }, { ...input, kind: 'vip', durationDays: 0 }, 1_000).after).toMatchObject({ vip_plan: 'admin_grant', vip_until: '0' });
  });

  it('rejects unsafe access commands and ban commands', () => {
    expect(() => normalizeAdminAccessInput({ ...base, kind: 'store', durationDays: 3651 })).toThrow(HttpsError);
    expect(() => normalizeAdminBanInput({ uid: '../users', banned: true, reason: 'x', requestId: 'r', idempotencyKey: 'k' })).toThrow(HttpsError);
    expect(normalizeAdminBanInput({ uid: 'stable-user_1', banned: true, reason: 'abuse report', requestId: 'r-1', idempotencyKey: 'k-1' }).banned).toBe(true);
  });
});
