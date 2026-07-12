export interface PaywallAnalyticsImpression {
  readonly id: string;
  readonly startedAtMs: number;
}

export function createPaywallAnalyticsImpression(
  createId: () => string,
  now: () => number = Date.now,
): PaywallAnalyticsImpression {
  const id = String(createId()).trim();
  if (!id || id.length > 80) throw new Error('Invalid paywall_impression_id');
  return { id, startedAtMs: now() };
}

export function paywallImpressionParams(
  impression: PaywallAnalyticsImpression,
  now: () => number = Date.now,
): { paywall_impression_id: string; time_since_impression_ms: number } {
  return {
    paywall_impression_id: impression.id,
    time_since_impression_ms: Math.max(0, Math.round(now() - impression.startedAtMs)),
  };
}

export default function __RouteShim() { return null; }
