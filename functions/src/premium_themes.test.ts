import { premiumThemeConditionSatisfied, __premiumThemesTestHooks } from './premium_themes';

const base = {
  premiumPurchased: false,
  progress: {} as Record<string, unknown>,
  stableUid: 'owner-1',
  spireTiers: {},
  videoSeconds: 0,
};

describe('premium theme server conditions', () => {
  it('grants only the exact six completed conditions', () => {
    // зачем (30.09 «ТЕМЫ ВСЕ ФРИ», координатор 24.10): покупка Plus тему не открывает
    expect(premiumThemeConditionSatisfied({ ...base, condition: 'plus_purchase', premiumPurchased: true })).toBe(false);
    expect(premiumThemeConditionSatisfied({ ...base, condition: 'final_coin_rank', progress: {
      'coin_rank_v1:owner-1': JSON.stringify({ ownerStableId: 'owner-1', rank: 19 }),
    } })).toBe(true);
    expect(premiumThemeConditionSatisfied({ ...base, condition: 'streak_365', progress: { streak_count: '365' } })).toBe(true);
    expect(premiumThemeConditionSatisfied({ ...base, condition: 'final_spire', spireTiers: { en: 11 } })).toBe(true);
    expect(premiumThemeConditionSatisfied({ ...base, condition: 'video_200_hours', videoSeconds: 720_000 })).toBe(true);
    expect(premiumThemeConditionSatisfied({ ...base, condition: 'learning_v2_complete', progress: { learning_v2_course_progress_sync_v1: '1792' } })).toBe(true);
  });

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

  it('prefetches at near-completion thresholds without granting early', () => {
    const facts = {
      ...base,
      progress: {
        'coin_rank_v1:owner-1': JSON.stringify({ ownerStableId: 'owner-1', rank: 18 }),
        streak_count: 350,
        learning_v2_course_progress_sync_v1: 1776,
      },
      spireTiers: { en: 10 },
      videoSeconds: 648_000,
    };
    expect(__premiumThemesTestHooks.nearUnlockConditions(facts)).toEqual([
      'final_coin_rank', 'streak_365', 'final_spire', 'video_200_hours', 'learning_v2_complete',
    ]);
    expect(premiumThemeConditionSatisfied({ ...facts, condition: 'final_coin_rank' })).toBe(false);
  });

  it('returns bounded authoritative counters for every locked theme condition', () => {
    const facts = {
      ...base,
      progress: {
        'coin_rank_v1:owner-1': JSON.stringify({ ownerStableId: 'owner-1', rank: 18 }),
        streak_count: 350,
        learning_v2_course_progress_sync_v1: 1776,
      },
      spireTiers: { en: 10 },
      videoSeconds: 648_999,
    };
    expect(__premiumThemesTestHooks.progressByCondition(facts)).toEqual({
      plus_purchase: { current: 0, target: 1, unit: 'purchase' },
      final_coin_rank: { current: 18, target: 19, unit: 'rank' },
      streak_365: { current: 350, target: 365, unit: 'days' },
      final_spire: { current: 10, target: 11, unit: 'tier' },
      video_200_hours: { current: 180, target: 200, unit: 'hours' },
      learning_v2_complete: { current: 1776, target: 1792, unit: 'sessions' },
    });
  });

  it('never exposes negative, fractional, or over-target progress', () => {
    const facts = {
      ...base,
      premiumPurchased: true,
      progress: {
        'coin_rank_v1:owner-1': JSON.stringify({ ownerStableId: 'owner-1', rank: 999 }),
        streak_count: -5,
        learning_v2_course_progress_sync_v1: 99999,
      },
      spireTiers: { en: 99 },
      videoSeconds: 999_999_999,
    };
    expect(__premiumThemesTestHooks.progressByCondition(facts)).toEqual({
      plus_purchase: { current: 0, target: 1, unit: 'purchase' },
      final_coin_rank: { current: 19, target: 19, unit: 'rank' },
      streak_365: { current: 0, target: 365, unit: 'days' },
      final_spire: { current: 11, target: 11, unit: 'tier' },
      video_200_hours: { current: 200, target: 200, unit: 'hours' },
      learning_v2_complete: { current: 1792, target: 1792, unit: 'sessions' },
    });
  });
});

