import { __premiumStatusTestHooks } from './premium_status';

const { progressHasPaidAccess } = __premiumStatusTestHooks;

const NOW = 1_700_000_000_000; // фиксированное "сейчас" для детерминизма
const FUTURE = NOW + 30 * 24 * 60 * 60 * 1000;
const PAST = NOW - 24 * 60 * 60 * 1000;

describe('premium_status progressHasPaidAccess', () => {
  it('active store subscription (monthly, open-ended) => paid', () => {
    expect(progressHasPaidAccess({ premium_plan: 'monthly', premium_expiry: '0' }, NOW)).toBe(true);
  });

  it('active store subscription with future expiry => paid', () => {
    expect(progressHasPaidAccess({ premium_plan: 'yearly', premium_expiry: String(FUTURE) }, NOW)).toBe(true);
  });

  it('expired store subscription => NOT paid', () => {
    expect(progressHasPaidAccess({ premium_plan: 'monthly', premium_expiry: String(PAST) }, NOW)).toBe(false);
  });

  it('premium_active flag with future expiry => paid', () => {
    expect(progressHasPaidAccess({ premium_active: 'true', premium_expiry: String(FUTURE) }, NOW)).toBe(true);
  });

  it('active VIP grant => paid', () => {
    expect(progressHasPaidAccess({ vip_active: 'true', vip_until: String(FUTURE) }, NOW)).toBe(true);
  });

  it('revoked VIP => NOT paid', () => {
    expect(progressHasPaidAccess({ vip_active: 'false', vip_until: String(FUTURE) }, NOW)).toBe(false);
  });

  it('empty / free progress => NOT paid', () => {
    expect(progressHasPaidAccess({}, NOW)).toBe(false);
    expect(progressHasPaidAccess({ premium_plan: '', premium_active: 'false' }, NOW)).toBe(false);
  });

  it('a client-claimed isPremium field in progress is IGNORED (only real entitlements count)', () => {
    // Someone writing isPremium:true into progress must NOT grant access — the
    // gate looks only at premium_plan / premium_active / vip_* with expiry.
    expect(progressHasPaidAccess({ isPremium: true } as Record<string, unknown>, NOW)).toBe(false);
  });
});
