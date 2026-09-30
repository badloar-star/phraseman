/**
 * Детект платформенной промо-цены (не бесплатный триал): несколько платных фаз у подписки
 * или платный introductory на iOS. Используется только для честной подписи на пейволле.
 */
import type { PurchasesPackage } from 'react-native-purchases';
import type { TrialEligibility } from './paywall_trial_info';

export type StorePromoPricing = {
  /** Округлённый процент выгоды относительно стандартной фазы */
  discountPercent: number;
  /** Обычная (повторяющаяся) цена после промо — для зачёркивания */
  standardPriceString: string;
  /** Цена при промо (первая платная фаза) */
  promoPriceString: string;
};

export type StorePromoPricingContext = {
  platform: string;
  iosEligibility?: TrialEligibility;
};

function isZeroMicros(micros: unknown): boolean {
  if (micros === 0) return true;
  if (typeof micros === 'string' && (micros === '0' || parseInt(micros, 10) === 0)) return true;
  return false;
}

function pricingPhaseIsFree(ph: { price?: { amountMicros?: number; priceAmountMicros?: number } } | null | undefined): boolean {
  if (!ph?.price) return false;
  const p = ph.price;
  if (isZeroMicros(p.amountMicros)) return true;
  if (p.amountMicros == null && isZeroMicros(p.priceAmountMicros)) return true;
  return false;
}

function phaseMicros(ph: any): number | null {
  const m = ph?.price?.amountMicros ?? ph?.price?.priceAmountMicros;
  if (m == null) return null;
  const n = typeof m === 'string' ? parseInt(m, 10) : Number(m);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function phaseFormatted(ph: any): string | null {
  const f = ph?.price?.formatted ?? ph?.price?.formattedPrice;
  if (typeof f === 'string' && f.trim().length > 0) return f;
  return null;
}

function paidPromoChainFromPhases(phases: any[]): { first: { micros: number; formatted: string | null }; last: { micros: number; formatted: string | null } } | null {
  const paid: { micros: number; formatted: string | null }[] = [];
  for (const ph of phases) {
    if (pricingPhaseIsFree(ph)) continue;
    const m = phaseMicros(ph);
    if (m == null) continue;
    paid.push({ micros: m, formatted: phaseFormatted(ph) });
  }
  if (paid.length < 2) return null;
  const first = paid[0];
  const last = paid[paid.length - 1];
  const tol = Math.max(5000, Math.floor(last.micros * 0.002)); // ~0.5% или 0.005 валюты
  if (first.micros >= last.micros - tol) return null;
  const pct = Math.round(100 - (first.micros / last.micros) * 100);
  if (pct < 5 || pct > 92) return null;
  return { first, last };
}

function promoFromAndroidDefaultOption(product: any): StorePromoPricing | null {
  // purchasePackage(productPackage) buys RevenueCat's defaultOption. Other
  // subscriptionOptions are merely catalog alternatives and must never drive
  // the price shown unless checkout explicitly purchases that exact option.
  const phases = product.defaultOption?.pricingPhases;
  const productPeriod = typeof product.subscriptionPeriod === 'string'
    ? product.subscriptionPeriod.trim().toUpperCase()
    : '';
  // The current UI can truthfully describe only one discounted billing cycle
  // followed immediately by the regular recurring phase at the same cadence.
  // Free trials, intermediate prices, multi-cycle intros, or missing timing
  // metadata need a richer disclosure UI; until then they fail closed.
  if (!Array.isArray(phases) || phases.length !== 2 || !productPeriod) return null;
  const [introPhase, regularPhase] = phases;
  const introPeriod = typeof introPhase?.billingPeriod?.iso8601 === 'string'
    ? introPhase.billingPeriod.iso8601.trim().toUpperCase()
    : '';
  const regularPeriod = typeof regularPhase?.billingPeriod?.iso8601 === 'string'
    ? regularPhase.billingPeriod.iso8601.trim().toUpperCase()
    : '';
  if (
    introPeriod !== productPeriod
    || regularPeriod !== productPeriod
    || introPhase?.billingCycleCount !== 1
    || introPhase?.recurrenceMode !== 2
    || regularPhase?.billingCycleCount !== null
    || regularPhase?.recurrenceMode !== 1
  ) return null;
  const chain = paidPromoChainFromPhases(phases);
  if (!chain) return null;
  const pct = Math.round(100 - (chain.first.micros / chain.last.micros) * 100);
  if (pct < 5 || pct > 92) return null;
  return {
    discountPercent: pct,
    standardPriceString: chain.last.formatted ?? String(product.priceString ?? ''),
    promoPriceString: chain.first.formatted ?? String(product.priceString ?? ''),
  };
}

function promoFromIosPaidIntro(product: any): StorePromoPricing | null {
  const ip = product.introPrice;
  if (ip == null) return null;
  const productPeriod = typeof product.subscriptionPeriod === 'string'
    ? product.subscriptionPeriod.trim().toUpperCase()
    : '';
  const introPeriod = typeof ip.period === 'string' ? ip.period.trim().toUpperCase() : '';
  // The shell labels the promo with the selected plan period and says the
  // standard price follows next. That is truthful only for one matching cycle.
  if (!productPeriod || introPeriod !== productPeriod || ip.cycles !== 1) return null;
  const regular = typeof product.price === 'number' ? product.price : NaN;
  let introNum = typeof ip.price === 'number' ? ip.price : NaN;
  if (!Number.isFinite(introNum) && typeof ip.priceString === 'string') {
    const normalized = ip.priceString.replace(/[^\d.,-]/g, '').replace(/,/g, '.');
    introNum = parseFloat(normalized);
  }
  if (!Number.isFinite(regular) || !Number.isFinite(introNum)) return null;
  if (introNum <= 0 || introNum >= regular - 1e-9) return null;
  const pct = Math.round(100 - (introNum / regular) * 100);
  if (pct < 5 || pct > 92) return null;
  return {
    discountPercent: pct,
    standardPriceString: typeof product.priceString === 'string' ? product.priceString : '',
    promoPriceString: typeof ip.priceString === 'string' ? ip.priceString : String(product.priceString ?? ''),
  };
}

/**
 * Returns a promo only when it is proven to match the existing checkout:
 * Android's purchasePackage default option, or an iOS introductory price for
 * which RevenueCat confirmed the current store account is eligible.
 */
export function getStorePromoPricing(
  product: PurchasesPackage['product'] | undefined,
  context: StorePromoPricingContext,
): StorePromoPricing | null {
  if (!product) return null;
  const p = product as any;
  if (context.platform === 'android') return promoFromAndroidDefaultOption(p);
  if (context.platform === 'ios' && context.iosEligibility === 'eligible') {
    return promoFromIosPaidIntro(p);
  }
  return null;
}

/* expo-router route shim */
export default function __RouteShim() {
  return null;
}
