import {
  getAdminPremiumProgressState,
  getVipProgressState,
  isPremiumAccessProgressActive,
  isPremiumProgressActive,
  isVipProgressActive,
} from '../app/premium_progress';

describe('premium progress helpers', () => {
  const now = 1_700_000_000_000;

  it('recognizes forever legacy admin grants as VIP, not real Premium', () => {
    const progress = {
      premium_plan: 'annual',
      admin_premium_override: 'true',
      premium_expiry: '0',
      premium_admin_grant_at: String(now - 1000),
    };

    expect(getAdminPremiumProgressState(progress, now)).toMatchObject({
      active: true,
      plan: 'annual',
      expiryMs: 0,
      grantAt: String(now - 1000),
    });
    expect(getVipProgressState(progress, now)).toMatchObject({
      active: true,
      source: 'legacy_admin_premium',
      legacy: true,
    });
    expect(isVipProgressActive(progress, now)).toBe(true);
    expect(isPremiumProgressActive(progress, now)).toBe(false);
    expect(isPremiumAccessProgressActive(progress, now)).toBe(true);
  });

  it('recognizes timed legacy admin_grant as VIP while it is not expired', () => {
    const progress = {
      premium_plan: 'admin_grant',
      admin_premium_override: 'true',
      premium_expiry: String(now + 86_400_000),
    };

    expect(getAdminPremiumProgressState(progress, now)).toMatchObject({
      active: true,
      plan: 'admin_grant',
      expiryMs: now + 86_400_000,
    });
    expect(isVipProgressActive(progress, now)).toBe(true);
    expect(isPremiumProgressActive(progress, now)).toBe(false);
  });

  it('expires timed admin grants', () => {
    const progress = {
      premium_plan: 'admin_grant',
      admin_premium_override: 'true',
      premium_expiry: String(now - 1),
    };

    expect(getAdminPremiumProgressState(progress, now)).toMatchObject({ active: false });
    expect(isVipProgressActive(progress, now)).toBe(false);
    expect(isPremiumProgressActive(progress, now)).toBe(false);
  });

  it('normalizes Firestore Timestamp expiry values for local storage', () => {
    const progress = {
      premium_plan: 'admin_grant',
      admin_premium_override: 'true',
      premium_expiry: { seconds: Math.floor((now + 60_000) / 1000) },
    };

    expect(getAdminPremiumProgressState(progress, now)).toMatchObject({
      active: true,
      expiryValue: String(now + 60_000),
    });
    expect(getVipProgressState(progress, now)).toMatchObject({
      active: true,
      untilValue: String(now + 60_000),
    });
  });

  it('recognizes native VIP fields from admin/index.html', () => {
    const progress = {
      vip_active: 'true',
      vip_plan: 'admin_vip',
      vip_from: String(now - 1000),
      vip_until: String(now + 60_000),
      vip_admin_override: 'true',
      vip_admin_grant_at: String(now - 1000),
    };

    expect(getVipProgressState(progress, now)).toMatchObject({
      active: true,
      source: 'vip',
      legacy: false,
      fromValue: String(now - 1000),
      untilValue: String(now + 60_000),
    });
    expect(isPremiumProgressActive(progress, now)).toBe(false);
    expect(isPremiumAccessProgressActive(progress, now)).toBe(true);
  });

  it('recognizes lifetime promo VIP as active Plus access', () => {
    const progress = {
      vip_active: 'true',
      vip_plan: 'promo_lifetime',
      vip_from: String(now - 1000),
      vip_until: '0',
      vip_admin_override: 'true',
      promo_vip_last_code: 'FOREVER',
    };

    expect(getVipProgressState(progress, now)).toMatchObject({
      active: true,
      plan: 'promo_lifetime',
      source: 'vip',
      untilValue: '0',
    });
    expect(isPremiumAccessProgressActive(progress, now)).toBe(true);
  });

  it('keeps real Premium active when VIP is granted on top', () => {
    const progress = {
      premium_plan: 'yearly',
      premium_expiry: String(now + 30_000),
      premium_rc_product_id: 'phraseman_premium_yearly_2399',
      vip_active: 'true',
      vip_plan: 'admin_vip',
      vip_from: String(now - 1000),
      vip_until: String(now + 60_000),
      vip_admin_override: 'true',
      vip_admin_grant_at: String(now - 1000),
    };

    expect(isPremiumProgressActive(progress, now)).toBe(true);
    expect(isVipProgressActive(progress, now)).toBe(true);
    expect(isPremiumAccessProgressActive(progress, now)).toBe(true);
  });

  it('does not treat admin revoke as a false override for active store plans', () => {
    const progress = {
      premium_plan: 'yearly',
      admin_premium_override: 'false',
      premium_expiry: '0',
      premium_rc_product_id: 'premium_yearly',
    };

    expect(getAdminPremiumProgressState(progress, now)).toBeNull();
    expect(isPremiumProgressActive(progress, now)).toBe(true);
  });

  it('treats explicit admin revoke without a store plan as non-premium', () => {
    const progress = {
      premium_plan: '',
      admin_premium_override: 'false',
      premium_expiry: '0',
    };

    expect(getAdminPremiumProgressState(progress, now)).toMatchObject({ active: false });
    expect(isPremiumProgressActive(progress, now)).toBe(false);
  });

  it('never treats admin_grant as real Premium after an explicit admin revoke', () => {
    const progress = {
      premium_plan: 'admin_grant',
      admin_premium_override: 'false',
      premium_active: 'true',
      premium_expiry: '0',
    };

    expect(isVipProgressActive(progress, now)).toBe(false);
    expect(isPremiumProgressActive(progress, now)).toBe(false);
    expect(isPremiumAccessProgressActive(progress, now)).toBe(false);
  });
});
