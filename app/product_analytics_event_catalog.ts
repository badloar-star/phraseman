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
  | 'bounded_text'
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

export interface ProductAnalyticsGovernanceData {
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

export const PRODUCT_ANALYTICS_GOVERNANCE = governanceData as ProductAnalyticsGovernanceData;
const GOVERNANCE = PRODUCT_ANALYTICS_GOVERNANCE;

export const PRODUCT_ANALYTICS_GOVERNANCE_VERSION = governanceData.schemaVersion;
export const SOFT_UPSELL_CHAIN_EVENTS = Object.freeze(new Set(governanceData.softUpsellEvents));
export const SOFT_UPSELL_REQUIRED_CHAIN_FIELDS = Object.freeze([...governanceData.requiredChainFields]);

export function isGovernedSoftUpsellChainEvent(event: string): boolean {
  return SOFT_UPSELL_CHAIN_EVENTS.has(event);
}

export function governedSoftUpsellJoinKey(): readonly string[] {
  return governanceData.directAttribution.joinKey;
}

export function isValidGovernedSoftUpsellChainPayload(
  event: string,
  props: Record<string, unknown>,
): boolean {
  const hasChainField = governanceData.directAttribution.joinKey.some((field) => props[field] != null)
    || props.soft_upsell_trigger != null
    || props.soft_upsell_context != null;
  if (!hasChainField) return true;
  if (!isGovernedSoftUpsellChainEvent(event)) return false;
  if (!governanceData.requiredChainFields.every((field) => typeof props[field] === 'string' && props[field] !== '')) {
    return false;
  }
  const mode = props.soft_upsell_mode;
  const impressionId = props.soft_upsell_impression_id;
  const eventId = props.event_id;
  return governanceData.modes.includes(mode as 'production' | 'test')
    && typeof impressionId === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{7,79}$/.test(impressionId)
    && typeof eventId === 'string' && eventId.length <= 80;
}

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

export type GovernedProductAnalyticsEventName =
  (typeof PRODUCT_ANALYTICS_CANONICAL_EVENT_NAMES)[number];

export function validateProductAnalyticsGovernance(
  governance: ProductAnalyticsGovernanceData,
): string[] {
  const errors: string[] = [];
  const governedNames = new Set<string>();
  const canonicalNames = new Set<string>();
  const expectedCanonicalNames = new Set<string>(PRODUCT_ANALYTICS_CANONICAL_EVENT_NAMES);

  for (const [fieldSetName, fields] of Object.entries(governance.fieldSets)) {
    for (const field of fields) {
      if (!governance.fields[field]) errors.push(`unknown_field:${fieldSetName}:${field}`);
    }
  }

  for (const event of governance.events) {
    canonicalNames.add(event.name);
    for (const name of [event.name, ...(event.aliases ?? [])]) {
      if (governedNames.has(name)) errors.push(`duplicate_event_name:${name}`);
      governedNames.add(name);
    }
    if (!governance.fieldSets[event.fieldSet]) {
      errors.push(`unknown_field_set:${event.name}:${event.fieldSet}`);
    }
    if (!expectedCanonicalNames.has(event.name)) {
      errors.push(`dangling_governance_event:${event.name}`);
    }
  }

  for (const eventName of PRODUCT_ANALYTICS_CANONICAL_EVENT_NAMES) {
    if (!canonicalNames.has(eventName)) errors.push(`missing_governance_event:${eventName}`);
  }

  const metricIds = new Set<string>();
  for (const metric of governance.metrics) {
    if (metricIds.has(metric.id)) errors.push(`duplicate_metric_id:${metric.id}`);
    metricIds.add(metric.id);
    if (!/^[a-z][a-z0-9_.]+\.v[1-9][0-9]*$/.test(metric.id)) {
      errors.push(`invalid_metric_id:${metric.id}`);
    }
    for (const eventName of metric.events) {
      if (!canonicalNames.has(eventName)) {
        errors.push(`unknown_metric_event:${metric.id}:${eventName}`);
      }
    }
  }

  return errors;
}

const governanceErrors = validateProductAnalyticsGovernance(GOVERNANCE);
if (governanceErrors.length > 0) {
  throw new Error(`Invalid product analytics governance: ${governanceErrors.join(',')}`);
}

export const PRODUCT_ANALYTICS_FIELD_REGISTRY = Object.freeze(GOVERNANCE.fields);
export const PRODUCT_ANALYTICS_METRIC_REGISTRY = Object.freeze(GOVERNANCE.metrics);

function resolveGovernedFieldSet(fieldSet: string, eventName: string): readonly string[] {
  const fields = GOVERNANCE.fieldSets[fieldSet];
  if (!fields) throw new Error(`Unknown governed field set: ${eventName}:${fieldSet}`);
  return fields;
}

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
    allowedFields: Object.freeze([...resolveGovernedFieldSet(event.fieldSet, event.name)]),
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

export default function __RouteShim() { return null; }
