/**
 * Справочные цены Plus — последнее звено цепочки «живая из магазина → последняя настоящая (кэш) → справочная».
 *
 * зачем (владелец 11.10, капсом: «ЦЕНЫ ДОЛЖНЫ ПОКАЗЫВАТЬСЯ ВСЕ РАВНО!!! ВЕЗДЕ»): на устройстве без магазина (эмулятор без
 * Google Play, Huawei, урезанные прошивки) и при первом запуске без сети плитки показывали «Цены не загрузились». Теперь
 * цена видна всегда: справочная — с пометкой «≈» и честной подписью «цена уточнится в магазине» (рисует пейвол).
 * В покупку справочная цена никогда не уходит: платёж всегда идёт по живой цене магазина.
 *
 * Источник: текстовый рубильник `remote_config/app.texts.paywall_reference_prices` (JSON
 * {"yearly":"€39,99","monthly":"€7,99","yearlyPerMonth":"€3,33"}) — владелец меняет без релиза; при пустом или битом
 * значении — зашитая страховка (те же суммы, что в магазине на 11.10, евро).
 * Логи: [PAYWALL-PRICE].
 */
import { getRemoteText } from './remote_flags';

export type PaywallReferencePrices = Readonly<{
  yearly: string;
  monthly: string;
  yearlyPerMonth: string;
  source: 'remote' | 'builtin';
}>;

export const PAYWALL_REFERENCE_PRICES_TEXT_KEY = 'paywall_reference_prices' as const;

/** Зашитая страховка (евро, как в магазине на 11.10). */
export const PAYWALL_REFERENCE_PRICES_BUILTIN: PaywallReferencePrices = Object.freeze({
  yearly: '€39,99',
  monthly: '€7,99',
  yearlyPerMonth: '€3,33',
  source: 'builtin',
});

const MAX_PRICE_LENGTH = 24;

function cleanPrice(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  // Цена — короткая строка с цифрой; всё остальное (пусто, абзац текста) — мусор, берём страховку.
  if (!trimmed || trimmed.length > MAX_PRICE_LENGTH || !/\d/.test(trimmed)) return null;
  return trimmed;
}

let lastLoggedSource: string | null = null;

/** Справочные цены: рубильник → страховка. Никогда не бросает и никогда не возвращает пустую строку. */
export function parsePaywallReferencePrices(raw: string | null | undefined): PaywallReferencePrices {
  if (!raw || !raw.trim()) return PAYWALL_REFERENCE_PRICES_BUILTIN;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const yearly = cleanPrice(parsed?.yearly);
    const monthly = cleanPrice(parsed?.monthly);
    const yearlyPerMonth = cleanPrice(parsed?.yearlyPerMonth);
    if (!yearly || !monthly) {
      console.warn('[PAYWALL-PRICE] справочные цены из рубильника неполные → страховка', JSON.stringify({ hasYearly: Boolean(yearly), hasMonthly: Boolean(monthly) })); // guard-ok: ранний выход логируется
      return PAYWALL_REFERENCE_PRICES_BUILTIN;
    }
    return Object.freeze({
      yearly,
      monthly,
      yearlyPerMonth: yearlyPerMonth ?? PAYWALL_REFERENCE_PRICES_BUILTIN.yearlyPerMonth,
      source: 'remote',
    });
  } catch (error) {
    console.warn('[PAYWALL-PRICE] справочные цены из рубильника не разобрались → страховка', error instanceof Error ? error.message : String(error)); // guard-ok: ранний выход логируется
    return PAYWALL_REFERENCE_PRICES_BUILTIN;
  }
}

// зачем (координатор 13.10, EN-проход Авторизации ac166bf42): страховка хранится как в магазине у нас — «€39,99» с запятой.
// В английском интерфейсе десятичный разделитель — точка; остальные 8 языков интерфейса пишут запятую, их не трогаем.
export function localizeReferencePrice(price: string, lang?: string): string {
  if (lang !== 'en') return price;
  return price.replace(/(\d),(\d{2})(?!\d)/g, '$1.$2');
}

export function resolvePaywallReferencePrices(lang?: string): PaywallReferencePrices {
  let raw: string | null = null;
  try {
    raw = getRemoteText(PAYWALL_REFERENCE_PRICES_TEXT_KEY);
  } catch (error) {
    console.warn('[PAYWALL-PRICE] рубильник справочных цен не прочитался → страховка', error instanceof Error ? error.message : String(error)); // guard-ok: ранний выход логируется
  }
  const prices = parsePaywallReferencePrices(raw);
  if (prices.source !== lastLoggedSource) {
    lastLoggedSource = prices.source;
    console.log('[PAYWALL-PRICE] справочные цены', JSON.stringify(prices));
  }
  if (lang !== 'en') return prices;
  return Object.freeze({
    ...prices,
    yearly: localizeReferencePrice(prices.yearly, lang),
    monthly: localizeReferencePrice(prices.monthly, lang),
    yearlyPerMonth: localizeReferencePrice(prices.yearlyPerMonth, lang),
  });
}

export type PaywallPriceSource = 'store' | 'cache' | 'reference' | 'dev_preview' | 'none';

/** Откуда цена: живая главнее кэша, кэш главнее справочной. Чистая функция — для тестов и одного правила на все пейволы. */
export function pickPaywallPrice(input: Readonly<{
  store: string;
  cache?: string;
  reference?: string;
  devPreview?: string;
}>): Readonly<{ price: string; source: PaywallPriceSource }> {
  if (input.store) return { price: input.store, source: 'store' };
  if (input.cache) return { price: input.cache, source: 'cache' };
  if (input.reference) return { price: input.reference, source: 'reference' };
  if (input.devPreview) return { price: input.devPreview, source: 'dev_preview' };
  return { price: '', source: 'none' };
}

/* expo-router route shim: служебный модуль в app/ не должен становиться экраном. */
export default function __PaywallReferencePricesRouteShim() { return null; }
