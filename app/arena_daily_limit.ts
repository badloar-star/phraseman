import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'arena_daily_limit_v1';
/** Доп. попытки за подарок уровня (сбрасывается в полночь вместе с count) */
const BONUS_KEY = 'arena_daily_gift_bonus_v1';
export const ARENA_DAILY_MAX = 5;
/** Покупка слотов рейтинг-матчей за осколки (модалка лимита арены). */
export const ARENA_MATCHES_SHARD_REFILL_COST = 5;
export const ARENA_MATCHES_SHARD_REFILL_SLOTS = 5;

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

/** Сегодняшний максимум рейтинг-матчей: база 5 + бонус из подарка (напр. +5) */
export async function getDailyArenaMaxToday(): Promise<number> {
  return ARENA_DAILY_MAX + (await readGiftExtra());
}

/** +N рейтинг-игр до полуночи (суммируется с существующим бонусом за день) */
export async function addArenaPlaysBonusForToday(amount: number): Promise<void> {
  if (!Number.isFinite(amount) || amount <= 0) return;
  const t = todayStr();
  const cur = await readGiftExtra();
  await AsyncStorage.setItem(BONUS_KEY, JSON.stringify({ date: t, extra: cur + Math.floor(amount) }));
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

/** Вернуть до `slots` рейтинг-попыток за сегодня (уменьшает count, не ниже 0). */
export async function refundDailyArenaPlays(slots: number): Promise<void> {
  const n = Math.floor(slots);
  if (!Number.isFinite(n) || n <= 0) return;
  const rec = await readRecord();
  const next = Math.max(0, rec.count - n);
  await AsyncStorage.setItem(KEY, JSON.stringify({ date: rec.date, count: next }));
}

export async function hasDailyArenaPlaysLeft(): Promise<boolean> {
  return (await getDailyArenaPlaysLeft()) > 0;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
