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
      'arena_action',
      'arena_feature_open',
      'arena_run_complete',
      'arena_store_action',
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

  it('governs Arena funnels without identity, content, exact rating, or wallet fields', () => {
    const arenaEvents = PRODUCT_ANALYTICS_EVENT_CATALOG.filter(event => event.name.startsWith('arena_'));
    expect(arenaEvents.map(event => event.name).sort()).toEqual([
      'arena_action', 'arena_feature_open', 'arena_run_complete', 'arena_store_action',
    ]);
    const fields = new Set(arenaEvents.flatMap(event => [...event.allowedFields]));
    expect([...fields]).toEqual(expect.arrayContaining([
      'feature', 'source', 'operation', 'mode', 'outcome', 'correct_count',
      'duration_bucket', 'item_id', 'slot', 'price_bucket',
    ]));
    expect([...fields].join('|')).not.toMatch(/uid|token|answer|opponent|wallet|rating|error|task/);
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
