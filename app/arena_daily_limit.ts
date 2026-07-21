import AsyncStorage from '@react-native-async-storage/async-storage';
import { getArenaDailyMax, getArenaShardRefillCost, getArenaShardRefillSlots } from './remote_flags';

const KEY = 'arena_daily_limit_v1';
/** Доп. попытки за подарок уровня (сбрасывается в полночь вместе с count) */
const BONUS_KEY = 'arena_daily_gift_bonus_v1';
const BONUS_ONCE_KEY_PREFIX = 'arena_daily_gift_bonus_once_';
/** Build-time defaults; runtime uses remote-tunable getters below. */
export const ARENA_DAILY_MAX = 1;
/** Покупка слотов рейтинг-матчей за осколки (модалка лимита арены). */
export const ARENA_MATCHES_SHARD_REFILL_COST = 5;
export const ARENA_MATCHES_SHARD_REFILL_SLOTS = 5;
/** Remote-tunable accessors (use these at call sites, not the consts). */
export const getArenaMatchesShardRefillCost = getArenaShardRefillCost;
export const getArenaMatchesShardRefillSlots = getArenaShardRefillSlots;

interface DailyRecord {
  date: string; // YYYY-MM-DD
  count: number;
}

interface GiftBonusRecord {
  date: string;
  extra: number;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

async function readRecord(): Promise<DailyRecord> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return { date: todayStr(), count: 0 };
    const rec = JSON.parse(raw) as DailyRecord;
    if (rec.date !== todayStr()) return { date: todayStr(), count: 0 };
    return rec;
  } catch {
    return { date: todayStr(), count: 0 };
  }
}

async function readGiftExtra(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(BONUS_KEY);
    if (!raw) return 0;
    const b = JSON.parse(raw) as GiftBonusRecord;
    if (b.date !== todayStr() || !Number.isFinite(b.extra) || b.extra < 0) {
      await AsyncStorage.removeItem(BONUS_KEY);
      return 0;
    }
    return Math.floor(b.extra);
  } catch {
    return 0;
  }
}

/** Сегодняшний максимум рейтинг-матчей: база 1 + бонус из подарка (напр. +5) */
export async function getDailyArenaMaxToday(): Promise<number> {
  return getArenaDailyMax() + (await readGiftExtra());
}

/** +N рейтинг-игр до полуночи (суммируется с существующим бонусом за день) */
export async function addArenaPlaysBonusForToday(amount: number): Promise<void> {
  if (!Number.isFinite(amount) || amount <= 0) return;
  const t = todayStr();
  const cur = await readGiftExtra();
  await AsyncStorage.setItem(BONUS_KEY, JSON.stringify({ date: t, extra: cur + Math.floor(amount) }));
}

export async function addArenaPlaysBonusForTodayOnce(amount: number, idempotencyKey: string): Promise<void> {
  if (!Number.isFinite(amount) || amount <= 0) return;
  const safeKey = idempotencyKey.replace(/[^\w.-]/g, '_').slice(0, 160);
  if (!safeKey) return addArenaPlaysBonusForToday(amount);
  const markerKey = `${BONUS_ONCE_KEY_PREFIX}${safeKey}`;
  if ((await AsyncStorage.getItem(markerKey).catch(() => null)) === '1') return;
  const t = todayStr();
  const cur = await readGiftExtra();
  await AsyncStorage.multiSet([
    [BONUS_KEY, JSON.stringify({ date: t, extra: cur + Math.floor(amount) })],
    [markerKey, '1'],
  ]);
}

export async function addArenaPlaysBonusForClaimDayOnce(amount: number, idempotencyKey: string, claimedAtMs?: number): Promise<void> {
  const claimDay = claimedAtMs ? new Date(claimedAtMs).toISOString().slice(0, 10) : todayStr();
  if (claimDay !== todayStr()) return;
  await addArenaPlaysBonusForTodayOnce(amount, idempotencyKey);
}

export async function getDailyArenaCount(): Promise<number> {
  const rec = await readRecord();
  return rec.count;
}

export async function getDailyArenaPlaysLeft(): Promise<number> {
  const [count, max] = await Promise.all([getDailyArenaCount(), getDailyArenaMaxToday()]);
  return Math.max(0, max - count);
}

export async function incrementDailyArenaPlay(): Promise<void> {
  const rec = await readRecord();
  await AsyncStorage.setItem(KEY, JSON.stringify({ date: rec.date, count: rec.count + 1 }));
}

/**
 * Добавить ровно `slots` купленных рейтинг-попыток до полуночи.
 *
 * Важно: уменьшение `count` здесь неверно. Если базовый дневной максимум равен
 * трём, сброс count с 3 до 0 открывает только три матча, хотя пользователь купил
 * пять. Дополнительные попытки должны расширять сегодняшний максимум.
 */
export async function refundDailyArenaPlays(slots: number): Promise<void> {
  const n = Math.floor(slots);
  if (!Number.isFinite(n) || n <= 0) return;
  await addArenaPlaysBonusForToday(n);
}

export async function hasDailyArenaPlaysLeft(): Promise<boolean> {
  return (await getDailyArenaPlaysLeft()) > 0;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
