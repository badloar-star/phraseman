const MAX_PAYWALL_ANALYTICS_SOURCES = new Set([
  'paywall_a', 'paywall_b', 'paywall_c', 'paywall_d', 'paywall_e', 'paywall_f', 'paywall_g',
  'voice_max_required', 'dev_hub',
]);

/** MAX is a teacher brand; this helper only bounds analytics attribution. */
export function maxPaywallAnalyticsSource(rawSource: unknown): string {
  const source = Array.isArray(rawSource) ? String(rawSource[0] ?? '') : String(rawSource ?? '');
  return MAX_PAYWALL_ANALYTICS_SOURCES.has(source) ? source : 'direct';
}
