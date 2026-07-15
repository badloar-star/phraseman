import type { Lang } from '../../constants/i18n';
import { TODAY_FALLBACK_RECOMMENDATION } from './fallback';
import { TODAY_RECOMMENDATION_RULES, type RecommendationFacts, type TodayRecommendationRule } from './recommendation_catalog';
import type { TodayDestinationId, TodayRecommendation } from './types';

export type { RecommendationFacts } from './recommendation_catalog';

export type TodayRecommendationHistory = Readonly<Record<string, { lastShownAt: number | null; lastTappedAt?: number | null; variants: Readonly<Record<string, Partial<Record<Lang, number>>>> }>>;

function variantLastShown(ruleId: string, variantId: string, locale: Lang, history: TodayRecommendationHistory): number {
  return history[ruleId]?.variants[variantId]?.[locale] ?? Number.NEGATIVE_INFINITY;
}

export function selectTodayRecommendation(input: {
  facts: RecommendationFacts;
  locale: Lang;
  nowMs: number;
  primaryDestinationId: TodayDestinationId | null;
  history: TodayRecommendationHistory;
  rules?: readonly TodayRecommendationRule[];
}): TodayRecommendation {
  const rules = (input.rules ?? TODAY_RECOMMENDATION_RULES).filter((rule) => {
    if (!input.facts.availableDestinations.has(rule.destinationId)) return false;
    if (rule.destinationId === input.primaryDestinationId) return false;
    if (!rule.eligible(input.facts)) return false;
    const last = input.history[rule.ruleId]?.lastShownAt;
    return last == null || input.nowMs - last >= rule.cooldownMs;
  });
  rules.sort((a, b) => {
    if (a.priority !== b.priority) return b.priority - a.priority;
    const aLast = input.history[a.ruleId]?.lastShownAt ?? Number.NEGATIVE_INFINITY;
    const bLast = input.history[b.ruleId]?.lastShownAt ?? Number.NEGATIVE_INFINITY;
    return aLast - bLast || a.ruleId.localeCompare(b.ruleId);
  });
  const selected = rules[0];
  const fallback = TODAY_FALLBACK_RECOMMENDATION;
  const ruleId = selected?.ruleId ?? fallback.ruleId;
  const destinationId = selected?.destinationId ?? fallback.destinationId;
  const variants = selected?.variants ?? fallback.variants;
  const variant = [...variants].sort((a, b) => variantLastShown(ruleId, a.variantId, input.locale, input.history) - variantLastShown(ruleId, b.variantId, input.locale, input.history) || a.variantId.localeCompare(b.variantId))[0]!;
  const label = variant.copy[input.locale];
  return { ruleId, variantId: variant.variantId, destinationId, label, accessibilityLabel: label };
}
