import { refreshPaywallAbConfigInBackground, resolvePaywallAbVariantSync, type PaywallAbVariant } from './paywall_variant';

type PaywallRoute = '/paywall_a' | '/paywall_b' | '/paywall_c';

type PaywallRouter = {
  push: (href: any) => void;
  replace: (href: any) => void;
};

type PaywallNavigationMode = 'push' | 'replace';

export type PaywallNavigationParams = Record<string, string | number | boolean | string[] | undefined | null>;

const PAYWALL_ROUTES: Record<PaywallAbVariant, PaywallRoute> = {
  A: '/paywall_a',
  B: '/paywall_b',
  C: '/paywall_c',
};

function normalizePaywallParams(params: PaywallNavigationParams = {}): Record<string, string | string[]> {
  const normalized: Record<string, string | string[]> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      normalized[key] = value.map(String);
    } else {
      normalized[key] = String(value);
    }
  }
  return normalized;
}

export function resolveCurrentPaywallRoute(): PaywallRoute {
  refreshPaywallAbConfigInBackground();
  const { variant } = resolvePaywallAbVariantSync();
  return PAYWALL_ROUTES[variant];
}

export function openPremiumPaywall(
  router: PaywallRouter,
  params: PaywallNavigationParams = {},
  mode: PaywallNavigationMode = 'push',
): void {
  const normalized = normalizePaywallParams(params);
  if (normalized.manage === '1') {
    router[mode]('/manage_subscription' as any);
    return;
  }
  router[mode]({
    pathname: resolveCurrentPaywallRoute(),
    params: normalized,
  } as any);
}
