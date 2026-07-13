import {
  PRODUCT_ANALYTICS_FIELD_REGISTRY,
  PRODUCT_ANALYTICS_EVENT_CATALOG,
  PRODUCT_ANALYTICS_WAREHOUSE_EVENTS,
  canonicalProductAnalyticsEventName,
  validateProductAnalyticsCatalog,
} from '../app/product_analytics_event_catalog';
import type { AnalyticsEvent } from '../app/analytics';

describe('product analytics event catalog', () => {
  it('normalizes the legacy lesson abandon spelling to the warehouse name', () => {
    expect(canonicalProductAnalyticsEventName('lesson_abandon')).toBe('lesson_abandoned');
    expect(canonicalProductAnalyticsEventName('lesson_abandoned')).toBe('lesson_abandoned');
  });

  it('has unique names, aliases and metric ids with no free-form fields', () => {
    expect(validateProductAnalyticsCatalog(PRODUCT_ANALYTICS_EVENT_CATALOG)).toEqual([]);
  });

  it('declares the product events consumed by the current warehouse query', () => {
    expect([...PRODUCT_ANALYTICS_WAREHOUSE_EVENTS].sort()).toEqual([
      'exit_trial_offer_accepted',
      'exit_trial_offer_declined',
      'exit_trial_offer_shown',
      'experiment_exposure',
      'product_operation_failure',
      'lesson_abandoned',
      'lesson_answer',
      'onboarding_complete',
      'lesson_complete',
      'lesson_start',
      'learning_review_answer',
      'learning_review_session_abandoned',
      'learning_review_session_complete',
      'learning_review_session_start',
      'paywall_close',
      'paywall_continue_free',
      'paywall_cta_click',
      'paywall_exit_offer_accepted',
      'paywall_exit_offer_declined',
      'paywall_exit_offer_shown',
      'paywall_inventory_resolved',
      'paywall_plan_select',
      'paywall_shown',
      'paywall_view',
      'premium_purchased',
      'product_screen_leave',
      'product_screen_view',
      'product_session_background',
      'product_session_resume',
      'product_session_start',
      'purchase_cancelled',
      'purchase_completed',
      'purchase_failed',
      'purchase_started',
      'trial_started',
    ].sort());
  });

  it('uses centrally classified safe fields and includes terminal lesson duration', () => {
    const complete = PRODUCT_ANALYTICS_EVENT_CATALOG.find(event => event.name === 'lesson_complete');
    const abandoned = PRODUCT_ANALYTICS_EVENT_CATALOG.find(event => event.name === 'lesson_abandoned');

    expect(complete?.allowedFields).toContain('elapsed_ms');
    expect(abandoned?.allowedFields).toContain('elapsed_ms');
    expect(PRODUCT_ANALYTICS_FIELD_REGISTRY.error.valueClass).toBe('enum_code');
    expect(PRODUCT_ANALYTICS_FIELD_REGISTRY.error.description.toLowerCase()).toContain('normalized');
  });

  it('rejects fields outside the centrally reviewed registry', () => {
    expect(validateProductAnalyticsCatalog([{
      name: 'unsafe_event',
      entity: 'event',
      warehouse: 'telemetry_only',
      metricIds: [],
      allowedFields: ['user_name', 'raw_answer', 'prompt_text', 'stack'],
    }])).toEqual([
      'unknown_field:unsafe_event:user_name',
      'unknown_field:unsafe_event:raw_answer',
      'unknown_field:unsafe_event:prompt_text',
      'unknown_field:unsafe_event:stack',
    ]);
  });

  it('exposes the canonical warehouse spelling through the public analytics type', () => {
    const event: AnalyticsEvent = 'lesson_abandoned';
    expect(event).toBe('lesson_abandoned');
  });
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
