// ════════════════════════════════════════════════════════════════════════════
// paywall_price_cache.ts — кэш цен Plus-окна между запусками (D158, пакет A).
//
// зачем (D158): Plus-окно показывало вечный скелетон, пока offerings не пришли, а
// кнопка покупки была мёртвой. Цены, один раз полученные из магазина, живут здесь:
// первый кадр окна рисует их сразу (синхронный peek), а свежие цены из магазина
// подменяют кэш, как только придут. В кэше — ТОЛЬКО публичные строки цен и id
// пакетов (никаких персональных данных, промо и пробных периодов — они только из
// магазина, чтобы «написано = спишется» не нарушалось). Цену покупки всё равно
// показывает системный шит магазина.
// ════════════════════════════════════════════════════════════════════════════
import AsyncStorage from '@react-native-async-storage/async-storage';

import { DebugLogger } from './debug-logger';

export const PAYWALL_PRICE_CACHE_KEY = 'paywall_price_cache_v1';
/** Кэш старше этого не показываем: цены стора и валюта могли поменяться. */
export const PAYWALL_PRICE_CACHE_TTL_MS = 14 * 24 * 60 * 60 * 1000;
const MAX_PRICE_LEN = 40;

export type PaywallPriceCacheEntry = Readonly<{ productId: string; price: string; perMonth: string }>;
export type PaywallPriceCache = Readonly<{
  v: 1;
  savedAt: number;
  yearly?: PaywallPriceCacheEntry;
  monthly?: PaywallPriceCacheEntry;
}>;

let memory: PaywallPriceCache | null = null;
let hydrateInFlight: Promise<PaywallPriceCache | null> | null = null;

function cleanEntry(raw: unknown): PaywallPriceCacheEntry | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const e = raw as Record<string, unknown>;
  const productId = typeof e.productId === 'string' ? e.productId.trim() : '';
  const price = typeof e.price === 'string' ? e.price.trim() : '';
  const perMonth = typeof e.perMonth === 'string' ? e.perMonth.trim() : '';
  if (!productId || !price || price.length > MAX_PRICE_LEN || perMonth.length > MAX_PRICE_LEN) return undefined;
  return { productId, price, perMonth };
}

/** Проверка формата и возраста; мусор и протухшее → null (с причиной в лог). */
export function parsePaywallPriceCache(raw: string | null, now: number = Date.now()): PaywallPriceCache | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    DebugLogger.warn('[PAYWALL]', `кэш цен: битый JSON (${e instanceof Error ? e.message : String(e)})`);
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const o = parsed as Record<string, unknown>;
  const savedAt = typeof o.savedAt === 'number' ? o.savedAt : 0;
  if (o.v !== 1 || !savedAt || now - savedAt > PAYWALL_PRICE_CACHE_TTL_MS || savedAt - now > 24 * 60 * 60 * 1000) {
    DebugLogger.info('[PAYWALL]', `кэш цен: отброшен (v=${String(o.v)} возраст=${savedAt ? Math.round((now - savedAt) / 3_600_000) : '—'} ч)`);
    return null;
  }
  const yearly = cleanEntry(o.yearly);
  const monthly = cleanEntry(o.monthly);
  if (!yearly && !monthly) return null;
  return { v: 1, savedAt, ...(yearly ? { yearly } : {}), ...(monthly ? { monthly } : {}) };
}

/** Синхронный peek для первого кадра: только то, что уже прочитано в этом процессе. */
export function peekPaywallPriceCache(now: number = Date.now()): PaywallPriceCache | null {
  if (!memory) return null;
  if (now - memory.savedAt > PAYWALL_PRICE_CACHE_TTL_MS) return null;
  return memory;
}

/** Асинхронно читает диск в память (один раз за процесс при успехе). */
export function hydratePaywallPriceCache(): Promise<PaywallPriceCache | null> {
  if (memory) return Promise.resolve(peekPaywallPriceCache());
  if (hydrateInFlight) return hydrateInFlight;
  hydrateInFlight = (async () => {
    try {
      const raw = await AsyncStorage.getItem(PAYWALL_PRICE_CACHE_KEY);
      const parsed = parsePaywallPriceCache(raw);
      if (parsed && !memory) memory = parsed;
      DebugLogger.info('[PAYWALL]', `кэш цен: диск → ${parsed ? `год=${parsed.yearly?.price ?? '—'} месяц=${parsed.monthly?.price ?? '—'}` : 'пусто'}`);
      return parsed;
    } catch (e) {
      DebugLogger.error('[PAYWALL] кэш цен: чтение', e instanceof Error ? e : new Error(String(e)), 'warning');
      return null;
    } finally {
      hydrateInFlight = null;
    }
  })();
  return hydrateInFlight;
}

/** Сохраняет свежие цены из магазина (память сразу, диск фоном). Пустой набор не пишем. */
export async function savePaywallPriceCache(
  entries: { yearly?: PaywallPriceCacheEntry; monthly?: PaywallPriceCacheEntry },
  now: number = Date.now(),
): Promise<void> {
  const yearly = cleanEntry(entries.yearly);
  const monthly = cleanEntry(entries.monthly);
  if (!yearly && !monthly) {
    DebugLogger.info('[PAYWALL]', 'кэш цен: сохранять нечего (нет цен)');
    return;
  }
  const next: PaywallPriceCache = { v: 1, savedAt: now, ...(yearly ? { yearly } : {}), ...(monthly ? { monthly } : {}) };
  memory = next;
  try {
    await AsyncStorage.setItem(PAYWALL_PRICE_CACHE_KEY, JSON.stringify(next));
    DebugLogger.info('[PAYWALL]', `кэш цен: сохранён год=${yearly?.price ?? '—'} месяц=${monthly?.price ?? '—'}`);
  } catch (e) {
    DebugLogger.error('[PAYWALL] кэш цен: запись', e instanceof Error ? e : new Error(String(e)), 'warning');
  }
}

/** Только для тестов. */
export function __resetPaywallPriceCacheForTests(): void {
  memory = null;
  hydrateInFlight = null;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __PaywallPriceCacheRouteShim() { return null; }
