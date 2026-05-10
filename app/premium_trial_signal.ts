/**
 * Чистый helper для определения «есть ли в магазине бесплатная intro-фаза» у продукта/пакета.
 * Используется одинаково:
 *   - внутри premium_modal.tsx (для рендера золотой ленты + копии «Бесплатно»),
 *   - в PremiumContext (для глобального флага trialEligible),
 *   - в PremiumGoldButton / settings (для CTA-копии «Попробуй Premium бесплатно»).
 *
 * Никаких побочных эффектов: только читает поля продукта от RevenueCat.
 *
 * Whether the *user* реально получит триал решает магазин (Apple/Google).
 * Локальный кулдаун (premium_trial_eligibility.ts) — отдельный сигнал, проверяется поверх.
 */
import type { PurchasesPackage } from 'react-native-purchases';

function isZeroPriceMicros(micros: unknown): boolean {
  if (micros === 0) return true;
  if (typeof micros === 'string' && (micros === '0' || parseInt(micros, 10) === 0)) return true;
  return false;
}

function pricingPhaseIsFree(
  phase: { price?: { amountMicros?: number; priceAmountMicros?: number } } | null | undefined,
): boolean {
  if (!phase?.price) return false;
  const p = phase.price;
  if (isZeroPriceMicros(p.amountMicros)) return true;
  if (p.amountMicros == null && isZeroPriceMicros(p.priceAmountMicros)) return true;
  return false;
}

function subscriptionOptionHasFreeTrial(o: {
  freePhase?: unknown;
  phases?: { price?: { amountMicros?: number } }[];
  pricingPhases?: { price?: { amountMicros?: number; priceAmountMicros?: number } }[];
}): boolean {
  if (o.freePhase != null) return true;
  if (o.phases?.some(ph => pricingPhaseIsFree(ph) || isZeroPriceMicros(ph?.price?.amountMicros))) return true;
  if (o.pricingPhases?.some(pricingPhaseIsFree)) return true;
  return false;
}

export function storeProductHasTrialIntro(product: PurchasesPackage['product'] | undefined): boolean {
  if (!product) return false;
  const p = product as any;

  // iOS: introductory offer / free trial в introPrice
  if (p.introPrice != null) {
    const ip = p.introPrice;
    if (ip.price === 0 || ip.price === 0.0) return true;
    if (typeof ip.price === 'number' && Math.abs(ip.price) < 1e-9) return true;
    if (typeof ip.priceString === 'string') {
      const normalized = ip.priceString.replace(/[^\d.,-]/g, '').replace(/,/g, '.');
      const n = parseFloat(normalized);
      if (!Number.isNaN(n) && n === 0) return true;
    }
  }

  // Android Billing v6+ / iOS subscriptionOptions
  for (const key of ['defaultOption', 'defaultSubscriptionOption'] as const) {
    const opt = p[key];
    if (opt && subscriptionOptionHasFreeTrial(opt)) return true;
  }

  const opts = p.subscriptionOptions;
  if (Array.isArray(opts) && opts.some((o: any) => subscriptionOptionHasFreeTrial(o))) {
    return true;
  }

  return false;
}

/** Удобный помощник: хотя бы один из пакетов (monthly/yearly) предлагает intro phase. */
export function anyPackageHasTrialIntro(packages: {
  yearly?: PurchasesPackage | null;
  monthly?: PurchasesPackage | null;
}): boolean {
  return (
    storeProductHasTrialIntro(packages.yearly?.product) ||
    storeProductHasTrialIntro(packages.monthly?.product)
  );
}
