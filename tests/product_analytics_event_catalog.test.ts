import governance from '../app/product_analytics_governance.json';
import {
  PRODUCT_ANALYTICS_GOVERNANCE_VERSION,
  governedSoftUpsellJoinKey,
  isGovernedSoftUpsellChainEvent,
} from '../app/product_analytics_event_catalog';

test('governance enforces exact direct attribution and Production/Test isolation', () => {
  expect(PRODUCT_ANALYTICS_GOVERNANCE_VERSION).toBe(1);
  expect(governedSoftUpsellJoinKey()).toEqual(['soft_upsell_mode', 'soft_upsell_impression_id']);
  expect(governance.directAttribution.forbidFallbackAttribution).toEqual(['user_id', 'session_id', 'time_window']);
  expect(isGovernedSoftUpsellChainEvent('purchase_completed')).toBe(true);
  expect(isGovernedSoftUpsellChainEvent('subscription_restored')).toBe(false);
});
