import governance from './product_analytics_governance.json';

export const PRODUCT_ANALYTICS_GOVERNANCE_VERSION = governance.schemaVersion;
export const SOFT_UPSELL_CHAIN_EVENTS = Object.freeze(new Set(governance.softUpsellEvents));
export const SOFT_UPSELL_REQUIRED_CHAIN_FIELDS = Object.freeze([...governance.requiredChainFields]);

export function isGovernedSoftUpsellChainEvent(event: string): boolean {
  return SOFT_UPSELL_CHAIN_EVENTS.has(event);
}

export function governedSoftUpsellJoinKey(): readonly string[] {
  return governance.directAttribution.joinKey;
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
