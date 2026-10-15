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

import { captureAccountGeneration } from './account_generation';
import { commitPremiumFreeFreeze } from './economy/premium_free_freeze';
import { applyMonthlyPremiumFreezeAllowance, PREMIUM_FREEZE_USED_FLAG_KEY } from './premium_freeze_allowance';
import { getVerifiedPremiumStatus } from './premium_guard';

// зачем: проверка Plus может уйти в сеть; серия не должна ждать её дольше пары секунд.
const PREMIUM_CHECK_TIMEOUT_MS = 3_000;

export type AutoFreezeResult =
  | { applied: true }
  | { applied: false; reason: 'not_premium' | 'premium_check_timeout' | 'premium_unknown' | 'month_limit' | 'commit_failed' | 'error' };

type AutoFreezeDeps = {
  /** null — аккаунт готов к проверке Plus; строка — почему статус Plus сейчас НЕ узнать (тогда «нет Plus» был бы ложью). */
  accountNotReady?: () => string | null;
  isPremium: () => Promise<boolean>;
  applyAllowance: () => Promise<void>;
  readUsedFlag: () => Promise<string | null>;
  commit: (dateKey: string) => Promise<void>;
};

// зачем (координатор 15.10, 🔴): проверка Plus при неактивном аккаунте возвращает false — это «не знаю», а не «нет Plus».
function defaultAccountNotReady(): string | null {
  const token = captureAccountGeneration();
  if (token.phase !== 'active') return `account_phase_${String(token.phase)}`;
  if (!token.stableId) return 'no_stable_id';
  return null;
}

const defaultDeps: AutoFreezeDeps = {
  accountNotReady: defaultAccountNotReady,
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
  // зачем (координатор 15.10): [STREAK-FREEZE] — откуда и какой статус Plus, сколько заняла проверка, что с лимитом и что решили.
  const startedAt = Date.now();
  try {
    const notReady = deps.accountNotReady?.() ?? null;
    if (notReady) {
      console.warn(`[STREAK-FREEZE] auto:undecided day=${todayKey} plus=unknown source=${notReady} — статус Plus не узнать, серию не трогаем`);
      return { applied: false, reason: 'premium_unknown' };
    }
    const premium = await withTimeout<boolean | 'timeout'>(deps.isPremium(), PREMIUM_CHECK_TIMEOUT_MS, 'timeout');
    const checkMs = Date.now() - startedAt;
    if (premium === 'timeout') {
      console.warn(`[STREAK-FREEZE] auto:undecided day=${todayKey} plus=unknown source=timeout ms=${checkMs} limitMs=${PREMIUM_CHECK_TIMEOUT_MS} — серию не трогаем`);
      return { applied: false, reason: 'premium_check_timeout' };
    }
    if (!premium) {
      console.log(`[STREAK-FREEZE] auto:skip day=${todayKey} plus=false source=verified ms=${checkMs} reason=not_premium`);
      return { applied: false, reason: 'not_premium' };
    }
    // Списывает прошлые заморозки в месячный счётчик и возвращает «доступна», если лимит не исчерпан.
    await deps.applyAllowance();
    const used = await deps.readUsedFlag();
    if (used === 'true') {
      console.log(`[STREAK-FREEZE] auto:skip day=${todayKey} plus=true source=verified ms=${checkMs} reason=month_limit usedFlag=${String(used)}`);
      return { applied: false, reason: 'month_limit' };
    }
    try {
      await deps.commit(todayKey);
    } catch (error) {
      console.warn(`[STREAK-FREEZE] auto:undecided day=${todayKey} plus=true reason=commit_failed error=${error instanceof Error ? error.message : String(error)}`);
      return { applied: false, reason: 'commit_failed' };
    }
    console.log(`[STREAK-FREEZE] auto:applied day=${todayKey} plus=true source=verified ms=${checkMs} usedFlag=${String(used)}->true`);
    return { applied: true };
  } catch (error) {
    console.warn(`[STREAK-FREEZE] auto:undecided day=${todayKey} reason=error ms=${Date.now() - startedAt} error=${error instanceof Error ? error.message : String(error)}`);
    return { applied: false, reason: 'error' };
  }
}

/* expo-router: keep this utility from being treated as a screen */
export default function __StreakAutoFreezeRouteShim() {
  return null;
}
