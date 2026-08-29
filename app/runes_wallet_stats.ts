/**
 * runes_wallet_stats.ts — серверная статистика раздела «Руны».
 *
 * зачем (владелец, 2026-08-24): в разделе рун под балансом показывается,
 * откуда руны пришли (Арена / Занятия / Друзья / Спин). Цифры по источникам
 * считает сервер — журнал рун (functions/src/stars_ledger.ts, таблица
 * STAR_OP_SOURCE) инкрементит карту `stars.bySource` в той же записи, что и
 * баланс. У аккаунтов, чьи операции прошли до 2026-08-26, карты нет — тогда
 * bySource остаётся null, и экран честно рисует строки источников без чисел,
 * а не с нулями-враньём.
 *
 * зачем (владелец, 2026-08-26: «получил бонус 300 за вход, а в разделе Руны
 * написано заработано за всё время 0»): сервер намеренно делит приток на
 * earnedTotal (оплачено игрой, открывает награды сезона) и grantedTotal
 * (подарки, спин, обмен). Экран показывал ТОЛЬКО earnedTotal, поэтому подарок
 * в 300 рун лежал на балансе, но нигде не был виден как поступление. Здесь
 * отдаём оба счётчика: экран показывает их сумму — «получено за всё время».
 * Серверное деление при этом не тронуто: сезонный пропуск и награды по-прежнему
 * смотрят на earnedTotal.
 *
 * Firebase-экономия (правило владельца): ОДНО чтение users/{uid} при входе на
 * экран, кэш в памяти + на диске с TTL 6 часов, никаких фоновых таймеров.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { getCanonicalUserId } from './user_id_policy';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  type AccountGenerationToken,
} from './account_generation';
import { normalizeStarsView, starsWeekEarned } from './stars_view';

export type RuneSourceKey = 'arena' | 'learning' | 'friends' | 'spin' | 'exchange' | 'other';

export type RunesServerStats = Readonly<{
  uid: string;
  /** ISO-неделя вида «2026-W35» из журнала рун; '' если сервер её ещё не вёл. */
  weekKey: string;
  /** Заработано рун за текущую ISO-неделю (класс earn; серверная правда). */
  weekEarned: number;
  /** Заработано игрой за всё время (класс earn). Открывает награды сезона. */
  earnedTotal: number;
  /** Подарено за всё время: стартовый подарок, спин, обмен, выдачи админки. */
  grantedTotal: number;
  /** Разрез притока по источникам; null = сервер ещё не считает разрез. */
  bySource: Readonly<Partial<Record<RuneSourceKey, number>>> | null;
  fetchedAtMs: number;
}>;

// v2: в снимок добавлены earnedTotal/grantedTotal (2026-08-26). Новый ключ, а
// не миграция: старый снимок без этих полей дал бы «получено 0» на первом кадре.
const CACHE_KEY = 'runes_wallet_server_stats_v2';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

const SOURCE_KEYS: readonly RuneSourceKey[] = ['arena', 'learning', 'friends', 'spin', 'exchange', 'other'];

let memoryStats: RunesServerStats | null = null;
/**
 * Токен поколения аккаунта, при котором снимок положен в память. Синхронный
 * peek обязан проверять его: после смены аккаунта память ещё держит цифры
 * старого uid, а первый кадр не должен мигать чужими пикселями (класс бага
 * из памяти проекта: account_generation_stale_cache_class).
 */
let memoryStatsToken: AccountGenerationToken | null = null;

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
  // зачем: пустая карта у старого аккаунта — это «разреза нет», а не «везде
  // ноль». Отдаём null, чтобы экран нарисовал строки без чисел, а не нули.
  return Object.keys(out).length ? Object.freeze(out) : null;
}

