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
    // зачем (11.10): события Арены ушли из каталога вместе с Ареной (D54/D74/D83, 1fa8ce3d4) — склад их больше не ждёт.
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
      'purchase_pending',
      'purchase_failed',
      'purchase_started',
      'trial_started',
    ].sort());
  });

  // зачем (координатор 00:02, 11.10): Learning V2 в релиз не идёт — его 4 события сняты со склада (telemetry_only),
  // серверный SQL склада и метрику сейчас не трогаем. ВЕРНУТЬ вместе с включением V2: warehouse "product" + события
  // в SQL functions/src/admin_product_analytics.ts + метрика (выкладка — владелец). События сами по себе остаются:
  // только координаты курса, коды и грубые бакеты (техдолг Phase 12, 2026-08-22).
  it('keeps the Learning V2 funnel out of the warehouse until V2 ships', () => {
    const v2 = PRODUCT_ANALYTICS_EVENT_CATALOG.filter(event => event.name.startsWith('learning_v2_'));
    expect(v2.map(event => event.name).sort()).toEqual([
      'learning_v2_session_abandon', 'learning_v2_session_complete', 'learning_v2_session_start', 'learning_v2_task_result',
    ]);
    expect(v2.every(event => event.warehouse === 'telemetry_only')).toBe(true);
  });

  it('uses centrally classified safe fields and includes terminal lesson duration', () => {
    const complete = PRODUCT_ANALYTICS_EVENT_CATALOG.find(event => event.name === 'lesson_complete');
    const abandoned = PRODUCT_ANALYTICS_EVENT_CATALOG.find(event => event.name === 'lesson_abandoned');

    expect(complete?.allowedFields).toContain('elapsed_ms');
    expect(abandoned?.allowedFields).toContain('elapsed_ms');
    expect(PRODUCT_ANALYTICS_FIELD_REGISTRY.error.valueClass).toBe('enum_code');
    expect(PRODUCT_ANALYTICS_FIELD_REGISTRY.error.description.toLowerCase()).toContain('normalized');
  });

  // зачем (11.10): Арена удалена (D54/D74/D83) — её воронки в каталоге быть не должно; сторож не даёт ей вернуться
  // в каталог молча (вместе с ней ушли поля соперника и рейтинга).
  it('keeps the retired Arena funnel out of the catalog', () => {
    expect(PRODUCT_ANALYTICS_EVENT_CATALOG.filter(event => event.name.startsWith('arena_'))).toEqual([]);
    expect(PRODUCT_ANALYTICS_WAREHOUSE_EVENTS.filter(name => name.startsWith('arena_'))).toEqual([]);
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
