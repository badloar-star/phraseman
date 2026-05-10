/**
 * Детект платформенной промо-цены (не бесплатный триал): несколько платных фаз у подписки
 * или платный introductory на iOS. Используется только для честной подписи на пейволле.
 */
import type { PurchasesPackage } from 'react-native-purchases';

export type StorePromoPricing = {
  /** Округлённый процент выгоды относительно стандартной фазы */
  discountPercent: number;
  /** Обычная (повторяющаяся) цена после промо — для зачёркивания */
  standardPriceString: string;
  /** Цена при промо (первая платная фаза) */
  promoPriceString: string;
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

function androidSubscriptionOptions(product: any): any[] {
  const out: any[] = [];
  const seen = new Set<string>();
  const push = (o: any) => {
    if (!o) return;
    const id = String(o.id ?? o.offerToken ?? '');
    if (id && seen.has(id)) return;
    if (id) seen.add(id);
    out.push(o);
  };
  push(product.defaultSubscriptionOption);
  push(product.defaultOption);
  if (Array.isArray(product.subscriptionOptions)) {
    for (const o of product.subscriptionOptions) push(o);
  }
  return out;
}

function promoFromSubscriptionPhases(product: any): StorePromoPricing | null {
  let best: StorePromoPricing | null = null;
  let bestGap = 0;
  for (const opt of androidSubscriptionOptions(product)) {
    const phases = opt.pricingPhases ?? opt.phases ?? [];
    const chain = paidPromoChainFromPhases(phases);
    if (!chain) continue;
    const gap = chain.last.micros - chain.first.micros;
    if (gap <= bestGap) continue;
    bestGap = gap;
    const pct = Math.round(100 - (chain.first.micros / chain.last.micros) * 100);
    if (pct < 5 || pct > 92) continue;
    best = {
      discountPercent: pct,
      standardPriceString: chain.last.formatted ?? String(product.priceString ?? ''),
      promoPriceString: chain.first.formatted ?? String(product.priceString ?? ''),
    };
  }
  return best;
}

function promoFromIosPaidIntro(product: any): StorePromoPricing | null {
  const ip = product.introPrice;
  if (ip == null) return null;
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
 * Если магазин отдал несколько платных фаз (промо → база) или платный introductory на iOS —
 * возвращаем процент и строки цен для UI.
 */
export function getStorePromoPricing(product: PurchasesPackage['product'] | undefined): StorePromoPricing | null {
  if (!product) return null;
  const p = product as any;
  const fromPhases = promoFromSubscriptionPhases(p);
  if (fromPhases) return fromPhases;
  const fromIos = promoFromIosPaidIntro(p);
  return fromIos;
}

/* expo-router route shim */
export default function __RouteShim() {
  return null;
}