function parseCachedStats(raw: string | null, uid: string): RunesServerStats | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<RunesServerStats>;
    if (!parsed || typeof parsed !== 'object' || parsed.uid !== uid) return null;
    const fetchedAtMs = Number(parsed.fetchedAtMs);
    if (!Number.isFinite(fetchedAtMs) || fetchedAtMs <= 0) return null;
    const normalizedStars = normalizeStarsView(parsed);
    return Object.freeze({
      uid,
      weekKey: typeof parsed.weekKey === 'string' ? parsed.weekKey : '',
      weekEarned: starsWeekEarned(normalizedStars, normalizedStars.weekKey),
      earnedTotal: normalizeCount(parsed.earnedTotal),
      grantedTotal: normalizeCount(parsed.grantedTotal),
      bySource: normalizeBySource(parsed.bySource),
      fetchedAtMs,
    });
  } catch {
    return null;
  }
}

/** Синхронный снимок для первого кадра. null = ещё не загружали в этой сессии. */
export function peekRunesServerStats(): RunesServerStats | null {
  if (!memoryStats || !memoryStatsToken) return null;
  // Паттерн runes_system: токен валиден, пока поколение аккаунта не сменилось.
  const stableId = memoryStatsToken.stableId?.trim();
  if (!stableId || !isCurrentAccountGeneration(memoryStatsToken, stableId)) return null;
  return memoryStats;
}

/**
 * Кэш → диск → (раз в 6 часов) одно чтение users/{uid}. Ошибки сети не
 * роняют экран — возвращается последнее известное состояние или null.
 */
export async function loadRunesServerStats(): Promise<RunesServerStats | null> {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return memoryStats;
  const requestToken = captureAccountGeneration();
  const requestedStableId = requestToken.phase === 'active' ? requestToken.stableId?.trim() : null;
  if (!requestedStableId) return null;
  let uid: string | null = null;
  try { uid = await getCanonicalUserId(); } catch { uid = null; }
  // зачем: без uid нельзя понять, чьи цифры в памяти — не показываем ничьи.
  // Класс бага «чужие пиксели после смены аккаунта» (память проекта).
  if (!uid || uid !== requestedStableId
    || !isCurrentAccountGeneration(requestToken, requestedStableId)) return null;

  if (!memoryStats || memoryStats.uid !== uid) {
    const cachedRaw = await AsyncStorage.getItem(CACHE_KEY).catch(() => null);
    if (!isCurrentAccountGeneration(requestToken, requestedStableId)) return null;
    const cached = parseCachedStats(cachedRaw, uid);
    if (cached) {
      memoryStats = cached;
      memoryStatsToken = requestToken;
    }
  }
  if (memoryStats && memoryStats.uid === uid
    && Date.now() - memoryStats.fetchedAtMs < CACHE_TTL_MS) {
    return memoryStats;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- native module is unavailable in Expo Go/tests
    const firestore = require('@react-native-firebase/firestore').default;
    const snap = await firestore().collection('users').doc(uid).get();
    if (!isCurrentAccountGeneration(requestToken, requestedStableId)) return null;
    const stars = snap.exists
      ? (snap.data()?.stars as Record<string, unknown> | undefined)
      : undefined;
    const normalizedStars = normalizeStarsView(stars);
    const stats: RunesServerStats = Object.freeze({
      uid,
      weekKey: normalizedStars.weekKey,
      weekEarned: starsWeekEarned(normalizedStars, normalizedStars.weekKey),
      earnedTotal: normalizeCount(stars?.earnedTotal),
      grantedTotal: normalizeCount(stars?.grantedTotal),
      bySource: normalizeBySource(stars?.bySource),
      fetchedAtMs: Date.now(),
    });
    memoryStats = stats;
    memoryStatsToken = requestToken;
    AsyncStorage.setItem(CACHE_KEY, JSON.stringify(stats)).catch(() => {});
    return stats;
  } catch {
    // Сеть недоступна — живём на последнем известном снимке ЭТОГО аккаунта;
    // снимок чужого uid (смена аккаунта + офлайн) не отдаём никогда.
    return isCurrentAccountGeneration(requestToken, requestedStableId)
      && memoryStats && memoryStats.uid === uid
      ? memoryStats
      : null;
  }
}
