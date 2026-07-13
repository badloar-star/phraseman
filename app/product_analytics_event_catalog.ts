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

export default function __RouteShim() { return null; }
