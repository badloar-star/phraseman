/**
 * coin_exchange_client.ts — клиент биржи «монеты → звёзды».
 * Контракт callables (сервер, НЕ менять без синхронизации с functions/):
 *   getCoinExchangeQuote()                          → { rate, corridorMin, corridorMax, nextRecalcAt }
 *   getCoinExchangeHistory({ days })                → { points: [{ date, rate, volume }] }
 *   exchangeCoinsForStars({ coins, idempotencyKey }) → { starsGranted, rateUsed }
 * Курс считается ТОЛЬКО сервером; клиент ничего не пересчитывает, кроме
 * отображаемой оценки «монеты × текущий курс».
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';

export type CoinExchangeQuote = {
  rate: number;
  corridorMin: number;
  corridorMax: number;
  nextRecalcAt: string;
};

export type CoinExchangeHistoryPoint = { date: string; rate: number; volume: number };

export type CoinExchangeResult = { starsGranted: number; rateUsed: number };

const QUOTE_CACHE_KEY = 'coin_exchange_quote_cache_v1';
const HISTORY_CACHE_KEY = 'coin_exchange_history_cache_v1';

/** In-memory peek-кэш для мгновенного первого кадра (Performance Bible). */
let quoteMemory: CoinExchangeQuote | null = null;
let historyMemory: CoinExchangeHistoryPoint[] | null = null;

export const peekCoinExchangeQuote = (): CoinExchangeQuote | null => quoteMemory;
export const peekCoinExchangeHistory = (): CoinExchangeHistoryPoint[] | null => historyMemory;

const parseQuote = (raw: unknown): CoinExchangeQuote | null => {
  const q = raw as Partial<CoinExchangeQuote> | null | undefined;
  if (!q) return null;
  const rate = Number(q.rate);
  const corridorMin = Number(q.corridorMin);
  const corridorMax = Number(q.corridorMax);
  if (!Number.isFinite(rate) || rate <= 0) return null;
  if (!Number.isFinite(corridorMin) || !Number.isFinite(corridorMax)) return null;
  return {
    rate,
    corridorMin,
    corridorMax,
    nextRecalcAt: typeof q.nextRecalcAt === 'string' ? q.nextRecalcAt : '',
  };
};

const parseHistory = (raw: unknown): CoinExchangeHistoryPoint[] => {
  const points = (raw as { points?: unknown } | null | undefined)?.points;
  if (!Array.isArray(points)) return [];
  return points
    .map((p): CoinExchangeHistoryPoint | null => {
      const row = p as Partial<CoinExchangeHistoryPoint> | null | undefined;
      const rate = Number(row?.rate);
      const volume = Number(row?.volume);
      if (typeof row?.date !== 'string' || !Number.isFinite(rate)) return null;
      return { date: row.date, rate, volume: Number.isFinite(volume) ? volume : 0 };
    })
    .filter((p): p is CoinExchangeHistoryPoint => p !== null);
};

const callCoinExchange = async <T>(name: string, data: unknown): Promise<T> => {
  const { getFunctions, httpsCallable } = require('@react-native-firebase/functions') as {
    getFunctions: (...args: unknown[]) => unknown;
    httpsCallable: (fns: unknown, name: string) => (data: unknown) => Promise<{ data: T }>;
  };
  const { getApp } = require('@react-native-firebase/app') as { getApp: () => unknown };
  const cfCall = httpsCallable(getFunctions(getApp(), 'us-central1'), name);
  const cfResult = await cfCall(data);
  return cfResult.data;
};

export const loadCachedCoinExchangeQuote = async (): Promise<CoinExchangeQuote | null> => {
  try {
    const raw = await AsyncStorage.getItem(QUOTE_CACHE_KEY);
    quoteMemory = raw ? parseQuote(JSON.parse(raw)) : null;
  } catch {
    quoteMemory = null;
  }
  return quoteMemory;
};

export const loadCachedCoinExchangeHistory = async (): Promise<CoinExchangeHistoryPoint[]> => {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_CACHE_KEY);
    historyMemory = raw ? parseHistory(JSON.parse(raw)) : [];
  } catch {
    historyMemory = [];
  }
  return historyMemory;
};

/** Свежий курс с сервера; при успехе обновляет кэш. null — облако недоступно. */
export const fetchCoinExchangeQuote = async (): Promise<CoinExchangeQuote | null> => {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return quoteMemory;
  try {
    const quote = parseQuote(await callCoinExchange('getCoinExchangeQuote', {}));
    if (quote) {
      quoteMemory = quote;
      await AsyncStorage.setItem(QUOTE_CACHE_KEY, JSON.stringify(quote)).catch(() => {});
    }
    return quote;
  } catch {
    return null;
  }
};

export const fetchCoinExchangeHistory = async (days = 30): Promise<CoinExchangeHistoryPoint[] | null> => {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return historyMemory;
  try {
    const points = parseHistory(await callCoinExchange('getCoinExchangeHistory', { days }));
    historyMemory = points;
    await AsyncStorage.setItem(HISTORY_CACHE_KEY, JSON.stringify({ points })).catch(() => {});
    return points;
  } catch {
    return null;
  }
};

/** Идемпотентный ключ обмена: один ключ = одна операция даже при ретрае. */
export const newCoinExchangeIdempotencyKey = (): string =>
  `cx_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;

/** Обмен сервер-авторитетный: результат показываем только из ответа сервера. */
export const exchangeCoinsForStars = async (
  coins: number,
  idempotencyKey: string,
): Promise<CoinExchangeResult> => {
  const safe = Math.max(0, Math.floor(Number(coins) || 0));
  if (safe <= 0) throw new Error('coin_exchange_zero_amount');
  if (!idempotencyKey) throw new Error('coin_exchange_missing_idempotency_key');
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) throw new Error('coin_exchange_unavailable');
  const data = await callCoinExchange<unknown>('exchangeCoinsForStars', { coins: safe, idempotencyKey });
  const row = data as Partial<CoinExchangeResult> | null | undefined;
  const starsGranted = Number(row?.starsGranted);
  const rateUsed = Number(row?.rateUsed);
  if (!Number.isFinite(starsGranted) || starsGranted < 0 || !Number.isFinite(rateUsed) || rateUsed <= 0) {
    throw new Error('coin_exchange_bad_response');
  }
  return { starsGranted: Math.floor(starsGranted), rateUsed };
};

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
