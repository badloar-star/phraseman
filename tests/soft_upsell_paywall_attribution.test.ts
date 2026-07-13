import {
  createSoftUpsellAttribution,
  parseSoftUpsellAttribution,
  softUpsellAnalyticsParams,
  softUpsellRouteParams,
} from '../app/soft_upsell_attribution';
import { normalizePremiumContext } from '../app/paywall_copy';

const attribution = createSoftUpsellAttribution({
  impressionId: 'soft_chain_12345678',
  trigger: 'weekly_review',
  context: 'weekly_review',
  mode: 'production',
});

test('one immutable direct-chain identity survives route and event serialization', () => {
  const route = softUpsellRouteParams(attribution);
  expect(parseSoftUpsellAttribution(route)).toEqual(attribution);
  expect(softUpsellAnalyticsParams(attribution, 'paywall_shown')).toEqual({
    ...route,
    event_id: 'soft_chain_12345678:paywall_shown',
  });
});

test('partial or conflicting chains are dropped atomically', () => {
  expect(parseSoftUpsellAttribution({ soft_upsell_impression_id: attribution.impressionId })).toBeNull();
  expect(parseSoftUpsellAttribution({
    ...softUpsellRouteParams(attribution),
    soft_upsell_context: 'streak_milestone',
  })).toBeNull();
  expect(softUpsellAnalyticsParams(null, 'paywall_shown')).toEqual({});
});

test.each([
  'first_lesson_success',
  'free_lessons_complete',
  'weekly_review',
  'dialog_repeat_success',
  'streak_milestone',
  'trainer_repeat_success',
] as const)('keeps soft context %s first-class on the paywall', (context) => {
  expect(normalizePremiumContext(context)).toBe(context);
});
