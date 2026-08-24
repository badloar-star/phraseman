import type { MaxSubscriptionResult } from './purchase';

export function isMaxPaywallPrimaryActionDisabled(input: Readonly<{
  loading: boolean;
  pendingHydrated: boolean;
  storeConfirmed: boolean;
  hasPackage: boolean;
  busy: boolean;
}>): boolean {
  if (input.busy || !input.pendingHydrated) return true;
  if (input.storeConfirmed) return false;
  return input.loading || !input.hasPackage;
}

export function isMaxPaywallRestoreDisabled(input: Readonly<{
  pendingHydrated: boolean;
  storeConfirmed: boolean;
  busy: boolean;
}>): boolean {
  return input.busy || !input.pendingHydrated || input.storeConfirmed;
}

export function shouldShowMaxPaywallPrimarySpinner(input: Readonly<{
  loading: boolean;
  pendingHydrated: boolean;
  storeConfirmed: boolean;
  busy: boolean;
}>): boolean {
  return input.busy || !input.pendingHydrated || (input.loading && !input.storeConfirmed);
}

const MAX_PAYWALL_ANALYTICS_SOURCES = new Set([
  'paywall_a', 'paywall_b', 'paywall_c', 'paywall_d', 'paywall_e', 'paywall_f', 'paywall_g',
  'voice_max_required', 'dev_hub',
]);

export function maxPaywallAnalyticsSource(rawSource: unknown): string {
  const source = Array.isArray(rawSource) ? String(rawSource[0] ?? '') : String(rawSource ?? '');
  return MAX_PAYWALL_ANALYTICS_SOURCES.has(source) ? source : 'direct';
}

export function finishMaxPaywallNavigation(
  rawSource: unknown,
  router: Readonly<{
    back: () => void;
    dismissTo?: (href: '/(tabs)') => void;
    replace: (href: '/(tabs)') => void;
  }>,
): void {
  const source = Array.isArray(rawSource) ? String(rawSource[0] ?? '') : String(rawSource ?? '');
  if (source.startsWith('paywall_')) {
    if (router.dismissTo) router.dismissTo('/(tabs)');
    else router.replace('/(tabs)');
    return;
  }
  router.back();
}

export async function runMaxPaywallPrimaryAction(
  storeConfirmed: boolean,
  dependencies: Readonly<{
    purchase: () => Promise<MaxSubscriptionResult>;
    confirm: () => Promise<boolean>;
  }>,
): Promise<Readonly<{
  storeConfirmed: boolean;
  active: boolean;
  purchaseResult?: MaxSubscriptionResult;
}>> {
  if (storeConfirmed) {
    return { storeConfirmed: true, active: await dependencies.confirm() };
  }
  const purchaseResult = await dependencies.purchase();
  const paidOrPending = purchaseResult.status === 'purchased'
    || purchaseResult.status === 'already_active'
    || purchaseResult.status === 'pending';
  if (!paidOrPending) return { storeConfirmed: false, active: false, purchaseResult };
  return {
    storeConfirmed: true,
    active: await dependencies.confirm(),
    purchaseResult,
  };
}
