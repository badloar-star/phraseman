/**
 * packages_cache.ts — кэш пакетов минут RevenueCat для мгновенного шита покупки.
 *
 * зачем (владелец 2026-08-30: «модал купить минуты грузится долго»): панель на
 * каждое открытие с нуля ждала сеть — init RevenueCat + getOfferings (магазин).
 * Пакеты меняются редко: держим их в памяти с TTL и прогреваем ЗАРАНЕЕ (пре-экран
 * MAX и пейвол зовут prime при монтировании), а последний известный ценник
 * дополнительно живёт на диске — даже холодный старт показывает цены первым
 * кадром (кнопка активируется, когда доедет живой пакет: покупка требует
 * живой PurchasesPackage, из диска его не восстановить).
 *
 * Кэш — только про скорость первого кадра; правда всегда за живым getOfferings.
 * Логи [MINUTE-PACKS] — постоянные (правило «сперва логи»): вход, источник
 * (кэш/дедуп/сеть), длительность, количество, каждый отказ с причиной.
 */
import { DebugLogger } from '../../app/debug-logger';
import { VOICE_MINUTE_PRODUCTS, type VoiceMinutePack } from './catalog';
import { loadVoiceMinutePackages } from './purchase';

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const PRICE_STORAGE_KEY = '@phraseman/voice-minutes/prices/v1';

let cache: { packs: VoiceMinutePack[]; atMs: number } | null = null;
let inFlight: Promise<VoiceMinutePack[]> | null = null;
let diskPrices: Record<string, string> | null = null;

/** Живые пакеты из свежего кэша или null (кэша нет/протух). */
export function peekVoiceMinutePackages(nowMs = Date.now()): VoiceMinutePack[] | null {
  if (!cache || nowMs - cache.atMs > CACHE_TTL_MS) return null;
  return cache.packs;
}

/** Последний известный ценник productId→priceString (память → диск), для первого кадра. */
export function peekVoiceMinutePriceStrings(): Record<string, string> | null {
  if (cache) {
    const out: Record<string, string> = {};
    for (const pack of cache.packs) out[pack.productId] = pack.priceString;
    return out;
  }
  return diskPrices;
}

async function persistPrices(packs: VoiceMinutePack[]): Promise<void> {
  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    const prices: Record<string, string> = {};
    for (const pack of packs) prices[pack.productId] = pack.priceString;
    diskPrices = prices;
    await AsyncStorage.setItem(PRICE_STORAGE_KEY, JSON.stringify(prices));
  } catch (e) {
    DebugLogger.warn('[MINUTE-PACKS]', `persistPrices failed: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/** Прогрев ценника с диска на старте — до первого рендера шита. */
export async function primeVoiceMinutePricePeekFromBoot(): Promise<void> {
  if (diskPrices || cache) return;
  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    const raw = await AsyncStorage.getItem(PRICE_STORAGE_KEY);
    if (!raw || diskPrices || cache) return;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return;
    const prices: Record<string, string> = {};
    for (const { productId } of VOICE_MINUTE_PRODUCTS) {
      const value = (parsed as Record<string, unknown>)[productId];
      if (typeof value === 'string' && value.trim() !== '') prices[productId] = value.trim();
    }
    if (Object.keys(prices).length > 0) diskPrices = prices;
  } catch (e) {
    DebugLogger.warn('[MINUTE-PACKS]', `boot price peek failed: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/**
 * Живые пакеты: свежий кэш → мгновенно; параллельные вызовы дедупятся; сеть —
 * только когда кэш пуст/протух или force (ручной «Попробовать снова»).
 * Ошибка сети пробрасывается вызывающему (панель показывает свой отказ),
 * но кэш при этом не портится.
 */
export function primeVoiceMinutePackages(force = false, nowMs = Date.now()): Promise<VoiceMinutePack[]> {
  const fresh = force ? null : peekVoiceMinutePackages(nowMs);
  if (fresh) {
    DebugLogger.info('[MINUTE-PACKS]', `cache hit: ${fresh.length} packs, age ${Math.round((nowMs - (cache?.atMs ?? nowMs)) / 1000)}s`);
    return Promise.resolve(fresh);
  }
  if (inFlight) {
    DebugLogger.info('[MINUTE-PACKS]', 'dedupe: joining in-flight fetch');
    return inFlight;
  }
  const startedAt = Date.now();
  DebugLogger.info('[MINUTE-PACKS]', `fetch start (force=${force}, hadCache=${cache !== null})`);
  const fetching = loadVoiceMinutePackages()
    .then((packs) => {
      const priced = packs.filter((pack) => pack.priceString.trim() !== '');
      DebugLogger.info(
        '[MINUTE-PACKS]',
        `fetch ok in ${Date.now() - startedAt}ms: ${priced.length}/${VOICE_MINUTE_PRODUCTS.length} priced packs`,
      );
      // Неполный каталог не кэшируем: свежая попытка важнее залипшей дыры.
      if (priced.length === VOICE_MINUTE_PRODUCTS.length) {
        cache = { packs: priced, atMs: Date.now() };
        void persistPrices(priced);
      }
      return packs;
    })
    .catch((e) => {
      DebugLogger.warn(
        '[MINUTE-PACKS]',
        `fetch failed in ${Date.now() - startedAt}ms: ${e instanceof Error ? e.message : String(e)}`,
      );
      throw e;
    })
    .finally(() => {
      inFlight = null;
    });
  inFlight = fetching;
  return fetching;
}

export function __resetVoiceMinutePackagesCacheForTests(): void {
  cache = null;
  inFlight = null;
  diskPrices = null;
}

// Прогрев ценника запускается при первом импорте модуля (не блокируя импорт):
// шит может открыться раньше любого загрузчика.
void primeVoiceMinutePricePeekFromBoot();
