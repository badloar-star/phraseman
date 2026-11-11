// зачем: условие темы «Сингулярность» (прохождение удалённого курса занятий) снято. Сторож держит три вещи:
// остальные пять условий выдаются как прежде, снятое условие сервер больше не знает и не считает, а уже выданная
// тема не пропадает из premium_theme_entitlements_v1 при следующей перезаписи поля.
import {
  PREMIUM_THEME_BY_CONDITION,
  RETIRED_PREMIUM_THEME_IDS,
  __premiumThemesTestHooks,
  premiumThemeConditionSatisfied,
  type PremiumThemeCondition,
} from './premium_themes';

const STABLE = 'stable-user';
const facts = (over: Partial<{ premiumPurchased: boolean; progress: Record<string, unknown>; spireTiers: unknown; videoSeconds: number }> = {}) => ({
  premiumPurchased: false,
  progress: {},
  stableUid: STABLE,
  spireTiers: {},
  videoSeconds: 0,
  ...over,
});
const rank = (value: number) => ({ [`coin_rank_v1:${encodeURIComponent(STABLE)}`]: JSON.stringify({ ownerStableId: STABLE, rank: value }) });

describe('premium theme conditions after the session course removal', () => {
  it('keeps exactly five claimable conditions and no course condition', () => {
    expect(Object.keys(PREMIUM_THEME_BY_CONDITION).sort()).toEqual(
      ['final_coin_rank', 'final_spire', 'plus_purchase', 'streak_365', 'video_200_hours'],
    );
    expect(Object.values(PREMIUM_THEME_BY_CONDITION)).not.toContain('grad_full_ref_gravity_blue');
    expect(RETIRED_PREMIUM_THEME_IDS).toEqual(['grad_full_ref_gravity_blue']);
  });

  it('grants each remaining condition only when its own fact is complete', () => {
    const check = (condition: PremiumThemeCondition, over: Parameters<typeof facts>[0]) =>
      premiumThemeConditionSatisfied({ condition, ...facts(over) });
    expect(check('plus_purchase', { premiumPurchased: true })).toBe(true);
    expect(check('plus_purchase', {})).toBe(false);
    expect(check('final_coin_rank', { progress: rank(19) })).toBe(true);
    expect(check('final_coin_rank', { progress: rank(18) })).toBe(false);
    expect(check('streak_365', { progress: { streak_count: 365 } })).toBe(true);
    expect(check('streak_365', { progress: { streak_count: 364 } })).toBe(false);
    expect(check('final_spire', { spireTiers: { en: 11 } })).toBe(true);
    expect(check('final_spire', { spireTiers: { en: 10 } })).toBe(false);
    expect(check('video_200_hours', { videoSeconds: 200 * 60 * 60 })).toBe(true);
    expect(check('video_200_hours', { videoSeconds: 200 * 60 * 60 - 1 })).toBe(false);
  });

  it('ignores stored course progress: it neither grants nor reports the retired condition', () => {
    const progress = { learning_v2_course_progress_sync_v1: '1792' };
    expect(premiumThemeConditionSatisfied({ condition: 'learning_v2_complete' as PremiumThemeCondition, ...facts({ progress }) })).toBe(false);
    expect(__premiumThemesTestHooks.nearUnlockConditions(facts({ progress }))).toEqual([]);
    expect(Object.keys(__premiumThemesTestHooks.progressByCondition(facts({ progress }))).sort()).toEqual(
      ['final_coin_rank', 'final_spire', 'plus_purchase', 'streak_365', 'video_200_hours'],
    );
  });

  it('keeps an already granted retired theme in the stored entitlements and drops unknown ids', () => {
    expect(__premiumThemesTestHooks.cleanEntitlements({
      grad_full_ref_gravity_blue: 1700000000000,
      grad_full_olive: 1700000000001,
      grad_unknown_theme: 1700000000002,
      grad_full_horizon: -1,
    })).toEqual({ grad_full_ref_gravity_blue: 1700000000000, grad_full_olive: 1700000000001 });
  });

  it('reports bounded counters for the remaining conditions', () => {
    const progress = __premiumThemesTestHooks.progressByCondition(facts({
      progress: { streak_count: 999, ...rank(3) },
      videoSeconds: 10 * 60 * 60 + 5,
    }));
    expect(progress.streak_365).toEqual({ current: 365, target: 365, unit: 'days' });
    expect(progress.final_coin_rank).toEqual({ current: 3, target: 19, unit: 'rank' });
    expect(progress.video_200_hours).toEqual({ current: 10, target: 200, unit: 'hours' });
    expect(progress.plus_purchase).toEqual({ current: 0, target: 1, unit: 'purchase' });
  });
});
