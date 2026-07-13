import governance from '../app/product_analytics_governance.json';
import {
  PRODUCT_ANALYTICS_GOVERNANCE_VERSION,
  governedSoftUpsellJoinKey,
  isGovernedSoftUpsellChainEvent,
  isValidGovernedSoftUpsellChainPayload,
} from '../app/product_analytics_event_catalog';

test('governance enforces exact direct attribution and Production/Test isolation', () => {
  expect(PRODUCT_ANALYTICS_GOVERNANCE_VERSION).toBe(1);
  expect(governedSoftUpsellJoinKey()).toEqual(['soft_upsell_mode', 'soft_upsell_impression_id']);
  expect(governance.directAttribution.forbidFallbackAttribution).toEqual(['user_id', 'session_id', 'time_window']);
  expect(isGovernedSoftUpsellChainEvent('purchase_completed')).toBe(true);
  expect(isGovernedSoftUpsellChainEvent('paywall_continue_free')).toBe(true);
  expect(isGovernedSoftUpsellChainEvent('subscription_restored')).toBe(false);
});

test('runtime governance rejects partial or non-catalogued exact-chain payloads', () => {
  const exact = {
    soft_upsell_mode: 'production',
    soft_upsell_impression_id: 'chain_12345678',
    soft_upsell_trigger: 'weekly_review',
    soft_upsell_context: 'weekly_review',
    event_id: 'chain_12345678:paywall_shown',
  };
  expect(isValidGovernedSoftUpsellChainPayload('paywall_shown', exact)).toBe(true);
  expect(isValidGovernedSoftUpsellChainPayload('paywall_shown', { ...exact, event_id: undefined })).toBe(false);
  expect(isValidGovernedSoftUpsellChainPayload('subscription_restored', exact)).toBe(false);
});
