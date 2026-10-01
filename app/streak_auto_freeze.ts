/**
 * Автозаморозка серии для Plus (D107 + Q94 координатора, 2026-10-01).
 *
 * зачем: кнопка заморозки жила только в Главной V1 (удалена), и Plus молча терял
 * бесплатную заморозку. Теперь пропущенный РОВНО один день у Plus закрывается сам:
 * без кнопки, в пределах месячного лимита (premium_freeze_allowance), один раз.
 * Решение «был ли пропуск» принимает updateStreakOnActivity; здесь — только
 * «можно ли и потратить ли заморозку».
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { commitPremiumFreeFreeze } from './economy/premium_free_freeze';
import { applyMonthlyPremiumFreezeAllowance, PREMIUM_FREEZE_USED_FLAG_KEY } from './premium_freeze_allowance';
import { getVerifiedPremiumStatus } from './premium_guard';

// зачем: проверка Plus может уйти в сеть; серия не должна ждать её дольше пары секунд.
const PREMIUM_CHECK_TIMEOUT_MS = 3_000;

export type AutoFreezeResult =
  | { applied: true }
  | { applied: false; reason: 'not_premium' | 'premium_check_timeout' | 'month_limit' | 'commit_failed' | 'error' };

type AutoFreezeDeps = {
  isPremium: () => Promise<boolean>;
  applyAllowance: () => Promise<void>;
  readUsedFlag: () => Promise<string | null>;
  commit: (dateKey: string) => Promise<void>;
};

const defaultDeps: AutoFreezeDeps = {
  isPremium: getVerifiedPremiumStatus,
  applyAllowance: () => applyMonthlyPremiumFreezeAllowance(),
  readUsedFlag: () => AsyncStorage.getItem(PREMIUM_FREEZE_USED_FLAG_KEY),
  commit: commitPremiumFreeFreeze,
};

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => resolve(fallback), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error: unknown) => { clearTimeout(timer); reject(error); },
    );
  });
}

/** Тратит бесплатную заморозку Plus за пропущенный день. Повторно в тот же день не сработает:
 *  после неё updateStreakOnActivity пишет last_active_date = сегодня, а флаг «использована»
 *  возвращается в «доступна» только через месячный лимит. */
export async function tryAutoPremiumFreeze(
  todayKey: string,
  deps: AutoFreezeDeps = defaultDeps,
): Promise<AutoFreezeResult> {
  try {
    const premium = await withTimeout<boolean | 'timeout'>(deps.isPremium(), PREMIUM_CHECK_TIMEOUT_MS, 'timeout');
    if (premium === 'timeout') {
      console.warn(`[STREAK] auto_freeze:skip reason=premium_check_timeout ms=${PREMIUM_CHECK_TIMEOUT_MS}`);
      return { applied: false, reason: 'premium_check_timeout' };
    }
    if (!premium) {
      console.log('[STREAK] auto_freeze:skip reason=not_premium');
      return { applied: false, reason: 'not_premium' };
    }
    // Списывает прошлые заморозки в месячный счётчик и возвращает «доступна», если лимит не исчерпан.
    await deps.applyAllowance();
    const used = await deps.readUsedFlag();
    if (used === 'true') {
      console.log(`[STREAK] auto_freeze:skip reason=month_limit used=${String(used)}`);
      return { applied: false, reason: 'month_limit' };
    }
    try {
      await deps.commit(todayKey);
    } catch (error) {
      console.warn('[STREAK] auto_freeze:commit_failed', error instanceof Error ? error.message : String(error));
      return { applied: false, reason: 'commit_failed' };
    }
    console.log(`[STREAK] auto_freeze:applied day=${todayKey}`);
    return { applied: true };
  } catch (error) {
    console.warn('[STREAK] auto_freeze:error', error instanceof Error ? error.message : String(error));
    return { applied: false, reason: 'error' };
  }
}

/* expo-router: keep this utility from being treated as a screen */
export default function __StreakAutoFreezeRouteShim() {
  return null;
}
