/**
 * Ежемесячные БЕСПЛАТНЫЕ заморозки стрика для Plus (перк подписки).
 *
 * Исторически Plus давал одну бесплатную заморозку «на всю жизнь»: покупка
 * ставила AsyncStorage-флаг 'premium_free_freeze_used'='true' навсегда
 * (см. home.tsx / streak_stats.tsx — они читают флаг напрямую). Этот модуль
 * превращает разовый перк в ежемесячный, НЕ трогая читателей флага: на старте
 * приложения он ведёт месячный счётчик использований и, пока лимит месяца не
 * исчерпан, сбрасывает флаг обратно в 'false' — читатели снова видят
 * «бесплатная заморозка доступна».
 *
 * Идемпотентно и безопасно при повторных вызовах: переход флага false→true
 * засчитывается ровно один раз (flagCharged), новый месяц обнуляет счётчик.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { getVerifiedPremiumStatus } from './premium_guard';

export const PREMIUM_FREE_FREEZES_PER_MONTH = 3;

export const PREMIUM_FREEZE_USED_FLAG_KEY = 'premium_free_freeze_used';
export const PREMIUM_FREEZE_MONTH_STATE_KEY = 'premium_free_freeze_month_v1';

interface MonthlyFreezeState {
  monthKey: string;
  usedCount: number;
  /** Текущее значение флага уже засчитано в usedCount (гард от двойного счёта). */
  flagCharged: boolean;
}

export function premiumFreezeMonthKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 7); // YYYY-MM (UTC)
}

function parseState(raw: string | null): MonthlyFreezeState | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as MonthlyFreezeState;
    if (typeof data?.monthKey !== 'string' || typeof data?.usedCount !== 'number') return null;
    return { monthKey: data.monthKey, usedCount: Math.max(0, Math.floor(data.usedCount)), flagCharged: data.flagCharged === true };
  } catch {
    return null;
  }
}

/** Сколько бесплатных Plus-заморозок осталось в этом месяце (для UI/тестов). */
export async function readPremiumFreezesLeftThisMonth(now: Date = new Date()): Promise<number> {
  try {
    const state = parseState(await AsyncStorage.getItem(PREMIUM_FREEZE_MONTH_STATE_KEY));
    if (!state || state.monthKey !== premiumFreezeMonthKey(now)) return PREMIUM_FREE_FREEZES_PER_MONTH;
    return Math.max(0, PREMIUM_FREE_FREEZES_PER_MONTH - state.usedCount);
  } catch {
    return 0;
  }
}

/**
 * Применить месячный лимит: вызвать на открытии главной (см. boon_bootstrap).
 * Не-premium не трогаем вовсе (их флаг и так не даёт бесплатную заморозку).
 */
export async function applyMonthlyPremiumFreezeAllowance(now: Date = new Date()): Promise<void> {
  try {
    const isPremium = await getVerifiedPremiumStatus();
    if (!isPremium) return;

    const monthKey = premiumFreezeMonthKey(now);
    const stored = parseState(await AsyncStorage.getItem(PREMIUM_FREEZE_MONTH_STATE_KEY));
    const base: MonthlyFreezeState =
      stored && stored.monthKey === monthKey
        ? stored
        : { monthKey, usedCount: 0, flagCharged: false };

    const flagUsed = (await AsyncStorage.getItem(PREMIUM_FREEZE_USED_FLAG_KEY)) === 'true';

    let next: MonthlyFreezeState = base;
    if (flagUsed && !base.flagCharged) {
      // Переход «доступна → потрачена» с прошлого запуска: списываем одну из месячных.
      next = { ...base, usedCount: base.usedCount + 1, flagCharged: true };
    } else if (!flagUsed && base.flagCharged) {
      // Флаг сбросили извне (наш же грант ниже на прошлом запуске) — снимаем гард.
      next = { ...base, flagCharged: false };
    }

    if (flagUsed && next.usedCount < PREMIUM_FREE_FREEZES_PER_MONTH) {
      // Лимит месяца не исчерпан — возвращаем «бесплатная заморозка доступна».
      await AsyncStorage.setItem(PREMIUM_FREEZE_USED_FLAG_KEY, 'false');
      next = { ...next, flagCharged: false };
    }

    await AsyncStorage.setItem(PREMIUM_FREEZE_MONTH_STATE_KEY, JSON.stringify(next));
  } catch {
    // best-effort: перк не должен ронять bootstrap главной
  }
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() {
  return null;
}
