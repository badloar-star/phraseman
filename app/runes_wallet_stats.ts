/**
 * runes_wallet_stats.ts — серверная статистика раздела «Руны».
 *
 * зачем (владелец, 2026-08-24): в разделе рун под балансом показывается,
 * откуда руны пришли (Арена / Занятия / Друзья / Спин). Цифры по источникам
 * считает сервер — журнал рун (functions/src/stars_ledger.ts) получит разрез
 * `bySource` вместе с недельным притоком weekInflow в рамках перевода лиги на
 * руны (docs/plans/2026-08-24-league-runes-plan.ru.md §2.1). Пока разреза нет,
 * loadRunesServerStats честно возвращает bySource: null — экран рисует строки
 * источников без чисел, а не с нулями-враньём.
 *
 * Firebase-экономия (правило владельца): ОДНО чтение users/{uid} при входе на
 * экран, кэш в памяти + на диске с TTL 6 часов, никаких фоновых таймеров.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { getCanonicalUserId } from './user_id_policy';

export type RuneSourceKey = 'arena' | 'learning' | 'friends' | 'spin' | 'exchange' | 'other';

export type RunesServerStats = Readonly<{
  uid: string;
  /** ISO-неделя вида «2026-W35» из журнала рун; '' если сервер её ещё не вёл. */
  weekKey: string;
  /** Заработано рун за текущую ISO-неделю (класс earn; серверная правда). */
  weekEarned: number;
  /** Разрез притока по источникам; null = сервер ещё не считает разрез. */
  bySource: Readonly<Partial<Record<RuneSourceKey, number>>> | null;
  fetchedAtMs: number;
}>;

const CACHE_KEY = 'runes_wallet_server_stats_v1';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

const SOURCE_KEYS: readonly RuneSourceKey[] = ['arena', 'learning', 'friends', 'spin', 'exchange', 'other'];

let memoryStats: RunesServerStats | null = null;

function normalizeCount(value: unknown): number {
  const n = Math.trunc(Number(value));
  return Number.isSafeInteger(n) && n > 0 ? n : 0;
}

function normalizeBySource(value: unknown): RunesServerStats['bySource'] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const out: Partial<Record<RuneSourceKey, number>> = {};
  for (const key of SOURCE_KEYS) {
    if (raw[key] !== undefined) out[key] = normalizeCount(raw[key]);
  }
  return Object.freeze(out);
}

function parseCachedStats(raw: string | null, uid: string): RunesServerStats | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<RunesServerStats>;
    if (!parsed || typeof parsed !== 'object' || parsed.uid !== uid) return null;
    const fetchedAtMs = Number(parsed.fetchedAtMs);
    if (!Number.isFinite(fetchedAtMs) || fetchedAtMs <= 0) return null;
    return Object.freeze({
      uid,
      weekKey: typeof parsed.weekKey === 'string' ? parsed.weekKey : '',
      weekEarned: normalizeCount(parsed.weekEarned),
      bySource: normalizeBySource(parsed.bySource),
      fetchedAtMs,
    });
  } catch {
    return null;
  }
}

/** Синхронный снимок для первого кадра. null = ещё не загружали в этой сессии. */
export function peekRunesServerStats(): RunesServerStats | null {
  return memoryStats;
}

/**
 * Кэш → диск → (раз в 6 часов) одно чтение users/{uid}. Ошибки сети не
 * роняют экран — возвращается последнее известное состояние или null.
 */
export async function loadRunesServerStats(): Promise<RunesServerStats | null> {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return memoryStats;
  let uid: string | null = null;
  try { uid = await getCanonicalUserId(); } catch { uid = null; }
  if (!uid) return memoryStats;

  if (!memoryStats || memoryStats.uid !== uid) {
    const cachedRaw = await AsyncStorage.getItem(CACHE_KEY).catch(() => null);
    const cached = parseCachedStats(cachedRaw, uid);
    if (cached) memoryStats = cached;
  }
  if (memoryStats && memoryStats.uid === uid
    && Date.now() - memoryStats.fetchedAtMs < CACHE_TTL_MS) {
    return memoryStats;
  }

  try {
    const firestore = require('@react-native-firebase/firestore').default;
    const snap = await firestore().collection('users').doc(uid).get();
    const stars = snap.exists
      ? (snap.data()?.stars as Record<string, unknown> | undefined)
      : undefined;
    const stats: RunesServerStats = Object.freeze({
      uid,
      weekKey: typeof stars?.weekKey === 'string' ? stars.weekKey : '',
      weekEarned: normalizeCount(stars?.weekEarned),
      bySource: normalizeBySource(stars?.bySource),
      fetchedAtMs: Date.now(),
    });
    memoryStats = stats;
    AsyncStorage.setItem(CACHE_KEY, JSON.stringify(stats)).catch(() => {});
    return stats;
  } catch {
    // Сеть недоступна — живём на последнем известном снимке, не занижаем до нуля.
    return memoryStats;
  }
}
