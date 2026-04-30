/**
 * Кэш цен магазина осколков: мгновенный UI при повторном открытии + прогрев в revenuecat_init.
 * Пакеты RevenueCat держим в памяти между экранами и дедупим getOfferings (старт приложения + магазин).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PurchasesOfferings, PurchasesPackage } from 'react-native-purchases';
import Purchases from 'react-native-purchases';
import { IS_EXPO_GO } from './config';
import { SHARDS_PACKS } from './shards_shop_catalog';

const CACHE_KEY = 'shards_shop_price_cache_v1';

/** Последний успешный снимок пакетов — подхватывается экраном магазина без повторного сетевого round-trip. */
let warmPackageMap: Record<string, PurchasesPackage> | null = null;

let loadPackagesInflight: Promise<Record<string, PurchasesPackage>> | null = null;

export function getWarmShardsPackagesMap(): Record<string, PurchasesPackage> | null {
  if (!warmPackageMap || Object.keys(warmPackageMap).length === 0) return null;
  return warmPackageMap;
}

export function isCompleteShardsPackageMap(map: Record<string, PurchasesPackage> | null | undefined): boolean {
  if (!map || Object.keys(map).length === 0) return false;
  return SHARDS_PACKS.every((p) => !!map[p.productId]);
}

export type ShardsPriceCache = Record<
  string,
  { priceString: string; price: number; currencyCode: string }
>;

/** In-memory зеркало AsyncStorage-кэша цен. Заполняется в `prefetchShardsShopOfferings` / `loadShardsPriceCache`. */
let warmPriceCache: ShardsPriceCache = {};

export function peekShardsPriceCacheSync(): ShardsPriceCache {
  return warmPriceCache;
}

export function buildShardsPackageMap(offerings: PurchasesOfferings): Record<string, PurchasesPackage> {
  const o = offerings as { all?: Record<string, { availablePackages?: PurchasesPackage[] }>; current?: { availablePackages?: PurchasesPackage[] } };
  const shardsOffering = o.all?.shards ?? null;
  const allPackages = [
    ...(shardsOffering?.availablePackages ?? []),
    ...(o.current?.availablePackages ?? []),
    ...Object.values(o.all ?? {}).flatMap((pkg) => pkg?.availablePackages ?? []),
  ];
  const map: Record<string, PurchasesPackage> = {};
  for (const p of allPackages) {
    const id = p.product.identifier;
    if (!map[id]) map[id] = p;
  }
  return map;
}

export async function loadShardsPriceCache(): Promise<ShardsPriceCache> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return warmPriceCache;
    const j = JSON.parse(raw) as { prices?: ShardsPriceCache };
    const prices = j?.prices && typeof j.prices === 'object' ? j.prices : {};
    warmPriceCache = prices;
    return prices;
  } catch {
    return warmPriceCache;
  }
}

export async function saveShardsPriceCacheFromPackages(map: Record<string, PurchasesPackage>): Promise<void> {
  try {
    const prices: ShardsPriceCache = {};
    for (const p of Object.values(map)) {
      const pr = p.product;
      const id = pr.identifier;
      prices[id] = {
        priceString: pr.priceString,
        price: pr.price,
        currencyCode: pr.currencyCode,
      };
    }
    warmPriceCache = prices;
    await AsyncStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ prices, updatedAt: Date.now() }),
    );
  } catch {}
}

/**
 * Один сетевой getOfferings на всех подписчиков: прогрев при старте и экран магазина не дублируют запрос.
 */
export async function loadShardsShopPackagesMap(): Promise<Record<string, PurchasesPackage>> {
  if (IS_EXPO_GO) return {};
  if (loadPackagesInflight) return loadPackagesInflight;

  const p = (async () => {
    try {
      const o = await Purchases.getOfferings();
      const map = buildShardsPackageMap(o);
      if (Object.keys(map).length > 0) {
        warmPackageMap = map;
        await saveShardsPriceCacheFromPackages(map);
      }
      return map;
    } catch {
      return warmPackageMap ?? {};
    }
  })();

  loadPackagesInflight = p;
  try {
    return await p;
  } finally {
    loadPackagesInflight = null;
  }
}

/** Вызов сразу после configure: AsyncStorage + warm map к моменту захода в магазин. */
export async function prefetchShardsShopOfferings(): Promise<void> {
  if (IS_EXPO_GO) return;
  // Параллельно: офферинги (RC) и читаем дисковый ценовой кэш в memory mirror.
  await Promise.all([
    loadShardsShopPackagesMap().catch(() => ({} as Record<string, PurchasesPackage>)),
    loadShardsPriceCache().catch(() => warmPriceCache),
  ]);
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
