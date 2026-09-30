import { InteractionManager } from 'react-native';

type PaywallRouter = {
  push: (href: any) => void;
  replace: (href: any) => void;
};

type PaywallNavigationMode = 'push' | 'replace';

export type PaywallNavigationParams = Record<string, string | number | boolean | string[] | undefined | null>;

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

export type ScheduledNavigation = {
  cancel: () => void;
};

/**
 * Откладывает навигацию до момента, когда корневой навигатор реально готов её принять.
 * Гейта по rootNavState.key НЕДОСТАТОЧНО: на холодном deep-link key появляется раньше,
 * чем Expo Router принимает replace/push — навигация в этот момент бросает
 * «Attempted to navigate before mounting the Root Layout» (крэш билда 1.5.50).
 * Поэтому: runAfterInteractions + макротик. Та же схема, что в premium_modal.
 */
export function scheduleAfterRootNavigationReady(navigate: () => void): ScheduledNavigation {
  let cancelled = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const task = InteractionManager.runAfterInteractions(() => {
    timer = setTimeout(() => {
      if (!cancelled) navigate();
    }, 0);
  });

  return {
    cancel: () => {
      cancelled = true;
      if (timer !== null) clearTimeout(timer);
      task.cancel?.();
    },
  };
}

export function openPremiumPaywall(
  router: PaywallRouter,
  params: PaywallNavigationParams = {},
  mode: PaywallNavigationMode = 'push',
): void {
  const normalized = normalizePaywallParams(params);
  if (normalized.manage === '1') {
    // зачем: раньше сюда доезжал голый '/manage_subscription' без параметров —
    // экран терял уже известный план (settings.tsx уже знает premiumPlan синхронно)
    // и был вынужден заново резолвить его из AsyncStorage/RevenueCat со спиннером.
    // Форвардим остальные параметры (напр. plan), чтобы modal открывался мгновенно.
    const { manage: _manage, ...rest } = normalized;
    const hasRest = Object.keys(rest).length > 0;
    router[mode](hasRest ? { pathname: '/manage_subscription', params: rest } as any : '/manage_subscription' as any);
    return;
  }
  router[mode]({
    // Acquisition always enters the entitlement-safe dispatcher: the single Plus
    // paywall renders only after live access has hydrated, otherwise a normal
    // opener can flash paid UI to an existing Plus user (A–G removed 2026-09-30).
    pathname: '/premium_modal',
    params: normalized,
  } as any);
}
