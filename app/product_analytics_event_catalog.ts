import governanceData from './product_analytics_governance.json';

export type ProductAnalyticsEntity =
  | 'app_instance'
  | 'session'
  | 'attempt'
  | 'impression'
  | 'event';

export type ProductAnalyticsWarehouse = 'product' | 'revenue' | 'telemetry_only';
export type ProductAnalyticsFieldValueClass =
  | 'boolean'
  | 'duration_ms'
  | 'enum_code'
  | 'integer'
  | 'opaque_id'
  | 'timestamp_ms'
  | 'version';

export interface ProductAnalyticsFieldDefinition {
  readonly valueClass: ProductAnalyticsFieldValueClass;
  readonly description: string;
}

export interface ProductAnalyticsEventDefinition {
  readonly name: string;
  readonly aliases?: readonly string[];
  readonly entity: ProductAnalyticsEntity;
  readonly warehouse: ProductAnalyticsWarehouse;
  readonly metricIds: readonly string[];
  readonly allowedFields: readonly string[];
}

export interface ProductAnalyticsMetricDefinition {
  readonly id: string;
  readonly events: readonly string[];
  readonly rowKinds: readonly string[];
}

interface ProductAnalyticsGovernanceData {
  readonly schemaVersion: number;
  readonly fields: Readonly<Record<string, ProductAnalyticsFieldDefinition>>;
  readonly fieldSets: Readonly<Record<string, readonly string[]>>;
  readonly events: readonly {
    readonly name: string;
    readonly aliases?: readonly string[];
    readonly entity: ProductAnalyticsEntity;
    readonly warehouse: ProductAnalyticsWarehouse;
    readonly fieldSet: string;
  }[];
  readonly metrics: readonly ProductAnalyticsMetricDefinition[];
}

const GOVERNANCE = governanceData as ProductAnalyticsGovernanceData;

export const PRODUCT_ANALYTICS_CANONICAL_EVENT_NAMES = [
  'product_session_start',
  'product_session_resume',
  'product_session_background',
  'product_screen_view',
  'product_screen_leave',
  'lesson_start',
  'lesson_complete',
  'lesson_abandoned',
  'lesson_answer',
  'onboarding_complete',
  'experiment_exposure',
  'product_operation_failure',
  'learning_review_session_start',
  'learning_review_answer',
  'learning_review_session_complete',
  'learning_review_session_abandoned',
  'paywall_view',
  'paywall_shown',
  'paywall_plan_select',
  'paywall_cta_click',
  'paywall_continue_free',
  'paywall_close',
  'premium_purchased',
  'purchase_started',
  'purchase_completed',
  'purchase_failed',
  'purchase_cancelled',
  'trial_started',
  'paywall_inventory_resolved',
  'paywall_exit_offer_shown',
  'paywall_exit_offer_accepted',
  'paywall_exit_offer_declined',
  'exit_trial_offer_shown',
  'exit_trial_offer_accepted',
  'exit_trial_offer_declined',
] as const;

export type GovernedProductAnalyticsEventName =
  (typeof PRODUCT_ANALYTICS_CANONICAL_EVENT_NAMES)[number];

export const PRODUCT_ANALYTICS_FIELD_REGISTRY = Object.freeze(GOVERNANCE.fields);
export const PRODUCT_ANALYTICS_METRIC_REGISTRY = Object.freeze(GOVERNANCE.metrics);

const metricIdsByEvent = new Map<string, string[]>();
for (const metric of PRODUCT_ANALYTICS_METRIC_REGISTRY) {
  for (const eventName of metric.events) {
    const current = metricIdsByEvent.get(eventName) ?? [];
    current.push(metric.id);
    metricIdsByEvent.set(eventName, current);
  }
}

export const PRODUCT_ANALYTICS_EVENT_CATALOG = Object.freeze(
  GOVERNANCE.events.map((event): ProductAnalyticsEventDefinition => ({
    name: event.name,
    ...(event.aliases ? { aliases: Object.freeze([...event.aliases]) } : {}),
    entity: event.entity,
    warehouse: event.warehouse,
    metricIds: Object.freeze([...(metricIdsByEvent.get(event.name) ?? [])]),
    allowedFields: Object.freeze([...(GOVERNANCE.fieldSets[event.fieldSet] ?? [])]),
  })),
);

export const PRODUCT_ANALYTICS_WAREHOUSE_EVENTS = Object.freeze(
  PRODUCT_ANALYTICS_EVENT_CATALOG
    .filter(event => event.warehouse === 'product')
    .map(event => event.name),
);

export function canonicalProductAnalyticsEventName(value: string): string {
  for (const event of PRODUCT_ANALYTICS_EVENT_CATALOG) {
    if (event.name === value || event.aliases?.some(alias => alias === value)) {
      return event.name;
    }
  }
  return value;
}

export function validateProductAnalyticsCatalog(
  catalog: readonly ProductAnalyticsEventDefinition[],
): string[] {
  const errors: string[] = [];
  const names = new Set<string>();

  for (const event of catalog) {
    for (const name of [event.name, ...(event.aliases ?? [])]) {
      if (names.has(name)) errors.push(`duplicate_event_name:${name}`);
      names.add(name);
    }
    for (const metricId of event.metricIds) {
      if (!/^[a-z][a-z0-9_.]+\.v[1-9][0-9]*$/.test(metricId)) {
        errors.push(`invalid_metric_id:${event.name}:${metricId}`);
      }
    }
    for (const field of event.allowedFields) {
      if (!PRODUCT_ANALYTICS_FIELD_REGISTRY[field]) {
        errors.push(`unknown_field:${event.name}:${field}`);
      }
    }
  }

  return errors;
}

export function isValidGovernedSoftUpsellChainPayload(
  event: string,
  props: Record<string, unknown>,
): boolean {
  const hasChainField = governance.directAttribution.joinKey.some((field) => props[field] != null)
    || props.soft_upsell_trigger != null
    || props.soft_upsell_context != null;
  if (!hasChainField) return true;
  if (!isGovernedSoftUpsellChainEvent(event)) return false;
  if (!governance.requiredChainFields.every((field) => typeof props[field] === 'string' && props[field] !== '')) {
    return false;
  }
  const mode = props.soft_upsell_mode;
  const impressionId = props.soft_upsell_impression_id;
  const eventId = props.event_id;
  return governance.modes.includes(mode as 'production' | 'test')
    && typeof impressionId === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{7,79}$/.test(impressionId)
    && typeof eventId === 'string' && eventId.length <= 80;
}

export default function __RouteShim() { return null; }
