import { TODAY_RECOMMENDATION_RULES } from '../lib/today/recommendation_catalog';
import { TODAY_FALLBACK_RECOMMENDATION } from '../lib/today/fallback';
import { TODAY_DESTINATIONS } from '../lib/today/destinations';
import { INTERFACE_LANGS } from '../constants/i18n';

describe('Today recommendation catalog', () => {
  test('contains forty curated rules plus a separate fallback', () => {
    expect(TODAY_RECOMMENDATION_RULES).toHaveLength(40);
    expect(new Set(TODAY_RECOMMENDATION_RULES.map((rule) => rule.ruleId)).size).toBe(40);
    expect(TODAY_RECOMMENDATION_RULES.some((rule) => rule.ruleId === TODAY_FALLBACK_RECOMMENDATION.ruleId)).toBe(false);
    expect(TODAY_FALLBACK_RECOMMENDATION.ruleId).toBe('today.lessons.explore');
  });

  test('fully localizes at least two unique variants for every rule', () => {
    for (const rule of TODAY_RECOMMENDATION_RULES) {
      expect(rule.variants.length).toBeGreaterThanOrEqual(2);
      expect(new Set(rule.variants.map((variant) => variant.variantId)).size).toBe(rule.variants.length);
      for (const variant of rule.variants) {
        for (const locale of INTERFACE_LANGS) expect(variant.copy[locale].trim()).not.toBe('');
      }
    }
  });

  test('only uses approved learning destinations', () => {
    const approved = new Set(Object.keys(TODAY_DESTINATIONS));
    for (const rule of TODAY_RECOMMENDATION_RULES) expect(approved.has(rule.destinationId)).toBe(true);
    expect([...approved]).not.toEqual(expect.arrayContaining(['shop', 'social', 'premium']));
  });
});
