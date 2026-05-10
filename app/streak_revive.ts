// ════════════════════════════════════════════════════════════════════════════
// streak_revive.ts — «Восстановить потерянную цепочку за осколки»
//
// Поток:
//  1. updateStreakOnActivity() в hall_of_fame_utils обнаруживает обнуление —
//     вызывает markStreakLost(prevStreak).
//  2. home.tsx подписывается на onAppEvent('streak_revive_offer') и читает
//     getReviveOffer(): если оффер активен (≤24ч) — открывает StreakReviveModal.
//  3. Юзер тратит осколки → reviveStreak(): восстанавливает streak_count,
//     гасит оффер, эмитит 'streak_revived'.
//
// Цена: лесенка — чем больше дней, тем дороже. Капается на 150 для серий ≥200.
// ════════════════════════════════════════════════════════════════════════════
import AsyncStorage from '@react-native-async-storage/async-storage';
import { spendShards } from './shards_system';
import { emitAppEvent } from './events';
import { DebugLogger } from './debug-logger';
import { withStorageLock } from './storage_mutex';

const STORAGE_KEY = 'streak_revive_v1';
/** Окно показа модалки после потери цепочки. После — оффер сгорает. */
export const REVIVE_WINDOW_MS = 24 * 60 * 60 * 1000;
/** Минимальная длина потерянной цепочки — один день подряд восстанавливать не предлагаем. */
const MIN_REVIVABLE_STREAK = 2;

export interface StreakReviveOfferRaw {
  lostStreak: number;
  lostAt: number;     // unix ms
  used?: boolean;
  /** Дата, когда цепочку обнулили (для стат/дебага). */
  lostDate?: string;
}

export interface StreakReviveOffer {
  lostStreak: number;
  lostAt: number;
  expiresAt: number;
  costShards: number;
}

/**
 * Лесенка цены: «чем больше дней — тем дороже». Дороже даёт сильнее эмоциональный
 * крючок (юзер не хочет терять 200-дневную цепочку за условные 30 осколков).
 * Кап 150 — чтобы не превращать в спам IAP-нытьё.
 */
export function computeReviveCost(streak: number): number {
  const s = Math.max(0, Math.floor(streak));
  if (s < 7) return 5;
  if (s < 14) return 10;
  if (s < 30) return 20;
  if (s < 60) return 35;
  if (s < 100) return 60;
  if (s < 200) return 100;
  return 150;
}

const todayKey = (): string => new Date().toISOString().split('T')[0];

const readRaw = async (): Promise<StreakReviveOfferRaw | null> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StreakReviveOfferRaw;
    if (!parsed || typeof parsed.lostStreak !== 'number' || typeof parsed.lostAt !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
};

/**
 * Зафиксировать факт потери цепочки. Вызывается из updateStreakOnActivity()
 * непосредственно перед `streak = 1`. Не пишет, если цепочка слишком короткая
 * (≤1) — предложение восстановить «1 день» бессмысленно.
 *
 * Если активный оффер уже есть (несколько обнулений в окне 24ч — редкий кейс)
 * сохраняем больший lostStreak, чтобы юзер не «потерял в цене».
 */
export async function markStreakLost(streak: number): Promise<void> {
  try {
    if (!Number.isFinite(streak) || streak < MIN_REVIVABLE_STREAK) return;
    await withStorageLock(async () => {
      const existing = await readRaw();
      const now = Date.now();
      // Если есть активный (не used, не expired) оффер с бо́льшей длиной цепочки — не понижаем.
      if (
        existing &&
        !existing.used &&
        now - existing.lostAt < REVIVE_WINDOW_MS &&
        existing.lostStreak >= streak
      ) {
        return;
      }
      const next: StreakReviveOfferRaw = {
        lostStreak: Math.floor(streak),
        lostAt: now,
        used: false,
        lostDate: todayKey(),
      };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    });
    emitAppEvent('streak_revive_offer', { lostStreak: Math.floor(streak) });
  } catch (error) {
    DebugLogger.error('streak_revive:markStreakLost', error, 'warning');
  }
}

/**
 * Активный оффер для UI. Возвращает null, если:
 *  - оффера нет,
 *  - уже использован (revive выполнен),
 *  - окно 24ч истекло.
 */
export async function getReviveOffer(): Promise<StreakReviveOffer | null> {
  const raw = await readRaw();
  if (!raw || raw.used) return null;
  const expiresAt = raw.lostAt + REVIVE_WINDOW_MS;
  if (Date.now() >= expiresAt) return null;
  return {
    lostStreak: raw.lostStreak,
    lostAt: raw.lostAt,
    expiresAt,
    costShards: computeReviveCost(raw.lostStreak),
  };
}

export type ReviveResult =
  | { ok: true; restoredStreak: number; spent: number }
  | { ok: false; reason: 'no_offer' | 'expired' | 'insufficient_shards' | 'spend_failed' | 'persist_failed' };

const yesterdayKey = (): string => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
};

/**
 * Списывает осколки и восстанавливает streak_count = lostStreak.
 *
 * last_active_date выставляем = «вчера», чтобы updateStreakOnActivity при первом
 * XP-сегодня нарастил цепочку на +1 (как «активны вчера → продолжаем»). Если этого
 * не делать, last_active останется 2+ дня назад и следующий же XP-вызов снова
 * обнулит только что восстановленную цепочку.
 */
export async function reviveStreak(): Promise<ReviveResult> {
  try {
    const offer = await getReviveOffer();
    if (!offer) return { ok: false, reason: 'no_offer' };
    const cost = offer.costShards;

    const spent = await spendShards(cost, 'streak_revive');
    if (!spent) return { ok: false, reason: 'insufficient_shards' };

    try {
      await withStorageLock(async () => {
        await AsyncStorage.multiSet([
          ['streak_count', String(offer.lostStreak)],
          ['last_active_date', yesterdayKey()],
        ]);
        const raw = await readRaw();
        if (raw) {
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...raw, used: true }));
        }
      });
    } catch (persistErr) {
      DebugLogger.error('streak_revive:reviveStreak:persist', persistErr, 'critical');
      return { ok: false, reason: 'persist_failed' };
    }

    emitAppEvent('streak_revived', { restoredStreak: offer.lostStreak, spent: cost });
    return { ok: true, restoredStreak: offer.lostStreak, spent: cost };
  } catch (error) {
    DebugLogger.error('streak_revive:reviveStreak', error, 'warning');
    return { ok: false, reason: 'spend_failed' };
  }
}

/** Сбросить оффер вручную (например юзер закрыл модалку и больше не хочет видеть). */
export async function dismissReviveOffer(): Promise<void> {
  try {
    const raw = await readRaw();
    if (!raw) return;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...raw, used: true }));
  } catch (error) {
    DebugLogger.error('streak_revive:dismiss', error, 'warning');
  }
}

/** Required by Expo Router — not a screen */
export default function __RouteShim() { return null; }
