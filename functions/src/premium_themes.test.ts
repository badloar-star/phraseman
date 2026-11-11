import { premiumThemeConditionSatisfied, __premiumThemesTestHooks } from './premium_themes';

const base = {
  premiumPurchased: false,
  progress: {} as Record<string, unknown>,
  stableUid: 'owner-1',
  spireTiers: {},
  videoSeconds: 0,
};

describe('premium theme server conditions', () => {

  it('does not trust a coin rank row owned by another account', () => {
    expect(premiumThemeConditionSatisfied({ ...base, condition: 'final_coin_rank', progress: {
      'coin_rank_v1:owner-1': JSON.stringify({ ownerStableId: 'attacker', rank: 19 }),
    } })).toBe(false);
  });

  it('drops unknown and malformed cached entitlement rows', () => {
    expect(__premiumThemesTestHooks.cleanEntitlements({
      grad_full_olive: 10,
      evil_theme: 20,
      grad_full_horizon: 'tomorrow',
    })).toEqual({ grad_full_olive: 10 });
  });

  it('recognises a verified purchase without treating temporary access as purchase', () => {
    expect(__premiumThemesTestHooks.hasVerifiedPlusPurchase({ had_premium_ever: '1' })).toBe(true);
    expect(__premiumThemesTestHooks.hasVerifiedPlusPurchase({ premium_rc_product_id: 'plus.monthly', premium_rc_purchased_at_ms: '1234' })).toBe(true);
    expect(__premiumThemesTestHooks.hasVerifiedPlusPurchase({ intro_access_until_ms: '9999999999999', vip_plan: 'gift' })).toBe(false);
  });
});

