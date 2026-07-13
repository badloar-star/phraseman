import {
  PRODUCT_ANALYTICS_FIELD_REGISTRY,
  PRODUCT_ANALYTICS_EVENT_CATALOG,
  PRODUCT_ANALYTICS_GOVERNANCE,
  PRODUCT_ANALYTICS_METRIC_REGISTRY,
  PRODUCT_ANALYTICS_WAREHOUSE_EVENTS,
  canonicalProductAnalyticsEventName,
  isValidGovernedSoftUpsellChainPayload,
  validateProductAnalyticsCatalog,
  validateProductAnalyticsGovernance,
} from '../app/product_analytics_event_catalog';
import type { AnalyticsEvent } from '../app/analytics';

const youtubeEvents = [
  'youtube_home_entry_click',
  'youtube_catalog_open',
  'youtube_video_select',
  'youtube_player_ready',
  'youtube_playback_start',
  'youtube_playback_checkpoint',
  'youtube_playback_end',
  'youtube_external_video_open',
  'youtube_channel_open',
] as const;
describe('product analytics event catalog', () => {
  it('normalizes the legacy lesson abandon spelling to the warehouse name', () => {
    expect(canonicalProductAnalyticsEventName('lesson_abandon')).toBe('lesson_abandoned');
    expect(canonicalProductAnalyticsEventName('lesson_abandoned')).toBe('lesson_abandoned');
  });

  it('has unique names, aliases and metric ids with no free-form fields', () => {
    expect(validateProductAnalyticsCatalog(PRODUCT_ANALYTICS_EVENT_CATALOG)).toEqual([]);
    expect(validateProductAnalyticsGovernance(PRODUCT_ANALYTICS_GOVERNANCE)).toEqual([]);
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
      ...youtubeEvents,
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

  it('governs all YouTube events with exact fields and unique metric ids', () => {
    const definitions = youtubeEvents.map(name => (
      PRODUCT_ANALYTICS_EVENT_CATALOG.find(event => event.name === name)
    ));
    const metricIds = definitions.flatMap(definition => definition?.metricIds ?? []);

    expect(definitions.every(Boolean)).toBe(true);
    expect(definitions.every(definition => definition?.warehouse === 'product')).toBe(true);
    expect(definitions.slice(0, 4).every(definition => definition?.entity === 'event')).toBe(true);
    expect(definitions.slice(4, 7).every(definition => definition?.entity === 'attempt')).toBe(true);
    expect(definitions.slice(7).every(definition => definition?.entity === 'event')).toBe(true);
    expect(metricIds).toEqual(youtubeEvents.map(name => (
      `${name.replace(/^youtube_/, 'youtube.').replaceAll('_', '.')}.v1`
    )));
    expect(new Set(metricIds).size).toBe(youtubeEvents.length);

    const commonFields = [
      'schema_version', 'event_id', 'session_id', 'channel_id', 'source',
      'platform', 'app_version', 'build_number', 'occurred_at_ms',
    ];
    const expectedFields = [
      commonFields,
      commonFields,
      [...commonFields, 'video_id', 'video_title'],
      [...commonFields, 'video_id'],
      [...commonFields, 'video_id', 'playback_id'],
      [...commonFields, 'video_id', 'playback_id', 'active_watch_ms', 'position_ms', 'duration_ms', 'max_position_permille'],
      [...commonFields, 'video_id', 'playback_id', 'active_watch_ms', 'position_ms', 'duration_ms', 'max_position_permille', 'end_reason'],
      [...commonFields, 'video_id'],
      [...commonFields, 'video_id'],
    ];
    definitions.forEach((definition, index) => {
      expect([...(definition?.allowedFields ?? [])].sort()).toEqual([...expectedFields[index]].sort());
      expect(definition?.allowedFields).not.toContain('product_session_id');
    });
    expect(PRODUCT_ANALYTICS_FIELD_REGISTRY.video_title.valueClass).toBe('bounded_text');
    expect(PRODUCT_ANALYTICS_METRIC_REGISTRY.filter(metric => metric.id.startsWith('youtube.')))
      .toHaveLength(youtubeEvents.length);
  });

  const mutableGovernance = () => JSON.parse(JSON.stringify(PRODUCT_ANALYTICS_GOVERNANCE));

  it('rejects an event that references a missing field set', () => {
    const governance = mutableGovernance();
    governance.events[0].fieldSet = 'missing_set';
    expect(validateProductAnalyticsGovernance(governance)).toContain(
      'unknown_field_set:product_session_start:missing_set',
    );
  });

  it('rejects duplicate canonical names and aliases', () => {
    const duplicateName = mutableGovernance();
    duplicateName.events[1].name = duplicateName.events[0].name;
    expect(validateProductAnalyticsGovernance(duplicateName)).toContain(
      'duplicate_event_name:product_session_start',
    );

    const duplicateAlias = mutableGovernance();
    duplicateAlias.events[0].aliases = ['shared_alias'];
    duplicateAlias.events[1].aliases = ['shared_alias'];
    expect(validateProductAnalyticsGovernance(duplicateAlias)).toContain(
      'duplicate_event_name:shared_alias',
    );
  });

  it('rejects duplicate metric IDs', () => {
    const governance = mutableGovernance();
    governance.metrics[1].id = governance.metrics[0].id;
    expect(validateProductAnalyticsGovernance(governance)).toContain(
      `duplicate_metric_id:${governance.metrics[0].id}`,
    );
  });

  it('rejects unknown fields inside field sets', () => {
    const governance = mutableGovernance();
    governance.fieldSets.youtube_common.push('raw_path');
    expect(validateProductAnalyticsGovernance(governance)).toContain(
      'unknown_field:youtube_common:raw_path',
    );
  });

  it('rejects metrics that reference unknown events', () => {
    const governance = mutableGovernance();
    governance.metrics[0].events.push('unknown_event');
    expect(validateProductAnalyticsGovernance(governance)).toContain(
      'unknown_metric_event:sessions.lifecycle.v1:unknown_event',
    );
  });

  it('rejects governance events that disagree with the canonical event list', () => {
    const governance = mutableGovernance();
    governance.events.pop();
    governance.events.push({
      name: 'dangling_event',
      entity: 'event',
      warehouse: 'product',
      fieldSet: 'youtube_common',
    });
    const errors = validateProductAnalyticsGovernance(governance);
    expect(errors).toContain('missing_governance_event:youtube_channel_open');
    expect(errors).toContain('dangling_governance_event:dangling_event');
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
