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
// Цена зависит от длины потерянного стрика:
// 1 день стоит 15 осколков, а 100+ дней стоят 100 осколков всего.
// ════════════════════════════════════════════════════════════════════════════
import AsyncStorage from '@react-native-async-storage/async-storage';
import { commitShardCompositeOperation } from './shards_system';
import { semanticShardOperationId } from './economy/client_shard_semantic_id';
import { emitAppEvent } from './events';
import { DebugLogger } from './debug-logger';
import { withStorageLock } from './storage_mutex';
import { recordMissedStreakWeekMarkersEndingYesterday } from './streak_week_markers';
import { invalidateWagerAfterRevive } from './streak_wager';
import { getLocalDayKey, getLocalYesterdayKey } from './local_date';

const STORAGE_KEY = 'streak_revive_v1';
/** Окно показа модалки после потери цепочки. После — оффер сгорает. */
export const REVIVE_WINDOW_MS = 24 * 60 * 60 * 1000;
export const REVIVE_COST_MIN_TOTAL_SHARDS: number = 15;
export const REVIVE_COST_MAX_TOTAL_SHARDS: number = 100;
export const REVIVE_COST_MAX_TOTAL_STREAK_DAYS: number = 100;
/** Минимальная длина потерянной цепочки — один день подряд восстанавливать не предлагаем. */
const MIN_REVIVABLE_STREAK = 2;

export interface StreakReviveOfferRaw {
  lostStreak: number;
  lostAt: number;     // unix ms
  used?: boolean;
  missedDays?: number;
  /** Дата, когда цепочку обнулили (для стат/дебага). */
  lostDate?: string;
}

export interface StreakReviveOffer {
  lostStreak: number;
  lostAt: number;
  expiresAt: number;
  missedDays: number;
  costShards: number;
}

/**
 * Цена восстановления считается по длине потерянного стрика, а не по пропущенным дням.
 * Чем длиннее потерянный стрик, тем ниже средняя цена за день; с 100 дней итог = 100.
 */
export function computeReviveCost(lostStreakDays: number): number {
  const days = Math.max(1, Math.floor(Number(lostStreakDays) || 0));
  if (days >= REVIVE_COST_MAX_TOTAL_STREAK_DAYS) {
    return REVIVE_COST_MAX_TOTAL_SHARDS;
  }
  const progress = (days - 1) / (REVIVE_COST_MAX_TOTAL_STREAK_DAYS - 1);
  const cost = REVIVE_COST_MIN_TOTAL_SHARDS
    + (REVIVE_COST_MAX_TOTAL_SHARDS - REVIVE_COST_MIN_TOTAL_SHARDS) * progress;
  return Math.round(cost);
}

export function getReviveCostPerLostStreakDay(lostStreakDays: number): number {
  const days = Math.max(1, Math.floor(Number(lostStreakDays) || 0));
  return Math.max(1, Math.round((computeReviveCost(days) / days) * 10) / 10);
}

const todayKey = (): string => getLocalDayKey();

const normalizeMissedDays = (value: unknown): number => Math.max(1, Math.floor(Number(value) || 0));

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
export async function markStreakLost(streak: number, missedDays: number = 1): Promise<void> {
  try {
    if (!Number.isFinite(streak) || streak < MIN_REVIVABLE_STREAK) return;
    const safeLostStreak = Math.floor(streak);
    const safeMissedDays = normalizeMissedDays(missedDays);
    await withStorageLock(async () => {
      const existing = await readRaw();
      const now = Date.now();
      const existingMissedDays = existing ? normalizeMissedDays(existing.missedDays) : 1;
      // Если есть активный (не used, не expired) оффер с большей цепочкой и не меньшим числом пропусков — не понижаем.
      if (
        existing &&
        !existing.used &&
        now - existing.lostAt < REVIVE_WINDOW_MS &&
        existing.lostStreak >= safeLostStreak &&
        existingMissedDays >= safeMissedDays
      ) {
        return;
      }
      const next: StreakReviveOfferRaw = {
        lostStreak: existing && !existing.used && now - existing.lostAt < REVIVE_WINDOW_MS
          ? Math.max(existing.lostStreak, safeLostStreak)
          : safeLostStreak,
        lostAt: now,
        used: false,
        missedDays: existing && !existing.used && now - existing.lostAt < REVIVE_WINDOW_MS
          ? Math.max(existingMissedDays, safeMissedDays)
          : safeMissedDays,
        lostDate: todayKey(),
      };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    });
    emitAppEvent('streak_revive_offer', { lostStreak: safeLostStreak, missedDays: safeMissedDays });
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
  const missedDays = normalizeMissedDays(raw.missedDays);
  return {
    lostStreak: raw.lostStreak,
    lostAt: raw.lostAt,
    expiresAt,
    missedDays,
    costShards: computeReviveCost(raw.lostStreak),
  };
}

export type ReviveResult =
  | { ok: true; restoredStreak: number; spent: number }
  | { ok: false; reason: 'no_offer' | 'expired' | 'insufficient_shards' | 'spend_failed' | 'persist_failed' };

const yesterdayKey = (): string => getLocalYesterdayKey();

/**
 * Списывает осколки и восстанавливает streak_count = lostStreak.
 *
 * last_active_date выставляем = «вчера», чтобы updateStreakOnActivity при первом
 * XP-сегодня нарастил цепочку на +1 (как «активны вчера → продолжаем»). Если этого
 * не делать, last_active останется 2+ дня назад и следующий же XP-вызов снова
 * обнулит только что восстановленную цепочку.
 */
export async function reviveStreak(opts?: { free?: boolean }): Promise<ReviveResult> {
  try {
    const offer = await getReviveOffer();
    if (!offer) return { ok: false, reason: 'no_offer' };
    // зачем: Season Pass «Машина времени» (владелец, каталог §1.8) чинит вчерашнюю
    // дыру БЕСПЛАТНО — подарок уже оплачен уровнем сезона, жемчуг не списываем.
    const cost = opts?.free ? 0 : offer.costShards;

    try {
      const raw = await readRaw();
      if (!raw || raw.used) return { ok: false, reason: 'no_offer' };
      const writes = [
          ['streak_count', String(offer.lostStreak)],
          ['last_active_date', yesterdayKey()],
          [STORAGE_KEY, JSON.stringify({ ...raw, used: true })],
      ] as const;
      if (cost > 0) {
        const purchase = await commitShardCompositeOperation({
          amount: cost,
          reason: 'streak_revive',
          operationId: await semanticShardOperationId('streak_revive', String(raw.lostAt)),
          grant: {
            kind: 'streak_revive',
            subjectId: String(raw.lostAt),
            payload: {
              restoredStreak: offer.lostStreak,
              missedDays: offer.missedDays,
              lastActiveDate: yesterdayKey(),
            },
          },
          localWrites: writes,
        });
        if (purchase.status === 'insufficient') return { ok: false, reason: 'insufficient_shards' };
        if (purchase.status === 'failed') return { ok: false, reason: 'persist_failed' };
      } else {
        await withStorageLock(async () => AsyncStorage.multiSet(writes));
      }
      await recordMissedStreakWeekMarkersEndingYesterday('revive', offer.missedDays).catch(() => {});
      // Цепочка была прервана — активное пари аннулируется (последовательность нарушена)
      await invalidateWagerAfterRevive().catch(() => {});
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
