import * as admin from 'firebase-admin';
import { createHash } from 'crypto';

// зачем (№45, 21.10, решение владельца): одно открытие вкладки «Аналитика» в админке читало до 30–50 тыс.
// документов (весь users до 10 тыс. + события), серверного кэша не было. Теперь готовый ответ лежит в одном
// документе admin_analytics_cache/{key} 6 часов: повторное открытие = 1 чтение. `refresh: true` — пересчёт сразу.
export const ANALYTICS_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const CACHE_COLLECTION = 'admin_analytics_cache';
// Firestore держит до 1 МиБ на документ — крупный ответ просто не кэшируем, а не роняем вызов.
const CACHE_MAX_CHARS = 900_000;
const LOG = '[ANALYTICS-CACHE]';

type CacheDb = Pick<admin.firestore.Firestore, 'collection'>;

export function analyticsCacheKey(kind: string, data: unknown): string {
  const params = typeof data === 'object' && data !== null
    ? Object.fromEntries(Object.entries(data as Record<string, unknown>).filter(([key]) => key !== 'refresh').sort(([a], [b]) => a.localeCompare(b)))
    : {};
  return `${kind}_${createHash('sha256').update(JSON.stringify(params), 'utf8').digest('hex').slice(0, 32)}`;
}

export const wantsAnalyticsRefresh = (data: unknown): boolean =>
  typeof data === 'object' && data !== null && (data as Record<string, unknown>).refresh === true;

export async function readThroughAnalyticsCache<T extends object>(input: Readonly<{
  kind: string;
  data: unknown;
  nowMs: number;
  compute: () => Promise<T>;
  db?: CacheDb;
  ttlMs?: number;
}>): Promise<T & { cache: { hit: boolean; ageMs: number } }> {
  const db = input.db ?? admin.firestore();
  const ttlMs = input.ttlMs ?? ANALYTICS_CACHE_TTL_MS;
  const key = analyticsCacheKey(input.kind, input.data);
  const ref = db.collection(CACHE_COLLECTION).doc(key); // guard-ok: один документ по ключу, не запрос коллекции
  const refresh = wantsAnalyticsRefresh(input.data);
  if (refresh) {
    console.info(LOG, JSON.stringify({ kind: input.kind, key, decision: 'refresh_requested' }));
  } else {
    try {
      const snap = await ref.get();
      const cachedAtMs = Number(snap.data()?.cachedAtMs);
      const ageMs = input.nowMs - cachedAtMs;
      if (snap.exists && Number.isFinite(cachedAtMs) && ageMs >= 0 && ageMs < ttlMs && typeof snap.data()?.payloadJson === 'string') {
        console.info(LOG, JSON.stringify({ kind: input.kind, key, decision: 'hit', ageMs }));
        return { ...(JSON.parse(snap.data()!.payloadJson as string) as T), cache: { hit: true, ageMs } };
      }
      console.info(LOG, JSON.stringify({ kind: input.kind, key, decision: snap.exists ? 'stale' : 'miss', ageMs: snap.exists ? ageMs : null }));
    } catch (error) {
      console.warn(LOG, JSON.stringify({ kind: input.kind, key, decision: 'read_failed_compute', error: String((error as Error)?.message ?? error).slice(0, 120) }));
    }
  }
  const result = await input.compute();
  const payloadJson = JSON.stringify(result);
  // Неполный ответ (ошибка/обрезка источника) не закрепляем на 6 ч — следующий заход пересчитает.
  const state = (result as { state?: unknown }).state;
  if (state !== 'ready' && state !== 'empty') {
    console.warn(LOG, JSON.stringify({ kind: input.kind, key, decision: 'not_cached_state', state: String(state) }));
  } else if (payloadJson.length > CACHE_MAX_CHARS) {
    console.warn(LOG, JSON.stringify({ kind: input.kind, key, decision: 'too_large_not_cached', chars: payloadJson.length }));
  } else {
    await ref.set({ kind: input.kind, cachedAtMs: input.nowMs, payloadJson }).catch((error: unknown) => {
      console.warn(LOG, JSON.stringify({ kind: input.kind, key, decision: 'write_failed', error: String((error as Error)?.message ?? error).slice(0, 120) }));
    });
  }
  return { ...result, cache: { hit: false, ageMs: 0 } };
}
